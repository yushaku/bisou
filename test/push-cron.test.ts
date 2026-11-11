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

it.each(["2026-11-07T21:59:00+07:00", "2026-11-07T22:00:00+07:00", "2026-11-07T23:10:00+07:00", "2026-11-08T06:59:00+07:00"])("AC12: an entry at %s pushes at once with a 24 hour TTL", async (at) => {
  const { a, b } = await paired(); await call("PATCH", "/api/me", { cookie: b.cookie, body: { displayName: "Bình" } });
  const d = await device("a"); await subscribe(a, d); const send = mockPush();
  await entry(b, at);
  expect(send.sent).toHaveLength(1); expect(send.sent[0]!.headers.get("ttl")).toBe("86400");
  expect(await decrypt(send.sent[0]!.body, d)).toEqual({ title: "Bình vừa viết nhật ký", url: "/journal", tag: "journal" });
});

it("AC12: the 07:00 cron sends no journal push", async () => {
  const { a, b } = await paired(); const d = await device("a"); await subscribe(a, d); const send = mockPush();
  for (const at of ["2026-11-07T22:00:00+07:00", "2026-11-07T23:10:00+07:00"]) await entry(b, at);
  expect(send.sent).toHaveLength(2);
  await runPushCron("2026-11-08T00:00:00Z"); expect(send.sent).toHaveLength(2);
});

it("Vietnam helpers use UTC+7 across calendar boundaries", () => {
  expect(vnHour(Date.parse("2026-12-31T17:00:00Z"))).toBe(0);
  expect(vnDay(Date.parse("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
});

it("other hours return before touching D1 or fetch", async () => {
  const prepare = vi.spyOn(env.DB, "prepare"); const batch = vi.spyOn(env.DB, "batch"); const send = mockPush();
  for (let hour = 0; hour < 24; hour++) {
    if ([3, 7, 8, 20].includes(hour)) continue;
    await runPushCron(`2026-11-08T${String(hour).padStart(2, "0")}:00:00+07:00`);
  }
  expect(prepare).not.toHaveBeenCalled(); expect(batch).not.toHaveBeenCalled(); expect(send.sent).toHaveLength(0);
});
