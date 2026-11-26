import { Hono, type Context } from "hono";
import { routePath } from "hono/route";
import type { AppEnv } from "./env";
import { log, withLogContext } from "./lib/logger";
import { originGuard } from "./middleware/csrf";
import { requireSession } from "./middleware/session";
import { auth } from "./routes/auth";
import { couple } from "./routes/couple";
import { me } from "./routes/me";
import { photos } from "./routes/photos";
import { avatars } from "./routes/avatars";
import { wishes } from "./routes/wishes";
import { sharedWishes } from "./routes/sharedWishes";
import { coupleEvents } from "./routes/events";
import { journal } from "./routes/journal";
import { push } from "./routes/push";
import { garden } from "./routes/garden";
import { notes } from "./routes/notes";

import { cardBoxes } from "./routes/cardBoxes";

// One route module per area.
export const app = new Hono<AppEnv>().basePath("/api");

app.use("*", (c: Context<AppEnv>, next) =>
  withLogContext({ requestId: c.req.header("cf-ray"), route: routePath(c, -1), method: c.req.method }, async () => {
    const startedAt = Date.now();
    let error: unknown;
    let threw: boolean;
    try {
      await next();
      error = c.error;
      threw = error !== undefined;
    } catch (reason) {
      // Hono only sends Error instances to onError.
      error = reason;
      threw = true;
      c.res = c.json({ error: "server_error" }, 500);
    }
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
    if (threw || c.res.status >= 500) {
      log("error", "api_error", {
        status: c.res.status,
        durationMs: Date.now() - startedAt,
        errorCode: threw ? "server_error" : "http_5xx",
        error,
      });
    }
  }),
);
app.use("*", originGuard);
app.use("*", requireSession);

app.route("/auth", auth);
app.route("/me", me);
app.route("/couple", couple);
app.route("/photos", photos);
app.route("/avatars", avatars);
app.route("/journal", journal);
app.route("/wishes", wishes);
app.route("/shared-wishes", sharedWishes);
app.route("/events", coupleEvents);
app.route("/push", push);
app.route("/garden", garden);
app.route("/notes", notes);
app.route("/boxes", cardBoxes);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((_error, c) => c.json({ error: "server_error" }, 500));
