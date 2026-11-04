import { Hono } from "hono";
import { DISPLAY_NAME_MAX, isLocale } from "../../shared/types";
import type { AppEnv } from "../env";
import { rowToUser, type UserRow } from "../lib/users";

export const me = new Hono<AppEnv>();

me.get("/", (c) => c.json({ user: c.get("user") }));

me.patch("/", async (c) => {
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

  if ("displayName" in body) {
    const v = body.displayName;
    if (v === null) displayName = null;
    else if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > DISPLAY_NAME_MAX) return c.json({ error: "invalid_body" }, 400);
      displayName = trimmed === "" ? null : trimmed;
    } else return c.json({ error: "invalid_body" }, 400);
  }
  if ("locale" in body) {
    if (!isLocale(body.locale)) return c.json({ error: "invalid_body" }, 400);
    locale = body.locale;
  }

  const row = await c.env.DB.prepare(
    "UPDATE users SET display_name = ?, locale = ? WHERE id = ? RETURNING id, email, display_name, locale, created_at",
  )
    .bind(displayName, locale, user.id)
    .first<UserRow>();
  if (!row) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: rowToUser(row) });
});
