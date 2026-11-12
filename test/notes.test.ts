import { device, subscribe, mockPush, runPushCron } from "./push-helpers";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { env } from "cloudflare:test";
import { call, paired, resetDb, user, waitForBackground } from "./helpers";
import { sendScheduledNotes } from "../src/worker/lib/notes";

beforeEach(async () => { await resetDb(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-12T22:30:00+07:00")); });
afterEach(() => vi.useRealTimers());
const input = { happened: "Em lúc nào cũng về muộn", feel: "Anh lo", need: "Biết em an toàn", hope: "Nhắn anh trước nhé" };
test("notes-journal AC28 AC29: a draft is byte-identical to no note for its recipient on every route", async () => {
  const { a, b } = await paired();
  const before = await (await call("GET", "/api/notes", { cookie: b.cookie })).text();
  const created = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "eightHours" } });
  expect(created.status).toBe(201);
  const { note } = await created.json<{ note: { id: string } }>();
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).text()).toBe(before);
  for (const [method, suffix] of [["POST", "/open"], ["POST", "/close"], ["PUT", ""], ["PUT", "/closed"], ["DELETE", ""]]) {
    const hidden = await call(method!, `/api/notes/${note.id}${suffix}`, { cookie: b.cookie, body: input });
    const missing = await call(method!, `/api/notes/random${suffix}`, { cookie: b.cookie, body: input });
    expect(hidden.status).toBe(404);
    expect(await hidden.text()).toBe(await missing.text());
  }
});

test("notes R63 R65 R68 AC43 AC44 AC45: eight hours counts from the choice, edits keep it, the scheduler delivers and waiting reveals no fields", async () => {
  const { a, b } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "eightHours" } })).json<{ note: { id: string; state: string; scheduledAt: number } }>();
  const due = Date.parse("2026-11-13T06:30:00+07:00");
  expect(note).toMatchObject({ state: "draft", scheduledAt: due }); expect(note).not.toHaveProperty("sendableAt");
  vi.setSystemTime(new Date("2026-11-12T23:10:00+07:00"));
  const edited = await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, happened: "Edited" } });
  expect((await edited.json<{ note: { scheduledAt: number } }>()).note.scheduledAt).toBe(due);
  const again = await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, delivery: "eightHours" } });
  expect((await again.json<{ note: { scheduledAt: number } }>()).note.scheduledAt).toBe(Date.parse("2026-11-13T07:10:00+07:00"));
  vi.setSystemTime(new Date("2026-11-13T07:10:00+07:00"));
  await sendScheduledNotes(env, Date.now());
  const before = await (await call("GET", "/api/notes", { cookie: b.cookie })).text();
  expect(JSON.parse(before)).toEqual({ fromMe: [], toMe: [{ id: note.id, state: "waiting" }] });
  vi.setSystemTime(new Date("2026-11-13T07:15:00+07:00"));
  expect((await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, happened: "Fixed" } })).status).toBe(200);
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).text()).toBe(before);
  const later = await call("PUT", `/api/notes/${note.id}`, { cookie: a.cookie, body: { ...input, delivery: "now" } });
  expect(later.status).toBe(409); expect(await later.json()).toEqual({ error: "note_sent" });
});

test.each([[{}], [{ delivery: "bad" }], [{ delivery: "custom" }]])("notes R63 AC43: a new note must carry a valid delivery option, got %j", async (change) => {
  const { a } = await paired();
  const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, ...change } });
  expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: "invalid_note_schedule" });
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM notes").first("n")).toBe(0);
});
test("notes R63: the retired send route no longer exists", async () => {
  const note = await sentNote(), res = await call("POST", `/api/notes/${note.id}/send`, { cookie: note.a.cookie, body: input });
  expect(res.status).toBe(404);
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM notes").first("n")).toBe(1);
});

test("notes AC10, notes-journal AC35: withdraw deletes a waiting note for both; recipient cannot delete", async () => {
  const { a, b } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "now" } })).json<{ note: { id: string } }>();
  expect((await call("DELETE", `/api/notes/${note.id}`, { cookie: b.cookie })).status).toBe(404);
  expect((await call("DELETE", `/api/notes/${note.id}`, { cookie: a.cookie })).status).toBe(200);
  for (const person of [a,b]) expect(await (await call("GET", "/api/notes", { cookie: person.cookie })).json()).toEqual({ fromMe: [], toMe: [] });
});

test.each([
  [{ feel: " " }, "note_empty"], [{ hope: "x".repeat(501) }, "note_text_too_long"],
  [{ feel: "\u200b" }, "note_empty"], [{ feel: "bad\u0001" }, "invalid_body"],
  [{ photoIds: [] }, "invalid_body"],
])("notes AC2: refuses invalid fields %j", async (change, error) => {
  const { a } = await paired();
  const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, ...change } });
  expect(res.status).toBe(400); expect(await res.json()).toEqual({ error });
});

