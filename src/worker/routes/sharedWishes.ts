import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../env";
import { defined, isRecord } from "../../shared/guards";
import { doneTogetherText, validateWish } from "../../shared/wishes";
import { isLocale } from "../../shared/types";
import { entriesWithPhotos, findEntry, validateEntry } from "../lib/journal";
import { notifyJournal } from "../lib/notify";
import { findSharedWish, SHARED_WISH_SELECT, toSharedWish, type SharedWishRow } from "../lib/sharedWishes";
import { purgePhotos } from "../lib/photos";
import { PENDING_PHOTO_TTL } from "../lib/time";

type SharedEnv = AppEnv & { Variables: { sharedCoupleId: string } };
export const sharedWishes = new Hono<SharedEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });

// Access is by couple membership; an unpaired caller has no jar to see.
sharedWishes.use("*", async (c, next) => {
  const mine = await c.env.DB.prepare(
    `SELECT m.couple_id,
    (SELECT x.user_id FROM couple_members x WHERE x.couple_id = m.couple_id AND x.user_id != m.user_id) AS partner_id
    FROM couple_members m WHERE m.user_id = ?`,
  )
    .bind(c.get("user").id)
    .first<{ couple_id: string; partner_id: string | null }>();
  if (!mine?.partner_id) return c.json({ error: "not_in_couple" }, 404);
  c.set("sharedCoupleId", mine.couple_id);
  await next();
});

sharedWishes.get("/", async (c) => {
  const lists = await c.env.DB.batch<SharedWishRow>(
    // A done wish is never edited, so its updated_at is the moment it was marked done.
    [
      ["open", "w.created_at"],
      ["done", "w.updated_at"],
    ].map(([status, order]) =>
      c.env.DB.prepare(
        `${SHARED_WISH_SELECT} WHERE w.couple_id = ? AND w.status = ? ORDER BY ${order} DESC, w.id DESC`,
      ).bind(c.get("sharedCoupleId"), status),
    ),
  );
  return c.json({
    open: defined(lists[0]).results.map(toSharedWish),
    done: defined(lists[1]).results.map(toSharedWish),
  });
});

// Keeping the photo already attached needs no ownership; attaching a pending upload needs its uploader.
// The same predicate guards every write in the batch, including a racing expiry or attachment.
const validPhoto = `(? IS NULL OR EXISTS (SELECT 1 FROM photos WHERE id = ? AND couple_id = ?
  AND entry_id IS NULL AND wish_id IS NULL
  AND ((shared_wish_id IS NULL AND uploader_id = ? AND created_at > ?) OR shared_wish_id = ?)))`;

const saveSharedWish: Handler<SharedEnv> = async (c) => {
  const updating = c.req.method === "PUT";
  const db = c.env.DB;
  const user = c.get("user").id;
  const couple = c.get("sharedCoupleId");
  const id = updating ? c.req.param("id") : crypto.randomUUID();
  if (!id) return c.json({ error: "not_found" }, 404);
  const current = updating ? await findSharedWish(db, id, couple) : null;
  if (updating && !current) return c.json({ error: "not_found" }, 404);
  if (current?.status === "done") return c.json({ error: "shared_wish_done" }, 409);
  const parsed = validateWish(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json(parsed, 400);
  const { title, price, link, photoId } = parsed.input;
  const now = Date.now();
  const cutoff = now - PENDING_PHOTO_TTL;
  const photoBinds = [photoId, photoId, couple, user, cutoff, id];
  const saved = updating
    ? db
        .prepare(
          `UPDATE shared_wishes SET title = ?, price = ?, link = ?, updated_at = ?
        WHERE id = ? AND couple_id = ? AND status = 'open' AND ${validPhoto}`,
        )
        .bind(title, price, link, now, id, couple, ...photoBinds)
    : db
        .prepare(
          `INSERT INTO shared_wishes (id, couple_id, creator_id, title, price, link, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${validPhoto}`,
        )
        .bind(id, couple, user, title, price, link, now, now, ...photoBinds);
  const [write, detached] = await db.batch([
    saved,
    db
      .prepare(
        `UPDATE photos SET shared_wish_id = NULL, created_at = 0 WHERE shared_wish_id = ? AND id IS NOT ?
      AND EXISTS (SELECT 1 FROM shared_wishes WHERE id = ? AND couple_id = ? AND status = 'open')
      AND ${validPhoto} RETURNING id, couple_id`,
      )
      .bind(id, photoId, id, couple, ...photoBinds),
    db
      .prepare(
        `UPDATE photos SET shared_wish_id = ? WHERE id = ? AND entry_id IS NULL AND wish_id IS NULL
      AND shared_wish_id IS NULL AND uploader_id = ? AND couple_id = ? AND created_at > ?
      AND EXISTS (SELECT 1 FROM shared_wishes WHERE id = ? AND couple_id = ? AND status = 'open')`,
      )
      .bind(id, photoId, user, couple, cutoff, id, couple),
  ]);
  if (!defined(write).meta.changes) {
    const latest = updating ? await findSharedWish(db, id, couple) : null;
    if (updating && !latest) return c.json({ error: "not_found" }, 404);
    if (latest?.status === "done") return c.json({ error: "shared_wish_done" }, 409);
    return c.json({ error: "photo_invalid" }, 400);
  }
  await purgePhotos(c.env, defined(detached).results as { id: string; couple_id: string }[]);
  const row = await findSharedWish(db, id, couple);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ wish: toSharedWish(row) }, updating ? 200 : 201);
};
sharedWishes.post("/", limitBody, saveSharedWish);
sharedWishes.put("/:id", limitBody, saveSharedWish);

