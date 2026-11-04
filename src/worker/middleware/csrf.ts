import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Rejects state-changing requests whose Origin header does not match the request host. */
export const originGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();
  const origin = c.req.header("Origin");
  let ok = false;
  if (origin) {
    try {
      ok = new URL(origin).host === new URL(c.req.url).host;
    } catch {
      ok = false;
    }
  }
  if (!ok) return c.json({ error: "forbidden_origin" }, 403);
  return next();
};
