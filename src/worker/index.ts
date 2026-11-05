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
      runCleanup(env.DB, controller.scheduledTime).then(async (counts) => {
        const photos = await sweepPhotos(env, controller.scheduledTime);
        console.log("[bisou] cleanup", JSON.stringify({ ...counts, photos }));
      }),
    );
  },
} satisfies ExportedHandler<Env>;
