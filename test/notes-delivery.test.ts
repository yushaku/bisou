import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { call, paired, resetDb, waitForBackground } from "./helpers";
import { device, subscribe, mockPush, runPushCron } from "./push-helpers";
import type { WrittenNote } from "../src/shared/types";

const input = { happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" };
beforeEach(async () => { await resetDb(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-12T22:30:00+07:00")); });
afterEach(() => vi.useRealTimers());

test("send now delivers immediately and notifies once", async () => {
  const { a, b } = await paired();
  await subscribe(b, await device("note-now"));
  const push = mockPush();
  try {
    const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "now" } });
    expect(res.status).toBe(201);
    const { note } = await res.json<{ note: WrittenNote }>();
    expect(note.state).toBe("sent");
    expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id: note.id, state: "waiting" }]);
    await waitForBackground();
    expect(push.queued).toHaveLength(1);
    await runPushCron("2026-11-13T07:00:00+07:00");
    expect(push.queued).toHaveLength(1);
  } finally { push.spy.mockRestore(); push.queue.mockRestore(); }
});

test.each(["eightHours", "custom"])("%s stays private until due and sends without an open app, even without push", async (delivery) => {
  const { a, b } = await paired();
  const sendAt = Date.now() + 8 * 3_600_000;
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery, sendAt } })).json<{ note: WrittenNote & { scheduledAt: number } }>();
  expect(note.state).toBe("draft"); expect(note.scheduledAt).toBe(sendAt);
  await runPushCron("2026-11-13T06:29:00+07:00");
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([]);
  await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, hope: "Edited" } });
  await runPushCron("2026-11-13T06:30:00+07:00");
  const row = await env.DB.prepare("SELECT sent_at, hope, scheduled_at FROM notes WHERE id = ?").bind(note.id).first();
  expect(row).toEqual({ sent_at: sendAt, hope: "Edited", scheduled_at: sendAt });
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id: note.id, state: "waiting" }]);
  await runPushCron("2026-11-13T06:31:00+07:00");
  expect(await env.DB.prepare("SELECT sent_at FROM notes WHERE id = ?").bind(note.id).first()).toEqual({ sent_at: sendAt });
});

test("scheduled note notifies once; changing the time and withdrawing cancel the old send", async () => {
  const { a, b } = await paired();
  await subscribe(b, await device("note-scheduled"));
  const push = mockPush();
  try {
    const sendAt = Date.now() + 60_000;
    const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "custom", sendAt } })).json<{ note: WrittenNote }>();
    expect((await call("PUT", `/api/notes/${note.id}`, { cookie: b.cookie, body: { ...input, delivery: "now" } })).status).toBe(404);
    await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, delivery: "custom", sendAt: sendAt + 60_000 } });
    await runPushCron("2026-11-12T22:31:00+07:00"); expect(push.queued).toHaveLength(0);
    await runPushCron("2026-11-12T22:32:00+07:00"); expect(push.queued).toHaveLength(1);
    await runPushCron("2026-11-12T22:33:00+07:00"); expect(push.queued).toHaveLength(1);
    expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, delivery: "now" } })).status).toBe(409);
    const other = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "eightHours" } })).json<{ note: WrittenNote }>();
    await call("DELETE", `/api/notes/${other.note.id}`, { cookie: a.cookie });
    await runPushCron("2026-11-13T06:30:00+07:00"); expect(push.queued).toHaveLength(1);
  } finally { push.spy.mockRestore(); push.queue.mockRestore(); }
});

test.each([{ delivery: "bad" }, { delivery: "custom" }, { delivery: "custom", sendAt: "tomorrow" }, { delivery: "custom", sendAt: 1 }, { delivery: "custom", sendAt: 1e20 }])("reject invalid delivery %j", async (delivery) => {
  const { a } = await paired();
  expect((await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, ...delivery } })).status).toBe(400);
});

test("a manual draft can send now; a scheduled note can send early without repeating delivery", async () => {
  const { a, b } = await paired();
  for (const initial of [{}, { delivery: "eightHours" }]) {
    const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, ...initial } })).json<{ note: WrittenNote }>();
    const res = await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, delivery: "now" } });
    expect(res.status).toBe(200);
    expect((await res.json<{ note: WrittenNote }>()).note.state).toBe("sent");
    expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, hope: "Fixed" } })).status).toBe(200);
    await call("POST", `/api/notes/${note.id}/open`, { cookie: b.cookie });
    expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: input })).status).toBe(409);
  }
});

test("overlapping ticks claim a due note once and preserve old drafts", async () => {
  const { a, b } = await paired();
  await subscribe(b, await device("note-overlap"));
  const push = mockPush();
  try {
    const legacy = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: WrittenNote }>();
    await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "eightHours" } });
    await Promise.all([runPushCron("2026-11-13T06:31:00+07:00"), runPushCron("2026-11-13T06:31:00+07:00")]);
    expect(push.queued).toHaveLength(1);
    expect(await env.DB.prepare("SELECT sent_at, scheduled_at FROM notes WHERE id = ?").bind(legacy.note.id).first()).toEqual({ sent_at: null, scheduled_at: null });
  } finally { push.spy.mockRestore(); push.queue.mockRestore(); }
});
