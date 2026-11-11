import { Hono } from "hono";
import type { AppEnv } from "./env";
import { originGuard } from "./middleware/csrf";
import { requireSession } from "./middleware/session";
import { auth } from "./routes/auth";
import { couple } from "./routes/couple";
import { me } from "./routes/me";
import { photos } from "./routes/photos";
import { avatars } from "./routes/avatars";
import { wishes } from "./routes/wishes";
import { coupleEvents } from "./routes/events";
import { journal } from "./routes/journal";
import { push } from "./routes/push";
import { garden } from "./routes/garden";
import { notes } from "./routes/notes";

// One route module per area.
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
app.route("/avatars", avatars);
app.route("/journal", journal);
app.route("/wishes", wishes);
app.route("/events", coupleEvents);
app.route("/push", push);
app.route("/garden", garden);
app.route("/notes", notes);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error("[bisou] unhandled error", err);
  return c.json({ error: "server_error" }, 500);
});
