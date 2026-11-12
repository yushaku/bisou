import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WRITTEN_NOTES_SQL, RECEIVED_NOTES_SQL } from "../src/worker/lib/notes";
import { RELEASE_NOTES_SQL, REMIND_NOTES_SQL } from "../src/worker/lib/notify";
import { OPEN_NOTE_SQL, CLOSE_NOTE_SQL, CLOSE_ENTRY_SQL, UPDATE_CLOSED_NOTE_SQL } from "../src/worker/routes/notes";
import worker from "../src/worker/index";
import { call, explain, jpeg, paired, photoForm, resetDb, webp } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("push query plans", () => {
  it.each([
    ["notifications AC7, AC8, R10: reminder recipients", `SELECT s.user_id, u.locale FROM push_subscriptions s
      JOIN users u ON u.id = s.user_id WHERE s.reminders = 1`, [], ["push_subscriptions_reminders", "sqlite_autoindex_users_1"]],
    ["notifications AC7, R10: reminder device claim", `UPDATE push_subscriptions SET reminder_slot = ?
      WHERE user_id = ? AND reminders = 1 AND (reminder_slot IS NULL OR reminder_slot <> ?)
      RETURNING id, endpoint, p256dh, auth`, ["2026-11-08T08", "user", "2026-11-08T08"], ["push_subscriptions_reminders"]],
    ["AC12, AC13, R18: night window", "SELECT couple_id, author_id FROM journal_entries WHERE created_at >= ? AND created_at < ?", [100, 200], ["journal_entries_created"]],
    ["AC12, R17: night recipient", `SELECT u.id, u.locale, (SELECT display_name FROM users WHERE id = ?) AS name
      FROM couple_members m JOIN users u ON u.id = m.user_id WHERE m.couple_id = ? AND m.user_id <> ?`, ["author", "couple", "author"], ["sqlite_autoindex_users_1", "sqlite_autoindex_couple_members_"]],
    ["notifications R2, R30: own devices", "SELECT endpoint, journal, reminders FROM push_subscriptions WHERE user_id = ?", ["user"], ["push_subscriptions_user"]],
    ["notifications R27: device cap", `DELETE FROM push_subscriptions WHERE id IN (
      SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint <> ? ORDER BY created_at DESC LIMIT -1 OFFSET 9
    )`, ["user", "endpoint"], ["push_subscriptions_user", "sqlite_autoindex_push_subscriptions_1"]],
    ["notifications AC3, AC5, R7: partner devices and localized name", `SELECT s.id, s.endpoint, s.p256dh, s.auth, u.locale,
      (SELECT display_name FROM users WHERE id = ?) AS name
      FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = (SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id <> ?) AND s.journal = 1`,
    ["author", "couple", "author"], ["push_subscriptions_user", "sqlite_autoindex_users_1", "sqlite_autoindex_couple_members_"]],
    ["notifications AC18, R26: logout removal", `DELETE FROM push_subscriptions WHERE endpoint = ?
      AND user_id = (SELECT user_id FROM sessions WHERE token_hash = ?)`, ["endpoint", "token"], ["sqlite_autoindex_push_subscriptions_2", "sqlite_autoindex_sessions_1"]],
    ["notifications AC20, R28: unsubscribe", "DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", ["endpoint", "user"], ["sqlite_autoindex_push_subscriptions_2"]],
    ["notifications R28: expired endpoint", "DELETE FROM push_subscriptions WHERE id = ?", ["id"], ["sqlite_autoindex_push_subscriptions_1"]],
    ["notifications R28: failure count", "UPDATE push_subscriptions SET failures = failures + 1 WHERE id = ?", ["id"], ["sqlite_autoindex_push_subscriptions_1"]],
    ["notifications R28: successful delivery", "UPDATE push_subscriptions SET last_success_at = ?, failures = 0 WHERE id = ?", [100, "id"], ["sqlite_autoindex_push_subscriptions_1"]],
  ] as const)("%s uses indexed searches without sorting", async (_name, sql, binds, indexes) => {
    const plan = (await explain(sql, ...binds)).join("\n");
    expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
    for (const index of indexes) expect(plan).toContain(index);
  });
  it("notifications R2, R27: upsert resolves endpoints through the unique autoindex", async () => {
    const plan = await explain(`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, journal, reminders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET
      id = excluded.id, user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      journal = excluded.journal, reminders = excluded.reminders,
      journal_slot = CASE WHEN user_id = excluded.user_id THEN journal_slot ELSE NULL END,
      reminder_slot = CASE WHEN user_id = excluded.user_id THEN reminder_slot ELSE NULL END,
      created_at = excluded.created_at, failures = 0, last_success_at = NULL`, "id", "user", "endpoint", "p256dh", "auth", 1, 1, 100);
    expect(plan.join("\n")).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
    const index = await env.DB.prepare("PRAGMA index_info(sqlite_autoindex_push_subscriptions_2)").all<{ name: string }>();
    expect(index.results.map((r) => r.name)).toEqual(["endpoint"]);
  });
});

