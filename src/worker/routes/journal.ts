import { Hono } from "hono";
import { FEED_PAGE_SIZE } from "../../shared/journal";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { entriesWithPhotos, entryCursor, findEntry, readCursor, validateEntry, type EntryRow } from "../lib/journal";
import { PENDING_PHOTO_TTL } from "../lib/time";

export const journal = new Hono<AppEnv & { Variables: { journalCoupleId: string } }>();

journal.use("*", async (c, next) => {
  const mine = await findMembership(c.env.DB, c.get("user").id);
  if (mine?.memberCount !== 2) return c.json({ error: "not_in_couple" }, 404);
  c.set("journalCoupleId", mine.coupleId);
  await next();
});

journal.get("/", async (c) => {
  const rawCursor = c.req.query("cursor");
  const cursor = rawCursor === undefined ? null : readCursor(rawCursor);
  if (rawCursor !== undefined && !cursor) return c.json({ error: "invalid_body" }, 400);
  const db = c.env.DB;
  const coupleId = c.get("journalCoupleId");
  const query = cursor
    ? db.prepare(`SELECT * FROM journal_entries WHERE couple_id = ? AND entry_date <= ?
        AND (entry_date < ? OR (entry_date = ? AND (created_at < ? OR (created_at = ? AND id < ?))))
        ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT ?`)
      .bind(coupleId, cursor[0], cursor[0], cursor[0], cursor[1], cursor[1], cursor[2], FEED_PAGE_SIZE + 1)
    : db.prepare(`SELECT * FROM journal_entries WHERE couple_id = ?
        ORDER BY entry_date DESC, created_at DESC, id DESC LIMIT ?`).bind(coupleId, FEED_PAGE_SIZE + 1);
  const { results } = await query.all<EntryRow>();
  const rows = results.slice(0, FEED_PAGE_SIZE);
  return c.json({
    entries: await entriesWithPhotos(db, rows),
    nextCursor: results.length > FEED_PAGE_SIZE ? entryCursor(rows[rows.length - 1]!) : null,
  });
});

journal.post("/", async (c) => {
  const now = Date.now();
  const parsed = validateEntry(await c.req.json().catch(() => null), now);
  if ("error" in parsed) return c.json(parsed, 400);
  const { date, text, photoIds } = parsed.input;
  const db = c.env.DB;
  const userId = c.get("user").id;
  const coupleId = c.get("journalCoupleId");
  if (photoIds.length) {
    const { results } = await db.prepare(`SELECT id FROM photos WHERE id IN (${photoIds.map(() => "?").join(",")})
      AND uploader_id = ? AND couple_id = ? AND entry_id IS NULL AND created_at > ?`)
      .bind(...photoIds, userId, coupleId, now - PENDING_PHOTO_TTL).all();
    if (results.length !== photoIds.length) return c.json({ error: "photo_invalid" }, 400);
  }
  const id = crypto.randomUUID();
  const changes = await db.batch([
    db.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, coupleId, userId, date, text, now, now),
    ...photoIds.map((photoId, position) => db.prepare(`UPDATE photos SET entry_id = ?, position = ?
      WHERE id = ? AND entry_id IS NULL AND uploader_id = ? AND created_at > ?`)
      .bind(id, position, photoId, userId, now - PENDING_PHOTO_TTL)),
  ]);
  if (changes.slice(1).some((result) => result.meta.changes === 0)) {
    await db.prepare("DELETE FROM journal_entries WHERE id = ? AND author_id = ?").bind(id, userId).run();
    return c.json({ error: "photo_invalid" }, 400);
  }
  const row = await findEntry(db, id, userId);
  const [entry] = await entriesWithPhotos(db, [row!]);
  return c.json({ entry }, 201);
});
