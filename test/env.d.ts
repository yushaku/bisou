import type { D1Migration } from "cloudflare:test";
import type { Env as BisouEnv } from "../src/worker/env";

declare global {
  namespace Cloudflare {
    interface Env extends BisouEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
