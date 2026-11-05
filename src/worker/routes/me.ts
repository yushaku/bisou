import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { isValidDay, latestDay } from "../../shared/days";
import { DISPLAY_NAME_MAX, isLocale, type MeResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { rowToUser, type UserRow } from "../lib/users";

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
    "UPDATE users SET display_name = ?, locale = ?, birth_date = ? WHERE id = ? RETURNING id, email, display_name, locale, birth_date, created_at",
  )
    .bind(displayName, locale, birthDate, user.id)
    .first<UserRow>();
  if (!row) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: rowToUser(row) });
});
