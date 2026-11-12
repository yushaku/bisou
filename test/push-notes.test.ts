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
  const { note } = await (await call("POST", "/api/notes", { cookie: pair.a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date(time));
  return { ...pair, reader, writer, off, id: note.id, push: mockPush() };
}
test("notes-journal AC23 AC26 AC27: daytime send pushes exact private payload only to recipient journal-on devices", async () => {
  const { a, id, reader, push } = await setup("2026-11-13T15:00:00+07:00");
  expect((await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input })).status).toBe(200);
  await waitForBackground(); expect(push.sent).toHaveLength(1);
  expect(push.sent[0]!.endpoint).toBe(reader.body.endpoint);
  expect(await decrypt(push.sent[0]!.body, reader)).toEqual({ title: "Sơn có một lời nhắn nhỏ", url: "/journal?section=notes", tag: "notes" });
  await call("PUT", `/api/notes/${id}`, { cookie: a.cookie, body: { ...input, feel: "Fixed" } });
  await waitForBackground(); expect(push.sent).toHaveLength(1);
});
test("AC24 AC37 AC38: a 06:30 send pushes at once, the 07:00 cron adds nothing and the reminder comes once on Vietnam day D+3", async () => {
  const { a, id, reader, push } = await setup();
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input }); await waitForBackground();
  expect(push.sent).toHaveLength(1); expect(push.sent[0]!.headers.get("TTL")).toBe("86400");
  expect(await decrypt(push.sent[0]!.body, reader)).toEqual({ title: "Sơn có một lời nhắn nhỏ", url: "/journal?section=notes", tag: "notes" });
  expect(await env.DB.prepare("SELECT notified_at FROM notes WHERE id = ?").bind(id).first("notified_at")).toBe(Date.parse("2026-11-13T06:30:00+07:00"));
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
test("the 07:00 cron still flushes a note held with notified_at NULL", async () => {
  const { a, id, reader, push } = await setup();
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input }); await waitForBackground(); push.sent.length = 0;
  await env.DB.prepare("UPDATE notes SET notified_at = NULL WHERE id = ?").bind(id).run();
  await runPushCron("2026-11-13T07:00:00+07:00");
  expect(push.sent).toHaveLength(1); expect((await decrypt(push.sent[0]!.body, reader)).title).toBe("Sơn có một lời nhắn nhỏ");
  expect(await env.DB.prepare("SELECT notified_at FROM notes WHERE id = ?").bind(id).first("notified_at")).toBe(Date.parse("2026-11-13T07:00:00+07:00"));
});

test.each(["opened", "withdrawn"])("notes-journal R43, notes AC10: %s before 07:00 suppresses the reminder", async (action) => {
  const { a, b, id, push } = await setup();
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input });
  if (action === "opened") await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  else await call("DELETE", `/api/notes/${id}`, { cookie: a.cookie });
  await waitForBackground(); push.sent.length = 0;
  await runPushCron("2026-11-13T07:00:00+07:00"); await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(0);
});
test("notes-journal AC47: overnight notes each arrive at once and share a counted plural reminder", async () => {
  const { a, id, reader, push } = await setup();
  vi.setSystemTime(new Date("2026-11-12T22:30:00+07:00"));
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00")); await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input });
  vi.setSystemTime(new Date("2026-11-13T06:45:00+07:00")); await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  await waitForBackground(); expect(push.sent).toHaveLength(2);
  await runPushCron("2026-11-13T07:00:00+07:00"); expect(push.sent).toHaveLength(2);
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(3); expect((await decrypt(push.sent[2]!.body, reader)).title).toBe("2 lời nhắn nhỏ của Sơn vẫn ở đây");
});
test("Q5: missed 07:00 catches up, arrival wins over reminder in the same run", async () => {
  const { a, id, reader, push } = await setup(); await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input });
  await waitForBackground(); push.sent.length = 0;
  await env.DB.prepare("UPDATE notes SET notified_at = NULL WHERE id = ?").bind(id).run();
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(1); expect((await decrypt(push.sent[0]!.body, reader)).title).toBe("Sơn có một lời nhắn nhỏ");
  await runPushCron("2026-11-17T07:00:00+07:00"); expect(push.sent).toHaveLength(1);
});
test("notifications R28: gone subscriptions are deleted and other devices still receive notes", async () => {
  const { a, id, reader, off, push } = await setup("2026-11-13T15:00:00+07:00");
  push.spy.mockRestore(); const gone = mockPush(410);
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input }); await waitForBackground();
  expect(gone.sent).toHaveLength(1); expect(await stored(reader.body.endpoint)).toBeNull(); expect(await stored(off.body.endpoint)).not.toBeNull();
});
test.each(["07:00:00", "21:59:00", "22:00:00", "06:59:00"])("notes-journal R38 a send at %s pushes at once", async (clock) => {
  const { a, id, push } = await setup(`2026-11-13T${clock}+07:00`);
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input }); await waitForBackground();
  expect(push.sent).toHaveLength(1); expect(push.sent[0]!.headers.get("TTL")).toBe("86400");
});

test("R39 R40: a new arrival includes another note's claimed reminder once", async () => {
  const { a, id, reader, push } = await setup("2026-11-13T15:00:00+07:00");
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input });
  await waitForBackground(); push.sent.length = 0;
  vi.setSystemTime(new Date("2026-11-15T14:00:00+07:00"));
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-15T23:00:00+07:00"));
  await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  await waitForBackground(); expect(push.sent).toHaveLength(1); push.sent.length = 0;
  await env.DB.prepare("UPDATE notes SET notified_at = NULL WHERE id = ?").bind(note.id).run();
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(1);
  expect((await decrypt(push.sent[0]!.body, reader)).title).toBe("Sơn có 2 lời nhắn nhỏ");
  expect(await env.DB.prepare("SELECT reminded_at FROM notes WHERE id = ?").bind(id).first("reminded_at")).toBe(Date.parse("2026-11-16T07:00:00+07:00"));
  await runPushCron("2026-11-17T07:00:00+07:00"); expect(push.sent).toHaveLength(1);
});
test("notes-journal AC24: a 15:00 send is reminded at 07:00 on the third Vietnam day only", async () => {
  const { a, id, reader, push } = await setup("2026-11-13T15:00:00+07:00");
  await call("POST", `/api/notes/${id}/send`, { cookie: a.cookie, body: input }); await waitForBackground();
  for (const day of [14, 15]) await runPushCron(`2026-11-${day}T07:00:00+07:00`);
  expect(push.sent).toHaveLength(1);
  await runPushCron("2026-11-16T07:00:00+07:00");
  expect(push.sent).toHaveLength(2);
  expect((await decrypt(push.sent[1]!.body, reader)).title).toBe("Lời nhắn nhỏ của Sơn vẫn ở đây");
  await runPushCron("2026-11-17T07:00:00+07:00"); expect(push.sent).toHaveLength(2);
});
