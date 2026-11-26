import type { Env } from "./env";
import { app } from "./app";
import { runCleanup, sweepPhotos } from "./lib/cleanup";
import { sendScheduledNotes } from "./lib/notes";
import { vnHour } from "../shared/days";
import { remindNotes, remindEvents } from "./lib/notify";
import { consumePushBatch, type PushJob } from "./lib/pushQueue";
import { log, withLogContext } from "./lib/logger";
import { runCronSlot } from "./lib/cron";

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
      const { scheduledTime } = controller;
      ctx.waitUntil(runCronSlot(env, "notes", () => sendScheduledNotes(env, scheduledTime)));
      if (new Date(scheduledTime).getUTCMinutes() !== 0) return;
      const hour = vnHour(scheduledTime);
      switch (hour) {
        case 8:
        case 20:
          ctx.waitUntil(
            runCronSlot(env, hour === 20 ? "20" : "08", () => remindEvents(env, scheduledTime, hour === 20 ? 1 : 0)),
          );
          return;
        case 7:
          ctx.waitUntil(runCronSlot(env, "07", () => remindNotes(env, scheduledTime)));
          return;
        case 3:
          break;
        default:
          return;
      }
      ctx.waitUntil(
        runCronSlot(env, "03", async () => {
          const [rows, photos] = await Promise.allSettled([
            runCleanup(env.DB, scheduledTime),
            sweepPhotos(env, scheduledTime),
          ]);
          if (rows.status === "fulfilled") log("info", "cleanup", { outcome: "success", cleanup: rows.value });
          else log("error", "cleanup", { outcome: "failure" });
          if (photos.status === "fulfilled") log("info", "photo_cleanup", { outcome: "success", count: photos.value });
          else log("error", "photo_cleanup", { outcome: "failure" });
          return rows.status === "fulfilled" && photos.status === "fulfilled" ? "success" : "failure";
        }),
      );
    });
  },
} satisfies ExportedHandler<Env, PushJob>;
