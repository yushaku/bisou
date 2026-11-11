import { Hono, type Handler } from "hono";
import { notifyJournal } from "../lib/notify";
import { bodyLimit } from "hono/body-limit";
import { receivedText } from "../../shared/wishes";
import { isLocale } from "../../shared/types";
import { entriesWithPhotos, findEntry, validateEntry } from "../lib/journal";
import type { AppEnv } from "../env";
import { isUniqueViolation } from "../lib/couples";
import { CLAIM_SELECT, toClaim, pickWeighted, reserveSpin, findWish, toWish, validateWish, WISH_SELECT, type ClaimRow, type WishRow } from "../lib/wishes";
import { purgePhotos } from "../lib/photos";
import { PENDING_PHOTO_TTL } from "../lib/time";

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
  const hasOpenWish = await c.env.DB.prepare(`SELECT EXISTS (
    SELECT 1 FROM wishes WHERE owner_id = ? AND couple_id = ? AND status = 'open' LIMIT 1
  ) AS has_open_wish`).bind(c.get("partnerId"), c.get("wishCoupleId")).first<number>("has_open_wish");
  return c.json({ open: lists[0]!.results.map(toWish), received: lists[1]!.results.map(toWish), partnerJarEmpty: !hasOpenWish });
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
    db.prepare(`UPDATE wish_claims SET gone_title = (SELECT title FROM wishes WHERE id = ?1), gone_at = ?2, wish_id = NULL
      WHERE wish_id = ?1 AND (SELECT status FROM wishes WHERE id = ?1) = 'open'`).bind(id, Date.now()),
    db.prepare("UPDATE photos SET wish_id = NULL, created_at = 0 WHERE wish_id = ? RETURNING id, couple_id").bind(id),
    db.prepare("DELETE FROM wish_claims WHERE wish_id = ?").bind(id),
    db.prepare("DELETE FROM wishes WHERE id = ? AND owner_id = ?").bind(id, owner),
  ]);
  await purgePhotos(c.env, detached!.results as { id: string; couple_id: string }[]);
  return c.json({ ok: true });
});


wishes.post("/spin", limitBody, async (c) => {
  const body = await c.req.json().catch(() => null);
  const budget = body?.budget;
  if (typeof budget !== "number" || !Number.isSafeInteger(budget) || budget <= 0) return c.json({ error: "invalid_budget" }, 400);
  const retryAfter = await reserveSpin(c.env.DB, c.get("user").id, Date.now());
  if (retryAfter !== null) return c.json({ error: "rate_limited", retryAfter }, 429);
  // shortcut: reads the eligible jar in one query, add a cap if jars grow beyond a few hundred wishes.
  const { results } = await c.env.DB.prepare(`${WISH_SELECT} WHERE w.owner_id = ? AND w.couple_id = ?
    AND w.status = 'open' AND (w.price IS NULL OR w.price <= ?)
    AND NOT EXISTS (SELECT 1 FROM wish_claims c WHERE c.wish_id = w.id)`)
    .bind(c.get("partnerId"), c.get("wishCoupleId"), budget).all<WishRow>();
  const row = pickWeighted(results);
  return c.json({ wish: row ? { id: row.id, title: row.title, price: row.price, link: row.link, photoId: row.photo_id } : null });
});

wishes.post("/:id/claim", async (c) => {
  const db = c.env.DB;
  const id = crypto.randomUUID();
  const claimer = c.get("user").id;
  try {
    const result = await db.prepare(`INSERT INTO wish_claims (id, wish_id, claimer_id, created_at)
      SELECT ?, w.id, ?, ? FROM wishes w WHERE w.id = ? AND w.owner_id = ? AND w.couple_id = ? AND w.status = 'open'`)
      .bind(id, claimer, Date.now(), c.req.param("id"), c.get("partnerId"), c.get("wishCoupleId")).run();
    if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  } catch (error) {
    if (isUniqueViolation(error, "wish_claims.wish_id")) return c.json({ error: "already_claimed" }, 409);
    throw error;
  }
  const row = await db.prepare(`${CLAIM_SELECT} WHERE c.id = ? AND c.claimer_id = ?`).bind(id, claimer).first<ClaimRow>();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ claim: toClaim(row) }, 201);
});

wishes.get("/claims", async (c) => {
  const list = await c.env.DB.prepare(`${CLAIM_SELECT} WHERE c.claimer_id = ? ORDER BY c.created_at DESC`)
    .bind(c.get("user").id).all<ClaimRow>();
  return c.json({ claims: list.results.map(toClaim) });
});

