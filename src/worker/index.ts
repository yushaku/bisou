import type { Env } from "./env";
import { app } from "./app";
import { runCleanup, sweepPhotos } from "./lib/cleanup";

// Static assets (the SPA) are served by Workers assets; only /api/* reaches this Worker
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  // Daily Cron Trigger (triggers.crons in wrangler.jsonc): removes expired rows.
  scheduled(controller, env, ctx) {
    ctx.waitUntil(
      Promise.allSettled([
        runCleanup(env.DB, controller.scheduledTime),
        sweepPhotos(env, controller.scheduledTime),
      ]).then(([rows, photos]) => {
        if (rows.status === "fulfilled") console.log("[bisou] cleanup", JSON.stringify(rows.value));
        else console.error("[bisou] cleanup failed");
        if (photos.status === "fulfilled") console.log("[bisou] photo cleanup", photos.value);
        else console.error("[bisou] photo cleanup failed");
      }),
    );
  },
} satisfies ExportedHandler<Env>;
