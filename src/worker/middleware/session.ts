import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { clearSessionCookie, loadSession, readSessionToken, setSessionCookie } from "../lib/session";

/** Loads the user for every /api route except /api/auth/*, 401 without a valid session. */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) return next();
  const token = readSessionToken(c);
  const loaded = token ? await loadSession(c.env, token) : null;
  if (!loaded) {
    if (token) clearSessionCookie(c);
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("user", loaded.user);
  c.set("session", loaded.session);
  if (loaded.refreshed && token) setSessionCookie(c, token);
  return next();
};
