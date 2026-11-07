import { env } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { vnDay, vnHour } from "../src/shared/days";
import { call, paired, resetDb, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, runPushCron, subscribe } from "./push-helpers";

beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T12:00:00+07:00")); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

async function entry(who: TestUser, at: string) {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(at));
  const res = await call("POST", "/api/journal", { cookie: who.cookie, body: { date: "2023-02-12", text: "private night entry", photoIds: [] } });
  expect(res.status).toBe(201); await waitForBackground();
  return (await res.json<{ entry: { id: string } }>()).entry.id;
}

it("AC12, R16, R17: sends at 21:59 and 07:00, holds [22:00, 07:00) for one counted release", async () => {
  const { a, b } = await paired(); await call("PATCH", "/api/me", { cookie: b.cookie, body: { displayName: "Bình" } });
  const d = await device("a"); await subscribe(a, d); const send = mockPush();
  await entry(b, "2026-11-07T21:59:00+07:00");
  expect(send.sent).toHaveLength(1); expect(send.sent[0]!.headers.get("ttl")).toBe("60");
  expect(await decrypt(send.sent[0]!.body, d)).toEqual({ title: "Bình vừa viết nhật ký", url: "/journal", tag: "journal" });
  for (const at of ["2026-11-07T22:00:00+07:00", "2026-11-07T23:10:00+07:00", "2026-11-08T06:59:00+07:00"]) await entry(b, at);
  expect(send.sent).toHaveLength(1);
  await entry(b, "2026-11-08T07:00:00+07:00"); expect(send.sent).toHaveLength(2);
  await decrypt(send.sent[1]!.body, d);
  await runPushCron("2026-11-08T00:00:00Z"); expect(send.sent).toHaveLength(3);
  expect(await decrypt(send.sent[2]!.body, d)).toEqual({ title: "Bình đã viết 3 bài nhật ký", url: "/journal", tag: "journal" });
  expect(send.sent[2]!.headers.get("ttl")).toBe("54000");
  await runPushCron("2026-11-08T00:00:00Z"); expect(send.sent).toHaveLength(3);
});

it("AC13, R18: a night entry deleted before release is never sent", async () => {
  const { a, b } = await paired(); const d = await device("a"); await subscribe(a, d); const send = mockPush();
  const id = await entry(b, "2026-11-07T23:10:00+07:00");
  await call("DELETE", `/api/journal/${id}`, { cookie: b.cookie });
  await runPushCron("2026-11-08T00:00:00Z"); expect(send.sent).toHaveLength(0);
});

it("AC12, R18: devices enabled at 06:30 receive the release once even with concurrent cron runs", async () => {
  const { a, b } = await paired(); const send = mockPush();
  await entry(b, "2026-11-07T23:10:00+07:00");
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-08T06:30:00+07:00"));
  const d = await device("a"); await subscribe(a, d);
  await Promise.all([runPushCron("2026-11-08T00:00:00Z"), runPushCron("2026-11-08T00:00:00Z")]);
  expect(send.sent).toHaveLength(1);
  expect(await decrypt(send.sent[0]!.body, d)).toEqual({ title: "Minh vừa viết nhật ký", url: "/journal", tag: "journal" });
});

it("R16: Vietnam helpers use UTC+7 across calendar boundaries", () => {
  expect(vnHour(Date.parse("2026-12-31T17:00:00Z"))).toBe(0);
  expect(vnDay(Date.parse("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
});

it("R16: other hours return before touching D1 or fetch", async () => {
  const prepare = vi.spyOn(env.DB, "prepare"); const batch = vi.spyOn(env.DB, "batch"); const send = mockPush();
  for (let hour = 0; hour < 24; hour++) {
    if ([3, 7, 8, 20].includes(hour)) continue;
    await runPushCron(`2026-11-08T${String(hour).padStart(2, "0")}:00:00+07:00`);
  }
  expect(prepare).not.toHaveBeenCalled(); expect(batch).not.toHaveBeenCalled(); expect(send.sent).toHaveLength(0);
});
