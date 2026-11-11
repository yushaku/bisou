import { device, subscribe, mockPush, runPushCron } from "./push-helpers";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { call, paired, resetDb, user, waitForBackground } from "./helpers";

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

async function sentNote() {
  const pair = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: pair.a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
  await call("POST", `/api/notes/${note.id}/send`, { cookie: pair.a.cookie, body: input });
  return { ...pair, id: note.id };
}
test("AC11 AC15 AC16 AC39: edit/open race orders preserve the winning whole text and lock edits", async () => {
  const { a, b, id } = await sentNote();
  const fixed = { ...input, happened: "Saved first", feel: "Calm" };
  expect((await call("PUT", `/api/notes/${id}`, { cookie: a.cookie, body: fixed })).status).toBe(200);
  const opened = await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  expect(opened.status).toBe(200); expect(await opened.json()).toEqual({ note: { id, state: "opened", ...fixed } });
  const before = await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
  const refused = await call("PUT", `/api/notes/${id}`, { cookie: a.cookie, body: input });
  expect(refused.status).toBe(409); expect(await refused.json()).toEqual({ error: "note_opened" });
  expect(await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first()).toEqual(before);
  expect((await (await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie })).json())).toEqual({ note: { id, state: "opened", ...fixed } });
  expect((await (await call("GET", "/api/notes", { cookie: a.cookie })).json<{ fromMe: { state: string }[] }>()).fromMe[0]?.state).toBe("opened");
});
test.each([true, false])("AC10 AC11: open/withdraw race first winner is preserved: openFirst=%s", async (openFirst) => {
  const { a, b, id } = await sentNote();
  const open = () => call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  const withdraw = () => call("DELETE", `/api/notes/${id}`, { cookie: a.cookie });
  expect((await (openFirst ? open() : withdraw())).status).toBe(200);
  expect((await (openFirst ? withdraw() : open())).status).toBe(openFirst ? 409 : 404);
});

test("AC17 AC18 AC19 AC21 AC22: close once moves structured words into both journal feeds at Vietnam close time", async () => {
  const { a, b, id } = await sentNote();
  expect((await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "try" } })).status).toBe(404);
  await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  for (const body of [{}, { pick: "bad" }, { pick: "talk", line: "x".repeat(501) }]) expect((await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body })).status).toBe(400);
  expect((await call("POST", `/api/notes/${id}/close`, { cookie: a.cookie, body: { pick: "try" } })).status).toBe(404);
  vi.setSystemTime(new Date("2026-11-14T00:15:00+07:00"));
  const response = await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "talk", line: "  I understand\nnow  " } });
  expect(response.status).toBe(201);
  const { entry } = await response.json<{ entry: import("../src/shared/types").JournalEntry }>();
  expect(entry).toMatchObject({ authorId: a.id, date: "2026-11-14", text: "", photoIds: [], createdAt: Date.now(), note: { id, recipientId: b.id, ...input, pick: "talk", line: "I understand\nnow" } });
  expect(await env.DB.prepare("SELECT body, note_id FROM journal_entries WHERE id = ?").bind(entry.id).first()).toEqual({ body: "", note_id: id });
  for (const person of [a, b]) {
    expect(await (await call("GET", "/api/notes", { cookie: person.cookie })).json()).toEqual({ fromMe: [], toMe: [] });
    const feed = await (await call("GET", "/api/journal", { cookie: person.cookie })).json<{ entries: unknown[] }>();
    expect(feed.entries).toEqual([entry]);
  }
  expect((await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "try" } })).status).toBe(404);
  expect((await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie })).status).toBe(404);
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries WHERE note_id = ?").bind(id).first("n")).toBe(1);
});

test("AC17: a pick without a line closes and concurrent closes create exactly one entry", async () => {
  const { b, id } = await sentNote(); await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  const responses = await Promise.all([1, 2].map(() => call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "try" } })));
  expect(responses.map((r) => r.status).sort()).toEqual([201, 404]);
  const entry = await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries WHERE note_id = ?").bind(id).first("n"); expect(entry).toBe(1);
});
test("AC30: unpaired and paired outsiders get uniform 404 on every notes route", async () => {
  const { id } = await sentNote();
  const outsider = await user("Other");
  for (const pairedOutside of [false, true]) {
    if (pairedOutside) {
      const partner = await user("Elsewhere");
      const res = await call("POST", "/api/couple", { cookie: outsider.cookie });
      const code = (await res.json<{ couple: { pendingCode: { code: string } } }>()).couple.pendingCode.code;
      await call("POST", "/api/couple/join", { cookie: partner.cookie, body: { code } });
    }
    for (const [method, path] of [["GET", ""], ["POST", ""], ["PUT", `/${id}`], ["POST", `/${id}/open`], ["POST", `/${id}/close`], ["POST", `/${id}/send`], ["DELETE", `/${id}`]]) {
      // List/create belong to the caller's own couple; id routes always hide another couple's note.
      if (pairedOutside && !path) continue;
      const res = await call(method!, `/api/notes${path}`, { cookie: outsider.cookie, body: method === "GET" ? undefined : input });
      expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: "not_found" });
    }
  }
});
test.each(["14:00:00", "23:00:00"])("AC21: closing at %s never announces a new journal entry, including the 07:00 release", async (time) => {
  const { a, b, id } = await sentNote();
  await subscribe(a, await device("writer")); await subscribe(b, await device("reader"));
  await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  vi.setSystemTime(new Date(`2026-11-13T${time}+07:00`));
  const push = mockPush();
  try {
    expect((await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "talk" } })).status).toBe(201);
    await waitForBackground(); await runPushCron("2026-11-14T07:00:00+07:00");
    expect(push.sent).toHaveLength(0);
  } finally { push.spy.mockRestore(); }
});
test("R23: waiting first oldest sent; opened notes follow oldest opened with no timestamps in payload", async () => {
  const { a, b, id } = await sentNote();
  const { note: second } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: input })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T15:00:00+07:00"));
  await call("POST", `/api/notes/${second.id}/send`, { cookie: a.cookie, body: input });
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id, state: "waiting" }, { id: second.id, state: "waiting" }]);
  await call("POST", `/api/notes/${second.id}/open`, { cookie: b.cookie });
  vi.setSystemTime(new Date("2026-11-13T16:00:00+07:00"));
  await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id: second.id, state: "opened", ...input }, { id, state: "opened", ...input }]);
});

test("AC18 AC19: a failed journal insert rolls back closing without losing the opened note", async () => {
  const { a, b, id } = await sentNote();
  await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  await env.DB.exec("CREATE TRIGGER reject_note_entry BEFORE INSERT ON journal_entries BEGIN SELECT RAISE(ABORT, 'fixture rejects entry'); END");
  try {
    const res = await call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "try" } });
    expect(res.status).toBe(500);
    expect((await (await call("GET", "/api/notes", { cookie: a.cookie })).json<{ fromMe: { state: string }[] }>()).fromMe[0]?.state).toBe("opened");
    expect(await env.DB.prepare("SELECT closed_at, pick FROM notes WHERE id = ?").bind(id).first()).toEqual({ closed_at: null, pick: null });
  } finally { await env.DB.exec("DROP TRIGGER reject_note_entry"); }
});