sharedWishes.delete("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const couple = c.get("sharedCoupleId");
  if (!(await findSharedWish(db, id, couple))) return c.json({ error: "not_found" }, 404);
  const [detached] = await db.batch([
    db
      .prepare(
        "UPDATE photos SET shared_wish_id = NULL, created_at = 0 WHERE shared_wish_id = ? RETURNING id, couple_id",
      )
      .bind(id),
    db.prepare("DELETE FROM shared_wishes WHERE id = ? AND couple_id = ?").bind(id, couple),
  ]);
  await purgePhotos(c.env, defined(detached).results as { id: string; couple_id: string }[]);
  return c.json({ ok: true });
});

// Done reuses the private receipt: one batch makes the entry, attaches the caller's photos and marks the wish done
// only if every photo attached; either partner may mark it, and the first batch to run wins. The batch only runs
// against the title its text was built from; a partner who renames the wish meanwhile makes it read the wish again.
sharedWishes.post("/:id/done", limitBody, async (c) => {
  const db = c.env.DB;
  const user = c.get("user").id;
  const couple = c.get("sharedCoupleId");
  const id = c.req.param("id");
  const body: unknown = await c.req.json().catch(() => null);
  const first = await findSharedWish(db, id, couple);
  if (!first) return c.json({ error: "not_found" }, 404);
  if (first.status === "done") return c.json({ error: "shared_wish_done" }, 409);
  if (!isRecord(body) || typeof body.note !== "string") return c.json({ error: "invalid_body" }, 400);
  const note = body.note.trim();
  const locale = isLocale(body.locale) ? body.locale : c.get("user").locale;
  const now = Date.now();
  const cutoff = now - PENDING_PHOTO_TTL;
  const photoIds = Array.isArray(body.photoIds) ? (body.photoIds as unknown[]) : [];
  const entryId = crypto.randomUUID();
  let current: SharedWishRow = first;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parsed = validateEntry(
      { date: body.date, photoIds: body.photoIds, text: doneTogetherText(locale, current.title, note) },
      now,
    );
    if ("error" in parsed) return c.json(parsed, 400);
    const { date, text } = parsed.input;
    if (attempt === 0 && photoIds.length) {
      const { results } = await db
        .prepare(
          `SELECT id FROM photos WHERE id IN (${photoIds.map(() => "?").join(",")})
      AND uploader_id = ? AND couple_id = ? AND entry_id IS NULL AND wish_id IS NULL AND shared_wish_id IS NULL
      AND created_at > ?`,
        )
        .bind(...photoIds, user, couple, cutoff)
        .all();
      if (results.length !== photoIds.length) return c.json({ error: "photo_invalid" }, 400);
    }
    const changes = await db.batch([
      db
        .prepare(
          `INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, created_at, updated_at)
      SELECT ?, couple_id, ?, ?, ?, ?, ? FROM shared_wishes
      WHERE id = ? AND couple_id = ? AND status = 'open' AND title = ?`,
        )
        .bind(entryId, user, date, text, now, now, id, couple, current.title),
      ...photoIds.map((photoId, position) =>
        db
          .prepare(
            `UPDATE photos SET entry_id = ?, position = ?
      WHERE id = ? AND entry_id IS NULL AND wish_id IS NULL AND shared_wish_id IS NULL
      AND uploader_id = ? AND couple_id = ? AND created_at > ?
      AND EXISTS (SELECT 1 FROM journal_entries WHERE id = ?)`,
          )
          .bind(entryId, position, photoId, user, couple, cutoff, entryId),
      ),
      db
        .prepare(
          `UPDATE shared_wishes SET status = 'done', done_on = ?, note = ?, updated_at = ?
      WHERE id = ? AND couple_id = ? AND status = 'open' AND title = ?
      AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) = ?`,
        )
        .bind(date, note, now, id, couple, current.title, entryId, photoIds.length),
      // The wish as this batch left it, photo included: the answer must not be a copy read before the batch.
      db.prepare(`${SHARED_WISH_SELECT} WHERE w.id = ? AND w.couple_id = ? AND w.status = 'done'`).bind(id, couple),
      // A failed attachment leaves no partial entry, even if the Worker stops after this batch.
      db
        .prepare(`DELETE FROM journal_entries WHERE id = ? AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) != ?`)
        .bind(entryId, entryId, photoIds.length),
    ]);
    if (!defined(changes[changes.length - 3]).meta.changes) {
      if (defined(changes[0]).meta.changes !== 0) return c.json({ error: "photo_invalid" }, 400);
      const latest = await findSharedWish(db, id, couple);
      if (!latest) return c.json({ error: "not_found" }, 404);
      if (latest.status === "done") return c.json({ error: "shared_wish_done" }, 409);
      current = latest;
      continue;
    }
    // The wish is committed done: tell the partner and answer from what was written, even if a partner
    // deletes the wish before it could be read again.
    c.executionCtx.waitUntil(notifyJournal(c.env, couple, user));
    const row = await findEntry(db, entryId, user);
    if (!row) return c.json({ error: "not_found" }, 404);
    const [entry] = await entriesWithPhotos(db, [row]);
    const wish = toSharedWish(defined((defined(changes[changes.length - 2]).results as SharedWishRow[])[0]));
    return c.json({ wish, entry }, 201);
  }
  return c.json({ error: "server_error" }, 503);
});
