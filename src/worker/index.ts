import type { Env } from "./env";
import { app } from "./app";

// Static assets (the SPA) are served by Workers assets; only /api/* reaches this Worker
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