test("notes AC11 AC39: edit and withdraw lose after open without changing stored text or clocks", async () => {
  const { a } = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "now" } })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
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

test("notes AC2 AC3 AC46 R67: 500 code points, whitespace and newlines preserved; a draft with no delivery never expires", async () => {
  const { a, b } = await paired();
  const text = "  One\nconcrete time  ";
  const res = await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, happened: text, feel: "😀".repeat(500), delivery: "now" } });
  expect(res.status).toBe(201);
  const { note } = await res.json<{ note: { id: string; happened: string } }>();
  expect(note.happened).toBe("One\nconcrete time");
  // A draft saved before delivery choices existed has neither a send time nor a delivery.
  await env.DB.prepare("UPDATE notes SET sent_at = NULL, scheduled_at = NULL WHERE id = ?").bind(note.id).run();
  vi.setSystemTime(new Date("2026-11-30T12:00:00+07:00"));
  // Session expiry is separate from the note lifecycle; keep this fixture signed in.
  await env.DB.prepare("UPDATE sessions SET expires_at = ?").bind(Date.now() + 86400000).run();
  expect(await (await call("GET", "/api/notes", { cookie: b.cookie })).json()).toEqual({ fromMe: [], toMe: [] });
  expect((await (await call("GET", "/api/notes", { cookie: a.cookie })).json<{ fromMe: { state: string }[] }>()).fromMe[0]?.state).toBe("draft");
});

async function sentNote() {
  const pair = await paired();
  const { note } = await (await call("POST", "/api/notes", { cookie: pair.a.cookie, body: { ...input, delivery: "now" } })).json<{ note: { id: string } }>();
  vi.setSystemTime(new Date("2026-11-13T06:30:00+07:00"));
  return { ...pair, id: note.id };
}
test("notes AC11 AC15 AC16 AC39: edit/open race orders preserve the winning whole text and lock edits", async () => {
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
test.each([true, false])("notes AC10 AC11: open/withdraw race first winner is preserved: openFirst=%s", async (openFirst) => {
  const { a, b, id } = await sentNote();
  const open = () => call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  const withdraw = () => call("DELETE", `/api/notes/${id}`, { cookie: a.cookie });
  expect((await (openFirst ? open() : withdraw())).status).toBe(200);
  expect((await (openFirst ? withdraw() : open())).status).toBe(openFirst ? 409 : 404);
});

test("notes AC17 AC18, notes-journal AC19 AC21 AC22: close once moves structured words into both journal feeds at Vietnam close time", async () => {
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

test("notes AC17: a pick without a line closes and concurrent closes create exactly one entry", async () => {
  const { b, id } = await sentNote(); await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  const responses = await Promise.all([1, 2].map(() => call("POST", `/api/notes/${id}/close`, { cookie: b.cookie, body: { pick: "try" } })));
  expect(responses.map((r) => r.status).sort()).toEqual([201, 404]);
  const entry = await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries WHERE note_id = ?").bind(id).first("n"); expect(entry).toBe(1);
});
test("notes-journal AC30: unpaired and paired outsiders get uniform 404 on every notes route", async () => {
  const { id } = await sentNote();
  const outsider = await user("Other");
  for (const pairedOutside of [false, true]) {
    if (pairedOutside) {
      const partner = await user("Elsewhere");
      const res = await call("POST", "/api/couple", { cookie: outsider.cookie });
      const code = (await res.json<{ couple: { pendingCode: { code: string } } }>()).couple.pendingCode.code;
      await call("POST", "/api/couple/join", { cookie: partner.cookie, body: { code } });
    }
    for (const [method, path] of [["GET", ""], ["POST", ""], ["PUT", `/${id}`], ["PUT", `/${id}/closed`], ["POST", `/${id}/open`], ["POST", `/${id}/close`], ["DELETE", `/${id}`]]) {
      // List/create belong to the caller's own couple; id routes always hide another couple's note.
      if (pairedOutside && !path) continue;
      const res = await call(method!, `/api/notes${path}`, { cookie: outsider.cookie, body: method === "GET" ? undefined : input });
      expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: "not_found" });
    }
  }
});
test.each(["14:00:00", "23:00:00"])("notes-journal AC21: closing at %s never announces a new journal entry, including the 07:00 release", async (time) => {
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
test("notes R23: waiting first oldest sent; opened notes follow oldest opened with no timestamps in payload", async () => {
  const { a, b, id } = await sentNote();
  vi.setSystemTime(new Date("2026-11-13T15:00:00+07:00"));
  const { note: second } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "now" } })).json<{ note: { id: string } }>();
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id, state: "waiting" }, { id: second.id, state: "waiting" }]);
  await call("POST", `/api/notes/${second.id}/open`, { cookie: b.cookie });
  vi.setSystemTime(new Date("2026-11-13T16:00:00+07:00"));
  await call("POST", `/api/notes/${id}/open`, { cookie: b.cookie });
  expect((await (await call("GET", "/api/notes", { cookie: b.cookie })).json<{ toMe: unknown[] }>()).toMe).toEqual([{ id: second.id, state: "opened", ...input }, { id, state: "opened", ...input }]);
});

