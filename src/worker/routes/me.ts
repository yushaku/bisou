import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { AVATAR_MAX_BYTES, AVATAR_SIDE } from "../../shared/avatar";
import { isValidDay, latestDay } from "../../shared/days";
import { DISPLAY_NAME_MAX, isLocale, type MeResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { rowToUser, type UserRow } from "../lib/users";
import { avatarKey, checkPhotoBytes, purgeAvatars } from "../lib/photos";

export const me = new Hono<AppEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });

me.get("/", async (c) => {
  const user = c.get("user");
  const coupleId = await c.env.DB.prepare("SELECT couple_id FROM couple_members WHERE user_id = ?")
    .bind(user.id)
    .first<string>("couple_id");
  const body: MeResponse = { user, coupleId: coupleId ?? null };
  return c.json(body);
});

me.patch("/", limitBody, async (c) => {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await c.req.json();
    if (!parsed || typeof parsed !== "object") return c.json({ error: "invalid_body" }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }
  const user = c.get("user");
  let displayName = user.displayName;
  let locale = user.locale;
  let birthDate = user.birthDate;

  if ("displayName" in body) {
    const v = body.displayName;
    if (typeof v !== "string") return c.json({ error: "invalid_body" }, 400);
    const trimmed = v.trim();
    if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) return c.json({ error: "invalid_body" }, 400);
    displayName = trimmed;
  }
  if ("locale" in body) {
    if (!isLocale(body.locale)) return c.json({ error: "invalid_body" }, 400);
    locale = body.locale;
  }

  if ("birthDate" in body) {
    const value = body.birthDate;
    if (value !== null && (!isValidDay(value) || value > latestDay(Date.now()))) {
      return c.json({ error: "invalid_birth_date" }, 400);
    }
    birthDate = value;
  }

  const row = await c.env.DB.prepare(
    "UPDATE users SET display_name = ?, locale = ?, birth_date = ? WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at",
  )
    .bind(displayName, locale, birthDate, user.id)
    .first<UserRow>();
  if (!row) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: rowToUser(row) });
});

me.put("/avatar", bodyLimit({
  maxSize: AVATAR_MAX_BYTES + 16 * 1024,
  onError: (c) => c.json({ error: "photo_too_large" }, 413),
}), async (c) => {
  if (c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "multipart/form-data") {
    return c.json({ error: "unsupported_photo_type" }, 415);
  }
  let form: FormData;
  try { form = await c.req.formData(); } catch {
    return c.json({ error: "photo_invalid" }, 400);
  }
  const file = form.get("photo");
  if ([...form.keys()].length !== 1 || !(file instanceof File) || !file.size) return c.json({ error: "photo_invalid" }, 400);
  if (file.type !== "image/jpeg" && file.type !== "image/webp") return c.json({ error: "unsupported_photo_type" }, 415);
  if (file.size > AVATAR_MAX_BYTES) return c.json({ error: "photo_too_large" }, 413);
  const checked = checkPhotoBytes(new Uint8Array(await file.arrayBuffer()), file.type);
  if (!checked || checked.side !== AVATAR_SIDE) return c.json({ error: "photo_invalid" }, 400);
  const userId = c.get("user").id;
  const id = crypto.randomUUID();
  const key = avatarKey(userId, id);
  await c.env.PHOTOS.put(key, checked.bytes, { httpMetadata: { contentType: file.type } });
  let row: UserRow;
  try {
    const [, updated] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT avatar_id FROM users WHERE id = ?").bind(userId),
      c.env.DB.prepare("UPDATE users SET avatar_id = ? WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at").bind(id, userId),
    ]);
    row = updated!.results[0] as unknown as UserRow;
    if (!row) throw new Error("avatar owner missing");
  } catch (error) {
    try { await c.env.PHOTOS.delete(key); } catch { console.error("[bisou] avatar rollback failed", 1); }
    throw error;
  }
  // shortcut: simultaneous changes can race with cleanup; serialize per user if multi-device writes become common.
  await purgeAvatars(c.env, userId, id);
  return c.json({ user: rowToUser(row) });
});

me.delete("/avatar", limitBody, async (c) => {
  const userId = c.get("user").id;
  const row = await c.env.DB.prepare("UPDATE users SET avatar_id = NULL WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at")
    .bind(userId).first<UserRow>();
  if (!row) return c.json({ error: "unauthorized" }, 401);
  await purgeAvatars(c.env, userId, null);
  return c.json({ user: rowToUser(row) });
});
