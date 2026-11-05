import { Hono } from "hono";
import { FEED_PAGE_SIZE } from "../../shared/journal";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { entriesWithPhotos, entryCursor, findEntry, readCursor, validateEntry, type EntryRow } from "../lib/journal";
import { PENDING_PHOTO_TTL } from "../lib/time";
import { purgePhotos } from "../lib/photos";

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

journal.put("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const userId = c.get("user").id;
  const current = await findEntry(db, id, userId);
  if (!current) return c.json({ error: "not_found" }, 404);
  if (current.author_id !== userId) return c.json({ error: "not_author" }, 403);
  const now = Date.now();
  const parsed = validateEntry(await c.req.json().catch(() => null), now);
  if ("error" in parsed) return c.json(parsed, 400);
  const { date, text, photoIds } = parsed.input;
  if (photoIds.length) {
    const { results } = await db.prepare(`SELECT id FROM photos WHERE id IN (${photoIds.map(() => "?").join(",")})
      AND couple_id = ? AND (entry_id = ? OR (entry_id IS NULL AND uploader_id = ? AND created_at > ?))`)
      .bind(...photoIds, current.couple_id, id, userId, now - PENDING_PHOTO_TTL).all();
    if (results.length !== photoIds.length) return c.json({ error: "photo_invalid" }, 400);
  }
  const { results: previousPhotos } = await db.prepare("SELECT id, couple_id FROM photos WHERE entry_id = ?")
    .bind(id).all<{ id: string; couple_id: string }>();
  const removed = previousPhotos.filter((photo) => !photoIds.includes(photo.id));
  const keep = photoIds.length ? ` AND id NOT IN (${photoIds.map(() => "?").join(",")})` : "";
  const [updated] = await db.batch([
    db.prepare("UPDATE journal_entries SET entry_date = ?, body = ?, updated_at = ? WHERE id = ? AND author_id = ?")
      .bind(date, text, now, id, userId),
    db.prepare(`UPDATE photos SET entry_id = NULL, position = NULL, created_at = 0 WHERE entry_id = ?${keep}`)
      .bind(id, ...photoIds),
    ...photoIds.map((photoId, position) => db.prepare(`UPDATE photos SET entry_id = ?, position = ?
      WHERE id = ? AND (entry_id = ? OR (entry_id IS NULL AND uploader_id = ? AND created_at > ?))
      AND EXISTS (SELECT 1 FROM journal_entries WHERE id = ? AND author_id = ?)`)
      .bind(id, position, photoId, id, userId, now - PENDING_PHOTO_TTL, id, userId)),
  ]);
  if (!updated?.meta.changes) return c.json({ error: "not_found" }, 404);
  await purgePhotos(c.env, removed);
  const row = await findEntry(db, id, userId);
  if (!row) return c.json({ error: "not_found" }, 404);
  // shortcut: a raced photo attach returns the stored subset, upgrade if users report missing photos.
  const [entry] = await entriesWithPhotos(db, [row]);
  return c.json({ entry });
});

journal.delete("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const userId = c.get("user").id;
  const current = await findEntry(db, id, userId);
  if (!current) return c.json({ error: "not_found" }, 404);
  if (current.author_id !== userId) return c.json({ error: "not_author" }, 403);
  const { results: photos } = await db.prepare("SELECT id, couple_id FROM photos WHERE entry_id = ?")
    .bind(id).all<{ id: string; couple_id: string }>();
  await db.batch([
    db.prepare("UPDATE photos SET entry_id = NULL, position = NULL, created_at = 0 WHERE entry_id = ?").bind(id),
    db.prepare("DELETE FROM journal_entries WHERE id = ? AND author_id = ?").bind(id, userId),
  ]);
  await purgePhotos(c.env, photos);
  return c.json({ ok: true });
});
