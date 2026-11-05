import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../env";
import { purgePhotos } from "../lib/photos";
import { PENDING_PHOTO_TTL } from "../lib/time";
import { findWish, toWish, validateWish, WISH_SELECT, type WishRow } from "../lib/wishes";

type WishEnv = AppEnv & { Variables: { wishCoupleId: string; partnerId: string } };
export const wishes = new Hono<WishEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });

wishes.use("*", async (c, next) => {
  const mine = await c.env.DB.prepare(`SELECT m.couple_id,
    (SELECT x.user_id FROM couple_members x WHERE x.couple_id = m.couple_id AND x.user_id != m.user_id) AS partner_id
    FROM couple_members m WHERE m.user_id = ?`).bind(c.get("user").id)
    .first<{ couple_id: string; partner_id: string | null }>();
  if (!mine?.partner_id) return c.json({ error: "not_in_couple" }, 404);
  c.set("wishCoupleId", mine.couple_id);
  c.set("partnerId", mine.partner_id);
  await next();
});

wishes.get("/", async (c) => {
  const lists = await c.env.DB.batch<WishRow>(["open", "received"].map((status) => c.env.DB.prepare(
    `${WISH_SELECT} WHERE w.owner_id = ? AND w.couple_id = ? AND w.status = ? ORDER BY w.created_at DESC, w.id DESC`,
  ).bind(c.get("user").id, c.get("wishCoupleId"), status)));
  return c.json({ open: lists[0]!.results.map(toWish), received: lists[1]!.results.map(toWish) });
});

// The same photo predicate guards every write inside the batch, including a racing expiry or attachment.
const validPhoto = `(? IS NULL OR EXISTS (SELECT 1 FROM photos WHERE id = ? AND uploader_id = ? AND couple_id = ?
  AND entry_id IS NULL AND ((wish_id IS NULL AND created_at > ?) OR wish_id = ?)))`;

const saveWish: Handler<WishEnv> = async (c) => {
  const updating = c.req.method === "PUT";
  const db = c.env.DB;
  const owner = c.get("user").id;
  const couple = c.get("wishCoupleId");
  const id = updating ? c.req.param("id") : crypto.randomUUID();
  if (!id) return c.json({ error: "not_found" }, 404);
  const current = updating ? await findWish(db, id, owner, couple) : null;
  if (updating && !current) return c.json({ error: "not_found" }, 404);
  if (current?.status === "received") return c.json({ error: "wish_received" }, 409);
  const parsed = validateWish(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json(parsed, 400);
  const { title, price, link, priority, photoId } = parsed.input;
  const now = Date.now();
  const photoBinds = [photoId, photoId, owner, couple, now - PENDING_PHOTO_TTL, id];
  const saved = updating
    ? db.prepare(`UPDATE wishes SET title = ?, price = ?, link = ?, priority = ?, updated_at = ?
        WHERE id = ? AND owner_id = ? AND status = 'open' AND ${validPhoto}`)
      .bind(title, price, link, priority, now, id, owner, ...photoBinds)
    : db.prepare(`INSERT INTO wishes (id, couple_id, owner_id, title, price, link, priority, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${validPhoto}`)
      .bind(id, couple, owner, title, price, link, priority, now, now, ...photoBinds);
  const [write, detached] = await db.batch([
    saved,
    db.prepare(`UPDATE photos SET wish_id = NULL, created_at = 0 WHERE wish_id = ? AND id IS NOT ?
      AND EXISTS (SELECT 1 FROM wishes WHERE id = ? AND owner_id = ? AND status = 'open')
      AND ${validPhoto} RETURNING id, couple_id`).bind(id, photoId, id, owner, ...photoBinds),
    db.prepare(`UPDATE photos SET wish_id = ? WHERE id = ? AND entry_id IS NULL AND wish_id IS NULL
      AND uploader_id = ? AND couple_id = ? AND created_at > ?
      AND EXISTS (SELECT 1 FROM wishes WHERE id = ? AND owner_id = ? AND status = 'open')`)
      .bind(id, photoId, owner, couple, now - PENDING_PHOTO_TTL, id, owner),
  ]);
  if (!write!.meta.changes) {
    const latest = updating ? await findWish(db, id, owner, couple) : null;
    if (updating && !latest) return c.json({ error: "not_found" }, 404);
    if (latest?.status === "received") return c.json({ error: "wish_received" }, 409);
    return c.json({ error: "photo_invalid" }, 400);
  }
  await purgePhotos(c.env, detached!.results as { id: string; couple_id: string }[]);
  const row = await findWish(db, id, owner, couple);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ wish: toWish(row) }, updating ? 200 : 201);
};
wishes.post("/", limitBody, saveWish);
wishes.put("/:id", limitBody, saveWish);

wishes.delete("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const owner = c.get("user").id;
  if (!await findWish(db, id, owner, c.get("wishCoupleId"))) return c.json({ error: "not_found" }, 404);
  const [, detached] = await db.batch([
    db.prepare(`UPDATE wish_claims SET gone_title = (SELECT title FROM wishes WHERE id = ?1), wish_id = NULL WHERE wish_id = ?1`).bind(id),
    db.prepare("UPDATE photos SET wish_id = NULL, created_at = 0 WHERE wish_id = ? RETURNING id, couple_id").bind(id),
    db.prepare("DELETE FROM wishes WHERE id = ? AND owner_id = ?").bind(id, owner),
  ]);
  await purgePhotos(c.env, detached!.results as { id: string; couple_id: string }[]);
  return c.json({ ok: true });
});
