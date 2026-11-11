import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { call, paired, resetDb } from "./helpers";

beforeEach(async () => { await resetDb(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-12T22:30:00+07:00")); });
afterEach(() => vi.useRealTimers());
const input = { happened: "Em lúc nào cũng về muộn", feel: "Anh lo", need: "Biết em an toàn", hope: "Nhắn anh trước nhé" };
test("AC28 AC29: a draft is byte-identical to no note for its recipient on every route", async () => {
  const { a, b } = await paired();
  const before = await (await call("GET", "/api/notes", { cookie: b.cookie })).text();
  const created = await call("POST", "/api/notes", { cookie: a.cookie, body: input });
  expect(created.status).toBe(201);
  const { note } = await created.json<{ note: { id: string } }>();
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).text()).toBe(before);
  for (const [method, suffix] of [["POST", "/open"], ["POST", "/close"], ["PUT", ""], ["POST", "/send"], ["DELETE", ""]]) {
    const hidden = await call(method!, `/api/notes/${note.id}${suffix}`, { cookie: b.cookie, body: input });
    const missing = await call(method!, `/api/notes/random${suffix}`, { cookie: b.cookie, body: input });
    expect(hidden.status).toBe(404);
    expect(await hidden.text()).toBe(await missing.text());
  }
});

test("AC5 AC6 AC7 AC9 AC37 AC38: cool-down survives edits; send stores reread text; waiting reveals no fields", async () => {
  const { a, b } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string; sendableAt: number } }>();
  expect(note.sendableAt).toBe(Date.parse("2026-11-13T06:30:00+07:00"));
  vi.setSystemTime(new Date("2026-11-12T23:10:00+07:00"));
  expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: input })).status).toBe(200);
  vi.setSystemTime(new Date("2026-11-13T06:29:00+07:00"));
  const early = await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  expect(early.status).toBe(409); expect(await early.json()).toEqual({ error: "note_cooling" });
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
  const sent = await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: { ...input, happened: "Reread" } });
  expect(sent.status).toBe(200); expect((await sent.json<{ note: unknown }>()).note).toMatchObject({ happened: "Reread", state: "sent", sendableAt: note.sendableAt });
  const before = await (await call("GET", "/api/notes", { cookie: b.cookie })).text();
  expect(JSON.parse(before)).toEqual({ fromMe: [], toMe: [{ id: note.id, state: "waiting" }] });
  vi.setSystemTime(new Date("2026-11-13T06:35:00+07:00"));
  expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, happened: "Fixed" } })).status).toBe(200);
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).text()).toBe(before);
  const again = await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  expect(again.status).toBe(409); expect(await again.json()).toEqual({ error: "note_sent" });
});

test("AC10 AC35: withdraw deletes a waiting note for both; recipient cannot delete", async () => {
  const { a, b } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
  await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  expect((await call("DELETE", `/api/notes/${note.id}`, { cookie: b.cookie })).status).toBe(404);
  expect((await call("DELETE", `/api/notes/${note.id}`, { cookie: a.cookie })).status).toBe(200);
  for (const person of [a,b]) expect(await (await call("GET", "/api/notes", { cookie: person.cookie })).json()).toEqual({ fromMe: [], toMe: [] });
});

test.each([
  [{ feel: " " }, "note_empty"], [{ hope: "x".repeat(501) }, "note_text_too_long"],
  [{ feel: "\u200b" }, "note_empty"], [{ feel: "bad\u0001" }, "invalid_body"],
  [{ photoIds: [] }, "invalid_body"],
])("AC2: refuses invalid fields %j", async (change, error) => {
  const { a } = await paired();
  const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, ...change } });
  expect(res.status).toBe(400); expect(await res.json()).toEqual({ error });
});

test("AC11 AC39: edit and withdraw lose after open without changing stored text or clocks", async () => {
  const { a } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
  await call("POST", `/api/notes/${note.id}/send`, { cookie: a.cookie, body: input });
  const read = () => env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(note.id).first();
  const sent = await read();
  vi.setSystemTime(new Date("2026-11-13T06:35:00+07:00"));
  await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, feel: "Fixed" } });
  expect(await read()).toMatchObject({ ...sent, feel: "Fixed", updated_at: Date.now() });
  await env.DB.prepare("UPDATE notes SET opened_at = ? WHERE id = ?").bind(Date.now(), note.id).run();
  const opened = await read();
  for (const method of ["PUT", "DELETE"]) {
    const res = await call(method, `/api/notes/${note.id}`, { cookie: a.cookie, body: input });
    expect(res.status).toBe(409); expect(await res.json()).toEqual({ error: "note_opened" });
    expect(await read()).toEqual(opened);
  }
});

test("AC2 AC3 AC8: 500 code points, whitespace and newlines preserved; unsent notes never expire", async () => {
  const { a, b } = await paired();
  const text = "  One\nconcrete time  ";
  const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, happened: text, feel: "😀".repeat(500) } });
  expect(res.status).toBe(201);
  const { note } = await res.json<{ note: { id: string; happened: string } }>();
  expect(note.happened).toBe("One\nconcrete time");
  vi.setSystemTime(new Date("2026-11-30T12:00:00+07:00"));
  // Session expiry is separate from the note lifecycle; keep this fixture signed in.
  await env.DB.prepare("UPDATE sessions SET expires_at = ?").bind(Date.now() + 86400000).run();
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).json()).toEqual({ fromMe: [], toMe: [] });
  expect((await (await call("GET", "/api/notes", { cookie: a.cookie })).json<{ fromMe: { state: string }[] }>()).fromMe[0]?.state).toBe("draft");
});
