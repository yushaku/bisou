import { defined } from "../../shared/guards";
import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../env";
import { validateWish } from "../../shared/wishes";
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
    ["open", "done"].map((status) =>
      c.env.DB.prepare(
        `${SHARED_WISH_SELECT} WHERE w.couple_id = ? AND w.status = ? ORDER BY w.created_at DESC, w.id DESC`,
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
