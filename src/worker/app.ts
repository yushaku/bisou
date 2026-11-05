import { Hono } from "hono";
import type { AppEnv } from "./env";
import { originGuard } from "./middleware/csrf";
import { requireSession } from "./middleware/session";
import { auth } from "./routes/auth";
import { couple } from "./routes/couple";
import { me } from "./routes/me";
import { photos } from "./routes/photos";

// One route module per area. Later steps add journal and wishes here.
export const app = new Hono<AppEnv>().basePath("/api");

app.use("*", async (c, next) => {
  await next();
  if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
});
app.use("*", originGuard);
app.use("*", requireSession);

app.route("/auth", auth);
app.route("/me", me);
app.route("/couple", couple);
app.route("/photos", photos);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error("[bisou] unhandled error", err);
  return c.json({ error: "server_error" }, 500);
});
