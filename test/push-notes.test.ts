import { env } from "cloudflare:test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { call, paired, resetDb, waitForBackground } from "./helpers";
import { device, subscribe, mockPush, decrypt, runPushCron, stored } from "./push-helpers";
const input = { happened: "Private incident", feel: "Private feeling", need: "Private need", hope: "Private hope" };
beforeEach(async () => { await resetDb(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-12T22:30:00+07:00")); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
async function setup(time = "2026-11-13T06:30:00+07:00") {
  const pair = await paired();
  await call("PATCH", "/api/me", { cookie: pair.a.cookie, body: { displayName: "Sơn" } });
  await call("PATCH", "/api/me", { cookie: pair.b.cookie, body: { locale: "vi" } });
  const reader = await device("reader"), writer = await device("writer"), off = await device("off", { journal: false, reminders: true });
  await subscribe(pair.b, reader); await subscribe(pair.a, writer); await subscribe(pair.b, off);
  vi.setSystemTime(new Date(time));
  // Delivers now, at the faked clock.
  const send = async () => (await (await call("POST", "/api/notes", { cookie: pair.a.cookie, body: { ...input, delivery: "now" } })).json<{ note: { id: string } }>()).note.id;
  return { ...pair, reader, writer, off, push: mockPush(), send };
}
test("notes-journal AC23 AC26 AC27: a daytime delivery pushes the exact private payload only to recipient journal-on devices", async () => {
  const { a, reader, push, send } = await setup("2026-11-13T15:00:00+07:00");
  const id = await send();
  await waitForBackground(); expect(push.sent).toHaveLength(1);
  expect(push.sent[0]!.endpoint).toBe(reader.body.endpoint);
  expect(await decrypt(push.sent[0]!.body, reader)).toEqual({ title: "Sơn có một lời nhắn nhỏ", url: "/journal?section=notes", tag: "notes" });
  await call("PUT", `/api/notes/${id}`, { cookie: a.cookie, body: { ...input, feel: "Fixed" } });
  await waitForBackground(); expect(push.sent).toHaveLength(1);
});
test("notes-journal AC24 AC37 AC38: a 06:30 delivery pushes at once, the 07:00 cron adds nothing and the reminder comes once on Vietnam day D+3", async () => {
  const { a, reader, push, send } = await setup();
  const id = await send(); await waitForBackground();
  expect(push.sent).toHaveLength(1); expect(push.sent[0]!.headers.get("TTL")).toBe("86400");
  expect(await decrypt(push.sent[0]!.body, reader)).toEqual({ title: "Sơn có một lời nhắn nhỏ", url: "/journal?section=notes", tag: "notes" });
  vi.setSystemTime(new Date("2026-11-13T06:35:00+07:00"));
  await call("PUT", `/api/notes/${id}`, { cookie: a.cookie, body: { ...input, feel: "Fixed" } }); await waitForBackground(); expect(push.sent).toHaveLength(1);
  await Promise.all([runPushCron("2026-11-13T07:00:00+07:00"), runPushCron("2026-11-13T07:00:00+07:00")]);
  for (const day of [14,15]) await runPushCron(`2026-11-${day}T07:00:00+07:00`);
  expect(push.sent).toHaveLength(1);
  await Promise.all([runPushCron("2026-11-16T07:00:00+07:00"), runPushCron("2026-11-16T07:00:00+07:00")]);
  expect(push.sent).toHaveLength(2); expect(await decrypt(push.sent[1]!.body, reader)).toEqual({ title: "Lời nhắn nhỏ của Sơn vẫn ở đây", url: "/journal?section=notes", tag: "notes" });
  expect(push.sent[1]!.headers.get("TTL")).toBe("86400");
  await runPushCron("2026-11-17T07:00:00+07:00"); expect(push.sent).toHaveLength(2);
});

test.each(["opened", "withdrawn"])("notes-journal R43, notes AC10: %s before 07:00 suppresses the reminder", async (action) => {
  const { a, b, push, send } = await setup();
  const id = await send();
  if (action === "opened") await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  else await call("DELETE", `/api/notes/${id}`, { cookie: a.cookie });
  await waitForBackground(); push.sent.length = 0;
  await runPushCron("2026-11-13T07:00:00+07:00"); await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(0);
});
test("notes-journal AC47 R69: notes delivered at 06:30 and 06:45 each arrive at once and share a counted plural reminder", async () => {
  const { reader, push, send } = await setup();
  await send(); vi.setSystemTime(new Date("2026-11-13T06:45:00+07:00")); await send();
  await waitForBackground(); expect(push.sent).toHaveLength(2);
  await runPushCron("2026-11-13T07:00:00+07:00"); expect(push.sent).toHaveLength(2);
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(3); expect((await decrypt(push.sent[2]!.body, reader)).title).toBe("2 lời nhắn nhỏ của Sơn vẫn ở đây");
});
test("notes-journal R69: a reminder never joins another note's arrival message", async () => {
  const { reader, push, send } = await setup("2026-11-13T15:00:00+07:00");
  await send(); await waitForBackground(); push.sent.length = 0;
  vi.setSystemTime(new Date("2026-11-15T23:00:00+07:00")); await send(); await waitForBackground();
  expect(push.sent).toHaveLength(1); expect((await decrypt(push.sent[0]!.body, reader)).title).toBe("Sơn có một lời nhắn nhỏ");
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(2); expect((await decrypt(push.sent[1]!.body, reader)).title).toBe("Lời nhắn nhỏ của Sơn vẫn ở đây");
});
test("notifications R28: gone subscriptions are deleted and other devices still receive notes", async () => {
  const { reader, off, push, send } = await setup("2026-11-13T15:00:00+07:00");
  push.spy.mockRestore(); const gone = mockPush(410);
  await send(); await waitForBackground();
  expect(gone.sent).toHaveLength(1); expect(await stored(reader.body.endpoint)).toBeNull(); expect(await stored(off.body.endpoint)).not.toBeNull();
});
test.each(["07:00:00", "21:59:00", "22:00:00", "06:59:00"])("notes-journal R38 a delivery at %s pushes at once", async (clock) => {
  const { push, send } = await setup(`2026-11-13T${clock}+07:00`);
  await send(); await waitForBackground();
  expect(push.sent).toHaveLength(1); expect(push.sent[0]!.headers.get("TTL")).toBe("86400");
});
test("notes-journal AC24: a 15:00 delivery is reminded at 07:00 on the third Vietnam day only", async () => {
  const { reader, push, send } = await setup("2026-11-13T15:00:00+07:00");
  await send(); await waitForBackground();
  for (const day of [14, 15]) await runPushCron(`2026-11-${day}T07:00:00+07:00`);
  expect(push.sent).toHaveLength(1);
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(2);
  expect((await decrypt(push.sent[1]!.body, reader)).title).toBe("Lời nhắn nhỏ của Sơn vẫn ở đây");
  await runPushCron("2026-11-17T07:00:00+07:00"); expect(push.sent).toHaveLength(2);
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM notes WHERE reminded_at IS NOT NULL").first("n")).toBe(1);
});