describe("journal query plans", () => {
  it.each([
    {
      name: "journal AC8 (R12): first feed page",
      sql: "SELECT * FROM journal_entries WHERE couple_id = ? ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 21",
      binds: ["couple"],
      indexes: ["journal_entries_feed"],
    },
    {
      name: "journal AC5, AC15 (R13, R21): next feed page, newest first within a day",
      sql: `SELECT * FROM journal_entries WHERE couple_id = ? AND entry_date <= ?
        AND (entry_date < ? OR (entry_date = ? AND (created_at < ? OR (created_at = ? AND id < ?))))
        ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 21`,
      binds: ["couple", "2026-11-06", "2026-11-06", "2026-11-06", 100, 100, "entry"],
      indexes: ["journal_entries_feed"],
    },
    {
      name: "journal AC3 (R5): photos of a page in position order",
      sql: "SELECT id, entry_id FROM photos WHERE entry_id IN (?, ?) ORDER BY entry_id, position",
      binds: ["entry-1", "entry-2"],
      indexes: ["photos_entry"],
    },
    {
      name: "journal AC1, AC12 (R1, R17): attached photo with membership",
      sql: `SELECT p.couple_id FROM photos p JOIN couple_members m ON m.couple_id = p.couple_id
        WHERE p.id = ? AND m.user_id = ? AND (p.entry_id IS NOT NULL OR p.wish_id IS NOT NULL)`,
      binds: ["photo", "user"],
      indexes: ["sqlite_autoindex_photos_1", "sqlite_autoindex_couple_members_"],
    },
    {
      name: "journal AC1 (R1): entry by id with membership",
      sql: `SELECT e.* FROM journal_entries e
        WHERE e.id = ? AND e.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?)`,
      binds: ["entry", "user"],
      indexes: ["sqlite_autoindex_journal_entries_1", "sqlite_autoindex_couple_members_"],
    },
    {
      name: "journal AC12 (R17): pending photo cap",
      sql: "SELECT COUNT(*) FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND wish_id IS NULL",
      binds: ["user"],
      indexes: ["photos_uploader"],
    },
    {
      name: "journal AC10, AC12 (R11, R17): expired or detached photo sweep",
      sql: "SELECT id, couple_id FROM photos WHERE entry_id IS NULL AND wish_id IS NULL AND created_at <= ? LIMIT 500",
      binds: [100],
      indexes: ["photos_pending"],
    },
  ])("$name uses indexed searches without sorting", async ({ sql, binds, indexes }) => {
    const plan = (await explain(sql, ...binds)).join("\n");
    expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
    for (const index of indexes) expect(plan).toContain(index);
  });
});

