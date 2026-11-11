import type { Env } from "./env";
import { app } from "./app";
import { runCleanup, sweepPhotos } from "./lib/cleanup";
import { vnHour } from "../shared/days";
import { notifyNotes, remindEvents } from "./lib/notify";

// Static assets (the SPA) are served by Workers assets; only /api/* reaches this Worker
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  // One hourly trigger dispatches jobs using Vietnam time.
  scheduled(controller, env, ctx) {
    switch (vnHour(controller.scheduledTime)) {
      case 8:
      case 20:
        ctx.waitUntil(remindEvents(env, controller.scheduledTime, vnHour(controller.scheduledTime) === 20 ? 1 : 0)
          .catch(() => console.error("[bisou] event push failed")));
        return;
      case 7:
        ctx.waitUntil(notifyNotes(env, controller.scheduledTime).catch(() => console.error("[bisou] note push failed")));
        return;
      case 3:
        break;
      default:
        return;
    }
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
