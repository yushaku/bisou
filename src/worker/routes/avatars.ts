import { Hono } from "hono";
import type { AppEnv } from "../env";
import { avatarKey } from "../lib/photos";

export const avatars = new Hono<AppEnv>();

avatars.get("/:userId/:avatarId", async (c) => {
  const { userId, avatarId } = c.req.param();
  const allowed = await c.env.DB.prepare(`SELECT 1 FROM users u WHERE u.id = ?1 AND u.avatar_id = ?2
    AND (u.id = ?3 OR EXISTS (SELECT 1 FROM couple_members a JOIN couple_members b ON b.couple_id = a.couple_id
      WHERE a.user_id = u.id AND b.user_id = ?3))`)
    .bind(userId, avatarId, c.get("user").id).first();
  if (!allowed) return c.json({ error: "not_found" }, 404);
  const object = await c.env.PHOTOS.get(avatarKey(userId, avatarId));
  if (!object) return c.json({ error: "not_found" }, 404);
  return new Response(object.body, { headers: {
    "Content-Type": object.httpMetadata!.contentType!,
    "Content-Length": String(object.size),
    "Cache-Control": "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  } });
});