describe("journal storage", () => {
  beforeEach(resetDb);

  it("journal AC5, AC6, AC15 (R7, R13, R21): pages by descending day, creation time and id without gaps", async () => {
    const { a, couple } = await paired();
    const entries = [
      ["past", "2023-02-12", 300],
      ["lunch", "2026-11-06", 100],
      ["evening-a", "2026-11-06", 200],
      ["evening-b", "2026-11-06", 200],
    ] as const;
    await env.DB.batch(entries.map(([id, day, at]) => env.DB.prepare(
      "INSERT INTO journal_entries (id, couple_id, author_id, entry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(id, couple.id, a.id, day, at, at)));
    const first = await env.DB.prepare(`SELECT id FROM journal_entries WHERE couple_id = ?
      ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 2`).bind(couple.id).all<{ id: string }>();
    expect(first.results.map((row) => row.id)).toEqual(["evening-b", "evening-a"]);
    const next = await env.DB.prepare(`SELECT id FROM journal_entries WHERE couple_id = ? AND entry_date <= ?
      AND (entry_date < ? OR (entry_date = ? AND (created_at < ? OR (created_at = ? AND id < ?))))
      ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 2`)
      .bind(couple.id, "2026-11-06", "2026-11-06", "2026-11-06", 200, 200, "evening-a").all<{ id: string }>();
    expect(next.results.map((row) => row.id)).toEqual(["lunch", "past"]);
  });

  it("journal AC10, AC11 (R11, R15, R17): defaults to partner and detaches photos when their entry is deleted", async () => {
    const { a, couple } = await paired();
    await env.DB.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, created_at, updated_at)
      VALUES ('entry', ?, ?, '2026-11-06', 100, 100)`).bind(couple.id, a.id).run();
    expect(await env.DB.prepare("SELECT body, source FROM journal_entries WHERE id = 'entry'").first())
      .toEqual({ body: "", source: "partner" });
    await env.DB.prepare(`INSERT INTO photos (id, couple_id, uploader_id, entry_id, position, created_at)
      VALUES ('photo', ?, ?, 'entry', 0, 100)`).bind(couple.id, a.id).run();
    await env.DB.prepare("DELETE FROM journal_entries WHERE id = 'entry'").run();
    expect(await env.DB.prepare("SELECT entry_id FROM photos WHERE id = 'photo'").first("entry_id")).toBeNull();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(1);
    await env.DB.prepare("DELETE FROM couples WHERE id = ?").bind(couple.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(0);
  });

  it("journal AC3 (R5): rejects photo positions outside the four slots and nonexistent parents", async () => {
    const { a, couple } = await paired();
    const insert = env.DB.prepare("INSERT INTO photos (id, couple_id, uploader_id, position, created_at) VALUES (?, ?, ?, ?, 100)");
    for (const position of [-1, 4]) {
      await expect(insert.bind(`photo-${position}`, couple.id, a.id, position).run()).rejects.toThrow("CHECK constraint failed");
    }
    await expect(insert.bind("orphan", "missing", a.id, null).run()).rejects.toThrow("FOREIGN KEY constraint failed");
  });

  it("journal AC12 (R17): supplies a local PHOTOS binding for both renditions", async () => {
    const key = "couples/test/photos/test/full";
    await env.PHOTOS.put(key, "photo fixture", { httpMetadata: { contentType: "image/jpeg" } });
    const object = await env.PHOTOS.get(key);
    expect(await object?.text()).toBe("photo fixture");
    expect(object?.httpMetadata?.contentType).toBe("image/jpeg");
    await env.PHOTOS.delete(key);
  });
});

describe("photo test fixtures", () => {
  it("journal AC12, AC13 (R16, R18): JPEG headers encode dimensions and optional APP1 metadata", () => {
    const clean = jpeg({ width: 300, height: 479 });
    expect(Array.from(clean.slice(0, 11))).toEqual([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 1, 223, 1, 44]);
    const metadata = jpeg({ width: 300, height: 479, exif: true });
    expect(Array.from(metadata.slice(2, 12))).toEqual([0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0]);
    expect(metadata.slice(12)).toEqual(clean.slice(2));
  });

  it.each([
    ["VP8", [16, 0, 0, 157, 1, 42, 44, 1, 223, 1]],
    ["VP8L", [47, 43, 129, 119, 0]],
    ["VP8X", [0, 0, 0, 0, 43, 1, 0, 222, 1, 0]],
  ] as const)("journal AC12, AC13 (R16, R18): %s headers encode dimensions and optional EXIF chunks", (kind, header) => {
    const clean = webp({ width: 300, height: 479, kind });
    expect(new TextDecoder().decode(clean.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(clean.slice(8, 16))).toBe(`WEBP${kind.padEnd(4)}`);
    expect(new DataView(clean.buffer).getUint32(4, true)).toBe(clean.length - 8);
    expect(new DataView(clean.buffer).getUint32(16, true)).toBe(header.length);
    expect(Array.from(clean.slice(20, 20 + header.length))).toEqual(header);
    expect(clean.length % 2).toBe(0);
    const metadata = webp({ width: 300, height: 479, kind, exif: true });
    expect(new TextDecoder().decode(metadata.slice(clean.length, clean.length + 4))).toBe("EXIF");
    expect(new DataView(metadata.buffer).getUint32(4, true)).toBe(metadata.length - 8);
  });

  it("journal AC12, AC13 (R16, R18): sends both multipart files with their bytes and content types intact", async () => {
    const full = jpeg({ width: 1440, height: 1440 });
    const thumb = webp({ width: 480, height: 480, kind: "VP8L" });
    vi.spyOn(worker, "fetch").mockImplementationOnce(async (req) => {
      expect(req.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
      const form = await req.formData();
      for (const [size, bytes, type] of [["full", full, "image/jpeg"], ["thumb", thumb, "image/webp"]] as const) {
        const part = form.get(size);
        expect(part).toBeInstanceOf(File);
        const file = part as File;
        expect(file.type).toBe(type);
        expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
      }
      return new Response(null, { status: 201 });
    });
    expect((await call("POST", "/api/photos", { form: photoForm(full, thumb, { thumb: "image/webp" }) })).status).toBe(201);
  });
});


describe("wish query plans", () => {
  it.each([
    ["wishes AC1 (R1): paired membership", `SELECT m.couple_id, (SELECT x.user_id FROM couple_members x WHERE x.couple_id = m.couple_id AND x.user_id != m.user_id) AS partner_id FROM couple_members m WHERE m.user_id = ?`, ["user"]],
    ["wishes AC1 (R2): owner list", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.owner_id = ? AND w.couple_id = ? AND w.status = ? ORDER BY w.created_at DESC, w.id DESC`, ["user", "couple", "open"]],
    ["wishes AC1 (R2): owner wish", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.id = ? AND w.owner_id = ?`, ["wish", "user"]],
    ["wishes AC9 (R16): deleted claim notice", `UPDATE wish_claims SET gone_title = (SELECT title FROM wishes WHERE id = ?1), gone_at = ?2, wish_id = NULL WHERE wish_id = ?1 AND (SELECT status FROM wishes WHERE id = ?1) = 'open'`, ["wish", 100]],
    ["wishes AC9 (R22): delete a received claim", `DELETE FROM wish_claims WHERE wish_id = ?`, ["wish"]],
    ["wishes AC3 (R7-R9): spin candidates", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.owner_id = ? AND w.couple_id = ? AND w.status = 'open' AND (w.price IS NULL OR w.price <= ?) AND NOT EXISTS (SELECT 1 FROM wish_claims c WHERE c.wish_id = w.id)`, ["user", "couple", 500000]],
    ["wishes AC8 (R15): claims", `SELECT c.*, w.title, p.id FROM wish_claims c LEFT JOIN wishes w ON w.id = c.wish_id LEFT JOIN photos p ON p.wish_id = w.id WHERE c.claimer_id = ? ORDER BY c.created_at DESC`, ["user"]],
    ["wishes AC9 (R16): acknowledge notice", `DELETE FROM wish_claims WHERE id = ? AND claimer_id = ? AND wish_id IS NULL`, ["claim", "user"]],
    ["wishes AC9 (R23): expire unread notice", `DELETE FROM wish_claims WHERE wish_id IS NULL AND gone_at <= ?`, [100]],
    ["wishes AC7 (R8, R12, R13): claim an open wish", `INSERT INTO wish_claims (id, wish_id, claimer_id, created_at) SELECT ?, w.id, ?, ? FROM wishes w WHERE w.id = ? AND w.owner_id = ? AND w.couple_id = ? AND w.status = 'open'`, ["claim", "user", 100, "wish", "owner", "couple"]],
    ["wishes AC8 (R15): release", `DELETE FROM wish_claims WHERE id = ? AND claimer_id = ? AND EXISTS (SELECT 1 FROM wishes w WHERE w.id = wish_claims.wish_id AND w.status = 'open')`, ["claim", "user"]],
    ["wishes AC5 (R11): spin quota", `SELECT COUNT(*), MIN(created_at) FROM wish_spins WHERE user_id = ?`, ["user"]],
    ["wishes AC10 (R24): remove old spins", `DELETE FROM wish_spins WHERE created_at <= ?`, [100]],
    ["wishes AC12 (R20): receipt journal insert", `INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, source, created_at, updated_at) SELECT ?, couple_id, owner_id, ?, ?, 'wish', ?, ? FROM wishes WHERE id = ? AND owner_id = ? AND status = 'open'`, ["entry", "2023-02-12", "Received: Scarf", 100, 100, "wish", "user"]],
    ["wishes AC11 (R19): receipt status", `UPDATE wishes SET status = 'received', received_on = ?, note = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'open' AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) = ?`, ["2023-02-12", "", 100, "wish", "user", "entry", 0]],
    ["wishes AC12 (R20): failed attachment rollback", `DELETE FROM journal_entries WHERE id = ? AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) != ?`, ["entry", "entry", 1]],
    ["wishes AC13 (R6): detach photo", `UPDATE photos SET wish_id = NULL, created_at = 0 WHERE wish_id = ? RETURNING id, couple_id`, ["wish"]],
  ])("%s uses indexed searches", async (_name, sql, binds) => {
    const plan = (await explain(sql as string, ...binds)).join("\n");
    expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});


describe("notes query plans", () => {
  it.each([
    ["writer list", WRITTEN_NOTES_SQL, ["writer", "couple"]],
    ["recipient list", RECEIVED_NOTES_SQL, ["recipient", "couple"]],
    ["writer ownership", "SELECT * FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL", ["note", "writer", "couple"]],
    ["save before open", "UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ? WHERE id = ? AND writer_id = ? AND couple_id = ? AND opened_at IS NULL RETURNING *", ["h", "f", "n", "r", 1, "note", "writer", "couple"]],
    ["send after cooling", "UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ?, sent_at = ?, notified_at = ? WHERE id = ? AND writer_id = ? AND couple_id = ? AND sent_at IS NULL AND created_at <= ? RETURNING *", ["h", "f", "n", "r", 1, 1, 1, "note", "writer", "couple", 1]],
    ["withdraw conflict", "SELECT opened_at FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL", ["note", "writer", "couple"]],
    ["create", "INSERT INTO notes (id, couple_id, writer_id, recipient_id, happened, feel, need, hope, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *", ["id", "couple", "writer", "recipient", "h", "f", "n", "r", 1, 1]],
  ])("%s uses indexed lookups without table scans or temporary sorting", async (_name, sql, binds) => {
    const plan = (await explain(sql as string, ...binds)).join("\n");
    expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});

describe("notes recipient and joined feed query plans", () => {
  it.each([
    ["open", OPEN_NOTE_SQL, [1, "note", "recipient", "couple"]],
    ["close", CLOSE_NOTE_SQL, ["try", "", 1, 1, "note", "recipient", "couple"]],
    ["close insert", CLOSE_ENTRY_SQL, ["entry", "2026-11-13", 1, 1, "note", "recipient", "couple", "note"]],
    ["invalid close visibility", "SELECT id FROM notes WHERE id = ? AND recipient_id = ? AND couple_id = ? AND opened_at IS NOT NULL AND closed_at IS NULL", ["note", "recipient", "couple"]],
    ["note join feed", `SELECT e.*, n.recipient_id, n.happened, n.feel, n.need, n.hope, n.pick, n.line FROM journal_entries e LEFT JOIN notes n ON n.id = e.note_id WHERE e.couple_id = ? ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT ?`, ["couple", 21]],
    ["note join next page", `SELECT e.*, n.recipient_id, n.happened, n.feel, n.need, n.hope, n.pick, n.line FROM journal_entries e LEFT JOIN notes n ON n.id = e.note_id WHERE e.couple_id = ? AND e.entry_date <= ? AND (e.entry_date < ? OR (e.entry_date = ? AND (e.created_at < ? OR (e.created_at = ? AND e.id < ?)))) ORDER BY e.entry_date DESC, e.created_at DESC, e.id DESC LIMIT ?`, ["couple", "2026-11-13", "2026-11-13", "2026-11-13", 1, 1, "entry", 21]],
    ["joined find entry", `SELECT e.*, n.recipient_id, n.happened, n.feel, n.need, n.hope, n.pick, n.line FROM journal_entries e LEFT JOIN notes n ON n.id = e.note_id WHERE e.id = ? AND e.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?)`, ["entry", "user"]],
    ["night release excludes notes", "SELECT couple_id, author_id FROM journal_entries WHERE created_at >= ? AND created_at < ? AND note_id IS NULL", [1, 2]],
  ])("%s uses indexed lookups without scans or temporary sorting", async (_name, sql, binds) => {
    expect((await explain(sql as string, ...binds)).join("\n")).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});

describe("notes push query plans", () => {
  it.each([
    ["held", RELEASE_NOTES_SQL, [1, 1], "notes_held"],
    ["unopened", REMIND_NOTES_SQL, [1, 1], "notes_unopened"],
    ["recipient devices", `SELECT s.id, s.endpoint, s.p256dh, s.auth, u.locale, (SELECT display_name FROM users WHERE id = ?) AS name FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? AND s.journal = 1`, ["writer", "recipient"], "push_subscriptions_user"],
    ["send claims immediate push", "UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ?, sent_at = ?, notified_at = ? WHERE id = ? AND writer_id = ? AND couple_id = ? AND sent_at IS NULL AND created_at <= ? RETURNING *", ["h", "f", "n", "r", 1, 1, 1, "note", "writer", "couple", 1], "sqlite_autoindex_notes_1"],
  ])("%s uses indexed SEARCH", async (_name, sql, binds, index) => {
    const plan = (await explain(sql as string, ...(binds as unknown[]))).join("\n");
    expect(plan).toContain(index); expect(plan).toContain("SEARCH"); expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});

describe("closed-note edit and delete query plans", () => {
  it.each([
    ["closed edit", UPDATE_CLOSED_NOTE_SQL, ["h", "f", "n", "r", "try", "", 1, "note", "couple"]],
    ["entry day", "UPDATE journal_entries SET entry_date = ?, updated_at = ? WHERE note_id = ? AND couple_id = ?", ["2026-11-13", 1, "note", "couple"]],
    ["entry lookup", "SELECT id FROM journal_entries WHERE note_id = ? AND couple_id = ?", ["note", "couple"]],
    ["closed visibility", "SELECT id FROM notes WHERE id = ? AND couple_id = ? AND closed_at IS NOT NULL", ["note", "couple"]],
    ["delete note cascades entry", "DELETE FROM notes WHERE id = ? AND couple_id = ? AND ((writer_id = ? AND opened_at IS NULL) OR closed_at IS NOT NULL)", ["note", "couple", "writer"]],
  ])("%s uses indexed lookups without scans or temporary sorting", async (_name, sql, binds) => {
    expect((await explain(sql as string, ...binds)).join("\n")).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});
