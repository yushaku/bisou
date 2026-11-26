import { isRecord } from "../../shared/guards";
import type { Env } from "../env";
import { log } from "./logger";

export type CronSlot = "notes" | "07" | "08" | "20" | "03";
type CronOutcome = "success" | "failure";

function healthcheckUrl(secret: string | undefined, slot: CronSlot): URL | undefined {
  if (!secret) return;
  try {
    const checks: unknown = JSON.parse(secret);
    if (!isRecord(checks) || typeof checks[slot] !== "string") return;
    const url = new URL(checks[slot]);
    if (
      url.protocol === "https:" &&
      (url.hostname === "hc-ping.com" || url.hostname === "hchk.io") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      /^\/[\w-]+(?:\/[\w-]+)?\/?$/.test(url.pathname)
    ) {
      return url;
    }
  } catch {
    // Local and partially configured environments can run without a check.
  }
}

export async function runCronSlot(
  env: Env,
  slot: CronSlot,
  run: () => Promise<void> | Promise<CronOutcome>,
): Promise<void> {
  const start = performance.now();
  let outcome: CronOutcome;
  try {
    outcome = (await run()) ?? "success";
  } catch {
    outcome = "failure";
  }
  log(outcome === "failure" ? "error" : "info", "cron_run", { slot, outcome, durationMs: performance.now() - start });

  const url = healthcheckUrl(env.HEALTHCHECKS_URLS, slot);
  if (!url) return;
  if (outcome === "failure") url.pathname = `${url.pathname.replace(/\/$/, "")}/fail`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    if (!response.ok) log("warn", "heartbeat_failed", { slot, outcome, status: response.status });
    await response.body?.cancel();
  } catch {
    log("warn", "heartbeat_failed", { slot, outcome });
  }
}