wishes.post("/claims/:id/ack", async (c) => {
  await c.env.DB.prepare("DELETE FROM wish_claims WHERE id = ? AND claimer_id = ? AND wish_id IS NULL")
    .bind(c.req.param("id"), c.get("user").id).run();
  return c.json({ ok: true });
});

wishes.delete("/claims/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const claimer = c.get("user").id;
  const result = await db.prepare(`DELETE FROM wish_claims WHERE id = ? AND claimer_id = ?
    AND EXISTS (SELECT 1 FROM wishes w WHERE w.id = wish_claims.wish_id AND w.status = 'open')`).bind(id, claimer).run();
  if (result.meta.changes) return c.json({ ok: true });
  const row = await db.prepare(`${CLAIM_SELECT} WHERE c.id = ? AND c.claimer_id = ?`).bind(id, claimer).first<ClaimRow>();
  return row?.status === "received" ? c.json({ error: "wish_received" }, 409) : c.json({ error: "not_found" }, 404);
});


wishes.post("/:id/received", limitBody, async (c) => {
  const db = c.env.DB;
  const owner = c.get("user").id;
  const couple = c.get("wishCoupleId");
  const id = c.req.param("id");
  const current = await findWish(db, id, owner, couple);
  if (!current) return c.json({ error: "not_found" }, 404);
  if (current.status === "received") return c.json({ error: "wish_received" }, 409);
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.note !== "string") return c.json({ error: "invalid_body" }, 400);
  const now = Date.now();
  const note = body.note.trim();
  const locale = isLocale(body.locale) ? body.locale : c.get("user").locale;
  const parsed = validateEntry({ date: body.date, photoIds: body.photoIds, text: receivedText(locale, current.title, note) }, now);
  if ("error" in parsed) return c.json(parsed, 400);
  const { date, text, photoIds } = parsed.input;
  if (photoIds.length) {
    const { results } = await db.prepare(`SELECT id FROM photos WHERE id IN (${photoIds.map(() => "?").join(",")})
      AND uploader_id = ? AND couple_id = ? AND entry_id IS NULL AND wish_id IS NULL AND created_at > ?`)
      .bind(...photoIds, owner, couple, now - PENDING_PHOTO_TTL).all();
    if (results.length !== photoIds.length) return c.json({ error: "photo_invalid" }, 400);
  }
  const entryId = crypto.randomUUID();
  const changes = await db.batch([
    db.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, source, created_at, updated_at)
      SELECT ?, couple_id, owner_id, ?, ?, 'wish', ?, ? FROM wishes WHERE id = ? AND owner_id = ? AND status = 'open'`)
      .bind(entryId, date, text, now, now, id, owner),
    ...photoIds.map((photoId, position) => db.prepare(`UPDATE photos SET entry_id = ?, position = ?
      WHERE id = ? AND entry_id IS NULL AND wish_id IS NULL AND uploader_id = ? AND couple_id = ? AND created_at > ?
      AND EXISTS (SELECT 1 FROM journal_entries WHERE id = ?)`)
      .bind(entryId, position, photoId, owner, couple, now - PENDING_PHOTO_TTL, entryId)),
    db.prepare(`UPDATE wishes SET status = 'received', received_on = ?, note = ?, updated_at = ?
      WHERE id = ? AND owner_id = ? AND status = 'open' AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) = ?`)
      .bind(date, note, now, id, owner, entryId, photoIds.length),
    // Failed attachment leaves no partial journal entry, even if the Worker stops after this batch.
    db.prepare(`DELETE FROM journal_entries WHERE id = ? AND (SELECT COUNT(*) FROM photos WHERE entry_id = ?) != ?`)
      .bind(entryId, entryId, photoIds.length),
  ]);
  if (!changes[changes.length - 2]!.meta.changes) {
    return changes[0]!.meta.changes === 0 ? c.json({ error: "wish_received" }, 409) : c.json({ error: "photo_invalid" }, 400);
  }
  const row = await findEntry(db, entryId, owner);
  const wish = await findWish(db, id, owner, couple);
  if (!row || !wish) return c.json({ error: "not_found" }, 404);
  const [entry] = await entriesWithPhotos(db, [row]);
  c.executionCtx.waitUntil(notifyJournal(c.env, couple, owner, now));
  return c.json({ wish: toWish(wish), entry }, 201);
});
