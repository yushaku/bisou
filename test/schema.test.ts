import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { call, explain, jpeg, paired, photoForm, resetDb, webp } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("journal query plans", () => {
  it.each([
    {
      name: "AC8 (R12): first feed page",
      sql: "SELECT * FROM journal_entries WHERE couple_id = ? ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 21",
      binds: ["couple"],
      indexes: ["journal_entries_feed"],
    },
    {
      name: "AC5, AC15 (R13, R21): next feed page, newest first within a day",
      sql: `SELECT * FROM journal_entries WHERE couple_id = ? AND entry_date <= ?
        AND (entry_date < ? OR (entry_date = ? AND (created_at < ? OR (created_at = ? AND id < ?))))
        ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT 21`,
      binds: ["couple", "2026-11-06", "2026-11-06", "2026-11-06", 100, 100, "entry"],
      indexes: ["journal_entries_feed"],
    },
    {
      name: "AC3 (R5): photos of a page in position order",
      sql: "SELECT id, entry_id FROM photos WHERE entry_id IN (?, ?) ORDER BY entry_id, position",
      binds: ["entry-1", "entry-2"],
      indexes: ["photos_entry"],
    },
    {
      name: "AC1, AC12 (R1, R17): attached photo with membership",
      sql: `SELECT p.couple_id FROM photos p JOIN couple_members m ON m.couple_id = p.couple_id
        WHERE p.id = ? AND m.user_id = ? AND (p.entry_id IS NOT NULL OR p.wish_id IS NOT NULL)`,
      binds: ["photo", "user"],
      indexes: ["sqlite_autoindex_photos_1", "sqlite_autoindex_couple_members_"],
    },
    {
      name: "AC1 (R1): entry by id with membership",
      sql: `SELECT e.* FROM journal_entries e
        WHERE e.id = ? AND e.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?)`,
      binds: ["entry", "user"],
      indexes: ["sqlite_autoindex_journal_entries_1", "sqlite_autoindex_couple_members_"],
    },
    {
      name: "AC12 (R17): pending photo cap",
      sql: "SELECT COUNT(*) FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND wish_id IS NULL",
      binds: ["user"],
      indexes: ["photos_uploader"],
    },
    {
      name: "AC10, AC12 (R11, R17): expired or detached photo sweep",
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

  it("AC5, AC6, AC15 (R7, R13, R21): pages by descending day, creation time and id without gaps", async () => {
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

  it("AC10, AC11 (R11, R15, R17): defaults to partner and detaches photos when their entry is deleted", async () => {
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

  it("AC3 (R5): rejects photo positions outside the four slots and nonexistent parents", async () => {
    const { a, couple } = await paired();
    const insert = env.DB.prepare("INSERT INTO photos (id, couple_id, uploader_id, position, created_at) VALUES (?, ?, ?, ?, 100)");
    for (const position of [-1, 4]) {
      await expect(insert.bind(`photo-${position}`, couple.id, a.id, position).run()).rejects.toThrow("CHECK constraint failed");
    }
    await expect(insert.bind("orphan", "missing", a.id, null).run()).rejects.toThrow("FOREIGN KEY constraint failed");
  });

  it("AC12 (R17): supplies a local PHOTOS binding for both renditions", async () => {
    const key = "couples/test/photos/test/full";
    await env.PHOTOS.put(key, "photo fixture", { httpMetadata: { contentType: "image/jpeg" } });
    const object = await env.PHOTOS.get(key);
    expect(await object?.text()).toBe("photo fixture");
    expect(object?.httpMetadata?.contentType).toBe("image/jpeg");
    await env.PHOTOS.delete(key);
  });
});

describe("photo test fixtures", () => {
  it("AC12, AC13 (R16, R18): JPEG headers encode dimensions and optional APP1 metadata", () => {
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
  ] as const)("AC12, AC13 (R16, R18): %s headers encode dimensions and optional EXIF chunks", (kind, header) => {
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

  it("AC12, AC13 (R16, R18): sends both multipart files with their bytes and content types intact", async () => {
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
    ["AC1 (R1): paired membership", `SELECT m.couple_id, (SELECT x.user_id FROM couple_members x WHERE x.couple_id = m.couple_id AND x.user_id != m.user_id) AS partner_id FROM couple_members m WHERE m.user_id = ?`, ["user"]],
    ["AC1 (R2): owner list", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.owner_id = ? AND w.couple_id = ? AND w.status = ? ORDER BY w.created_at DESC, w.id DESC`, ["user", "couple", "open"]],
    ["AC1 (R2): owner wish", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.id = ? AND w.owner_id = ?`, ["wish", "user"]],
    ["AC9 (R16): deleted claim notice", `UPDATE wish_claims SET gone_title = (SELECT title FROM wishes WHERE id = ?1), gone_at = ?2, wish_id = NULL WHERE wish_id = ?1`, ["wish", 100]],
    ["AC3 (R7-R9): spin candidates", `SELECT w.*, p.id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id WHERE w.owner_id = ? AND w.couple_id = ? AND w.status = 'open' AND w.price IS NOT NULL AND w.price <= ? AND NOT EXISTS (SELECT 1 FROM wish_claims c WHERE c.wish_id = w.id)`, ["user", "couple", 500000]],
    ["AC8 (R15): claims", `SELECT c.*, w.title, p.id FROM wish_claims c LEFT JOIN wishes w ON w.id = c.wish_id LEFT JOIN photos p ON p.wish_id = w.id WHERE c.claimer_id = ? ORDER BY c.created_at DESC`, ["user"]],
    ["AC9 (R16): acknowledge notice", `DELETE FROM wish_claims WHERE id = ? AND claimer_id = ? AND wish_id IS NULL`, ["claim", "user"]],
    ["AC9 (R23): expire unread notice", `DELETE FROM wish_claims WHERE wish_id IS NULL AND gone_at <= ?`, [100]],
    ["AC7 (R8, R12, R13): claim a priced wish", `INSERT INTO wish_claims (id, wish_id, claimer_id, created_at) SELECT ?, w.id, ?, ? FROM wishes w WHERE w.id = ? AND w.owner_id = ? AND w.couple_id = ? AND w.status = 'open' AND w.price IS NOT NULL`, ["claim", "user", 100, "wish", "owner", "couple"]],
    ["AC8 (R15): release", `DELETE FROM wish_claims WHERE id = ? AND claimer_id = ? AND EXISTS (SELECT 1 FROM wishes w WHERE w.id = wish_claims.wish_id AND w.status = 'open')`, ["claim", "user"]],
    ["AC5 (R11): spin quota", `SELECT COUNT(*), MIN(created_at) FROM wish_spins WHERE user_id = ?`, ["user"]],
    ["AC10 (R24): remove old spins", `DELETE FROM wish_spins WHERE created_at <= ?`, [100]],
    ["AC12 (R20): receipt journal insert", `INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, source, created_at, updated_at) SELECT ?, couple_id, owner_id, ?, ?, 'wish', ?, ? FROM wishes WHERE id = ? AND owner_id = ? AND status = 'open'`, ["entry", "2023-02-12", "Received: Scarf", 100, 100, "wish", "user"]],
    ["AC11 (R19): receipt status", `UPDATE wishes SET status = 'received', received_on = ?, note = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'open' AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) = ?`, ["2023-02-12", "", 100, "wish", "user", "entry", 0]],
    ["AC12 (R20): failed attachment rollback", `DELETE FROM journal_entries WHERE id = ? AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) != ?`, ["entry", "entry", 1]],
    ["AC13 (R6): detach photo", `UPDATE photos SET wish_id = NULL, created_at = 0 WHERE wish_id = ? RETURNING id, couple_id`, ["wish"]],
  ])("%s uses indexed searches", async (_name, sql, binds) => {
    const plan = (await explain(sql as string, ...binds)).join("\n");
    expect(plan).not.toMatch(/\bSCAN\b|TEMP B-TREE/);
  });
});