test("notes AC18, notes-journal AC19: a failed journal insert rolls back closing without losing the opened note", async () => {
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

async function closedNote() {
  const pair = await sentNote();
  await call("POST", `/api/notes/${pair.id}/open`, { cookie: pair.b.cookie });
  const res = await call("POST", `/api/notes/${pair.id}/close`, { cookie: pair.b.cookie, body: { pick: "try" } });
  const { entry } = await res.json<{ entry: import("../src/shared/types").JournalEntry }>();
  return { ...pair, entry };
}
test("notes-journal AC20 journal AC20 AC21: either partner edits all closed-note fields and day, normal journal routes hide it", async () => {
  const { a, b, id, entry } = await closedNote();
  for (const person of [a,b]) {
    const body = { ...input, hope: `Talk with ${person.id}`, pick: "differ", line: "My understanding", date: "2026-11-12" };
    const res = await call("PUT", `/api/notes/${id}/closed`, { cookie: person.cookie, body }); expect(res.status).toBe(200);
    expect((await res.json<{ entry: unknown }>()).entry).toMatchObject({ date: body.date, note: { hope: body.hope, pick: body.pick, line: body.line, recipientId: b.id } });
    const other = person === a ? b : a;
    expect((await (await call("GET", "/api/journal", { cookie: other.cookie })).json<{ entries: unknown[] }>()).entries[0]).toMatchObject({ note: { hope: body.hope } });
    for (const method of ["PUT", "DELETE"]) expect((await call(method, `/api/journal/${entry.id}`, { cookie: person.cookie, body: { date: body.date, text: "Bypass", photoIds: [] } })).status).toBe(404);
  }
});
test("notes-journal AC20: closed notes permit 2500 characters but reject bad parts, pick, day and photoIds", async () => {
  const { a, id } = await closedNote();
  const body = { happened: "h".repeat(500), feel: "f".repeat(500), need: "n".repeat(500), hope: "r".repeat(500), line: "l".repeat(500), pick: "talk", date: "2026-11-12" };
  expect((await call("PUT", `/api/notes/${id}/closed`, { cookie: a.cookie, body })).status).toBe(200);
  for (const change of [{ hope: "x".repeat(501) }, { line: "x".repeat(501) }, { pick: "other" }, { photoIds: [] }, { date: "2026-11-15" }]) {
    const res = await call("PUT", `/api/notes/${id}/closed`, { cookie: a.cookie, body: { ...body, ...change } }); expect(res.status).toBe(400);
    if ("date" in change) expect(await res.json()).toEqual({ error: "invalid_entry_date" });
  }
});
test.each(["writer", "recipient"])("notes-journal AC36: %s deletes the closed note and cascading entry for both", async (who) => {
  const { a, b, id, entry } = await closedNote();
  expect((await call("DELETE", `/api/notes/${id}`, { cookie: (who === "writer" ? a : b).cookie })).status).toBe(200);
  expect(await env.DB.prepare("SELECT id FROM notes WHERE id = ?").bind(id).first()).toBeNull();
  expect(await env.DB.prepare("SELECT id FROM journal_entries WHERE id = ?").bind(entry.id).first()).toBeNull();
  for (const person of [a,b]) expect((await (await call("GET", "/api/journal", { cookie: person.cookie })).json<{ entries: unknown[] }>()).entries).toEqual([]);
});

test("notes-journal AC20 AC21: open notes refuse closed edits; closed edits and deletes never push at the next 07:00", async () => {
  const { a, b, id } = await closedNote();
  await subscribe(a, await device("writer")); await subscribe(b, await device("recipient"));
  const body = { ...input, pick: "talk", line: "Understood", date: "2026-11-12" };
  const { note } = await (await call("POST", "/api/notes", { cookie: a.cookie, body: { ...input, delivery: "custom", sendAt: Date.parse("2099-01-01T00:00:00Z") } })).json<{ note: { id: string } }>();
  for (const person of [a,b]) expect((await call("PUT", `/api/notes/${note.id}/closed`, { cookie: person.cookie, body })).status).toBe(404);
  const push = mockPush();
  try {
    vi.setSystemTime(new Date("2026-11-13T23:00:00+07:00"));
    expect((await call("PUT", `/api/notes/${id}/closed`, { cookie: b.cookie, body })).status).toBe(200);
    expect((await call("DELETE", `/api/notes/${id}`, { cookie: a.cookie })).status).toBe(200);
    await waitForBackground(); await runPushCron("2026-11-14T07:00:00+07:00"); expect(push.sent).toHaveLength(0);
  } finally { push.spy.mockRestore(); }
});
