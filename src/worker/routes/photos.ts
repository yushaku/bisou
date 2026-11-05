import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { PHOTO_SIZES, PHOTO_TYPES, PHOTO_UPLOAD_MAX_BYTES } from "../../shared/journal";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { checkPhotoBytes, photoKey, purgePhotos } from "../lib/photos";
import { MAX_PENDING_PHOTOS_PER_USER, PENDING_PHOTO_TTL } from "../lib/time";

export const photos = new Hono<AppEnv & { Variables: { photoCoupleId: string } }>();

photos.post("/", async (c, next) => {
  const mine = await findMembership(c.env.DB, c.get("user").id);
  if (mine?.memberCount !== 2) return c.json({ error: "not_in_couple" }, 404);
  if (c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "multipart/form-data") {
    return c.json({ error: "unsupported_photo_type" }, 415);
  }
  c.set("photoCoupleId", mine.coupleId);
  await next();
}, bodyLimit({
  maxSize: PHOTO_UPLOAD_MAX_BYTES,
  onError: (c) => c.json({ error: "photo_too_large" }, 413),
}), async (c) => {
  const userId = c.get("user").id;
  const now = Date.now();
  const pending = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND created_at > ?")
    .bind(userId, now - PENDING_PHOTO_TTL).first<number>("n");
  if (pending! >= MAX_PENDING_PHOTOS_PER_USER) {
    return c.json({ error: "too_many_pending_photos" }, 429);
  }
  let form: FormData;
  try { form = await c.req.formData(); } catch {
    return c.json({ error: "photo_invalid" }, 400);
  }
  const parts = [];
  for (const size of ["full", "thumb"] as const) {
    const file = form.get(size);
    if (!(file instanceof File) || file.size === 0) {
      return c.json({ error: "photo_invalid" }, 400);
    }
    if (!PHOTO_TYPES.some((type) => type === file.type)) {
      return c.json({ error: "unsupported_photo_type" }, 415);
    }
    if (file.size > PHOTO_SIZES[size].maxBytes) {
      return c.json({ error: "photo_too_large" }, 413);
    }
    const bytes = await file.arrayBuffer();
    const dimensions = checkPhotoBytes(new Uint8Array(bytes), file.type);
    if (!dimensions || dimensions.side > PHOTO_SIZES[size].side) {
      return c.json({ error: "photo_invalid" }, 400);
    }
    parts.push({ size, bytes: dimensions.bytes, type: file.type, side: dimensions.side });
  }
  if (parts[1]!.side > parts[0]!.side) {
    return c.json({ error: "photo_invalid" }, 400);
  }
  const id = crypto.randomUUID();
  const keys = parts.map((part) => photoKey(c.get("photoCoupleId"), id, part.size));
  try {
    // Wait for both writes before cleanup, including a slower successful write.
    const puts = await Promise.allSettled(parts.map((part, i) => c.env.PHOTOS.put(keys[i]!, part.bytes, { httpMetadata: { contentType: part.type } })));
    const failed = puts.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const inserted = await c.env.DB.prepare(`INSERT INTO photos (id, couple_id, uploader_id, created_at)
      SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND created_at > ?) < ?`)
      .bind(id, c.get("photoCoupleId"), userId, now, userId, now - PENDING_PHOTO_TTL, MAX_PENDING_PHOTOS_PER_USER).run();
    if (!inserted.meta.changes) {
      await c.env.PHOTOS.delete(keys);
      return c.json({ error: "too_many_pending_photos" }, 429);
    }
  } catch (err) {
    await c.env.PHOTOS.delete(keys);
    throw err;
  }
  return c.json({ photo: { id } }, 201);
});

photos.delete("/:id", async (c) => {
  // Claim the pending photo before deleting objects so a racing save cannot attach it.
  const row = await c.env.DB.prepare(`UPDATE photos SET created_at = 0
    WHERE id = ? AND uploader_id = ? AND entry_id IS NULL RETURNING id, couple_id`)
    .bind(c.req.param("id"), c.get("user").id).first<{ id: string; couple_id: string }>();
  if (!row) return c.json({ error: "not_found" }, 404);
  await purgePhotos(c.env, [row]);
  return c.json({ ok: true });
});

photos.get("/:id/:size", async (c) => {
  const { id, size } = c.req.param();
  if (size !== "full" && size !== "thumb") return c.json({ error: "not_found" }, 404);
  const row = await c.env.DB.prepare(`SELECT p.couple_id FROM photos p JOIN couple_members m ON m.couple_id = p.couple_id
    WHERE p.id = ? AND m.user_id = ? AND p.entry_id IS NOT NULL`)
    .bind(id, c.get("user").id).first<{ couple_id: string }>();
  if (!row) return c.json({ error: "not_found" }, 404);
  const object = await c.env.PHOTOS.get(photoKey(row.couple_id, id, size));
  if (!object) return c.json({ error: "not_found" }, 404);
  return new Response(object.body, { headers: {
    "Content-Type": object.httpMetadata!.contentType!,
    "Content-Length": String(object.size),
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  } });
});
