import type { Env } from "./env";
import { app } from "./app";
import { runCleanup, sweepPhotos } from "./lib/cleanup";
import { sendScheduledNotes } from "./lib/notes";
import { vnHour } from "../shared/days";
import { remindNotes, remindEvents } from "./lib/notify";
import { consumePushBatch, type PushJob } from "./lib/pushQueue";
import { log, withLogContext } from "./lib/logger";

// Static assets (the SPA) are served by Workers assets; only /api/* reaches this Worker
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  // Queue `bisou`: sends one Web Push per message (ADR 0010).
  queue(batch, env, _ctx) {
    return withLogContext({ requestId: crypto.randomUUID() }, () => consumePushBatch(batch, env));
  },

  // Check scheduled notes every minute; other jobs keep their hourly Vietnam slots.
  scheduled(controller, env, ctx) {
    withLogContext({ requestId: crypto.randomUUID() }, () => {
      ctx.waitUntil(
        sendScheduledNotes(env, controller.scheduledTime).catch(() => log("error", "scheduled_notes_failed")),
      );
      if (new Date(controller.scheduledTime).getUTCMinutes() !== 0) return;
      switch (vnHour(controller.scheduledTime)) {
        case 8:
        case 20:
          ctx.waitUntil(
            remindEvents(env, controller.scheduledTime, vnHour(controller.scheduledTime) === 20 ? 1 : 0).catch(() =>
              log("error", "event_reminders_failed", { topic: "events" }),
            ),
          );
          return;
        case 7:
          ctx.waitUntil(
            remindNotes(env, controller.scheduledTime).catch(() =>
              log("error", "note_reminders_failed", { topic: "notes" }),
            ),
          );
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
          if (rows.status === "fulfilled") log("info", "cleanup", { outcome: "success", cleanup: rows.value });
          else log("error", "cleanup", { outcome: "failure" });
          if (photos.status === "fulfilled") log("info", "photo_cleanup", { outcome: "success", count: photos.value });
          else log("error", "photo_cleanup", { outcome: "failure" });
        }),
      );
    });
  },
} satisfies ExportedHandler<Env, PushJob>;
