# ADR 0018: Backend observability stays Cloudflare-native, with alerts on errors, cron and push

Status: accepted (November 2026), revised 26 November 2026 before implementation

## Context

The PO asked whether the backend has observability and said it is needed. It has some: `wrangler.jsonc` sets `observability.enabled`, so Workers Logs and built-in metrics exist, and routes log failures with `console.error` (`src/worker/app.ts`, `src/worker/lib/pushQueue.ts`, `src/worker/lib/notify.ts`, `src/worker/lib/webpush.ts`, `src/worker/index.ts`).

It is not enough to operate the app:
- Workers Issues is not enabled: failures are not grouped and nobody is notified.
- Logs are free-text `[bisou] ...` lines with no request id, route, status, duration or release; they cannot be queried or aggregated reliably.
- No alert or SLO exists. `push_subscriptions.failures` and `last_success_at` are written but never read; a push outage is invisible until a partner reports it.
- Cron has no heartbeat. `src/worker/index.ts` runs `sendScheduledNotes` every minute and the 07, 08, 20 and 03 Vietnam-hour jobs; each swallows its error after one `console.error`. A missed run is only discovered later.
- Client errors never leave the device; `ErrorBoundary` only calls `console.error`.
- `src/worker/lib/mail.ts` logs the email and the login code when `RESEND_API_KEY` is missing. If the secret were missing in production, logs would contain one-time codes.

Bisou is one Worker on Workers Free: a few hundred API requests a day, two people per couple, 5 USD/month would be a real cost. Notifications are a core feature (ADR 0007, ADR 0010, ADR 0012), so losing a push or a reminder matters more than a slow page.

Targets, agreed with the PO:

| Target | Value | How it is watched |
|---|---|---|
| API server errors | 5xx ≤ 1% of requests per 15 minutes | Monitor emails on at least one error-level log in five minutes |
| Cron | every expected run happens: `notes` each minute, 07/08/20/03 hourly slots | External heartbeat; alert when a slot is > 10 minutes late |
| Push | ≥ 98% delivered per day | Monitor: failed+gone > 5% over 1 hour with at least 10 attempts, and a daily check against 98% |
| Queue | p95 lag from enqueue to consume < 60 s | Monitor: lag p95 > 5 minutes, or no consumer batch for 15 minutes while jobs were enqueued |
| API latency | p95 < 800 ms; push enqueue p95 < 2 s | Dashboard only, no alert |
| Retention | 7 days for logs; aggregated metrics as long as the chosen store keeps them (see PoC) | |
| Cost | 0 USD/month; revisit only when a quota is reached | |
| Privacy | metadata only: no email, cookie, request body, push endpoint/keys, journal/note text, or raw user/couple id | |

The push threshold uses 1 hour because the original 15 minutes with 20 attempts is rarely reached at this traffic outside the 20:00 slot.

Cloudflare facts, checked on 26 November 2026 from Cloudflare docs and changelog:
- Workers Issues groups uncaught exceptions, failed invocations, 5xx responses and error-level logs (`observability.issues.enabled`). Its automations support coding agents, webhooks, chat and incident management. [Issues automation destinations](https://developers.cloudflare.com/workers/observability/issues/automations/)
- Wrangler uploads Worker source maps by default from 4.150.0. The repo requires `^4.166.0`.
- Alerts → Monitors (2 October 2026) evaluate SQL API queries on a schedule (threshold, anomaly detection, SLO) and deliver to email or webhook. The SQL API is in beta; its datasets include Workers logs. Whether a Monitor can read a Workers Analytics Engine dataset is not confirmed.
- From 1 December 2026 Workers Logs moves to the unified observability pricing ($0.25/GB ingested, $0.10/GB-month stored beyond the allowance). Analytics Engine Free includes 100,000 writes/day and keeps data for three months.
- Cron Triggers have had reported dispatch incidents (Cloudflare community, October 2026) where the handler never ran. Nothing inside the Worker can report a run that never started.

## Options considered

**A. Cloudflare-native plus an external heartbeat (chosen).** Issues for grouping errors, structured JSON logs, Workers traces, Monitors for email alerts, and a free external heartbeat service for cron. No new npm dependency, 0 USD.

**B. Sentry for errors and performance.** `@sentry/cloudflare` plus `@sentry/react` gives grouping, releases, client stack traces and 30-day retention on the Developer plan (0 USD, one user, 5,000 errors/month; Team 26 USD/month). Rejected for now: it adds dependencies and a vendor while still needing something else for cron, Queue and push. Revisit if client errors need release-by-release grouping or 30-day retention.

**C. OpenTelemetry export to an external backend.** Workers can export logs and traces over OTel to Grafana Cloud, Better Stack or Datadog. Rejected for now: another account, secret and billing, plus retention/cost that needs its own PoC, for a system with one runtime.

**Cron alerts inside Cloudflare only** were considered and rejected: a Monitor or a self-check in the same cron cannot report that the cron itself stopped dispatching.

## Decision

### Signals

1. **Issues.** Set `observability.issues.enabled` for grouping and stacks. Source maps rely on Wrangler's default upload. The PoC checks that a captured stack points at `src/worker/...`.
2. **Structured logs.** One JSON object per log line with `event`, `level`, `requestId`, `route` (matched path, never the raw URL), `method`, `status`, `durationMs`, `release` (git SHA injected at build), `errorCode`, and counts/topic/outcome where relevant. `requestId` is `cf-ray` for HTTP requests, and `crypto.randomUUID()` for cron and queue invocations, which have no request header. The logger in `src/worker/lib/` passes the entry object to the console so Workers Logs can index its fields. Emit one request error event for an API request that throws or returns a 5xx. For thrown errors, keep the stack frames and use the scrubbed message as the first line.
3. **Business events.** Emitted as structured log events first:
   - `cron_run`: slot (`notes`, `07`, `08`, `20`, `03`), outcome, durationMs, release.
   - `queue_batch`: topic counts, batchSize, sent, gone, retried, dropped, failed, lagP95Ms, release.
   - `client_error` (phase 3): route, errorName, stackHash, release, userAgentFamily.
   Queue lag is computed from the existing `PushJob.expiresAt`: `now - (expiresAt - PUSH_LIFETIME_MS)`. No new field in `PushJob`, so jobs already in the queue at deploy time still work. One `queue_batch` event per batch replaces the separate `push_result` event of the first version; topic counts stay inside it.
   If the PoC shows Monitors cannot query these log events, or retention is too short for the daily 98% check, the same events are also written to an Analytics Engine dataset `bisou_metrics` (binding `METRICS`), with no ids and no free text.
4. **Alerts by email.**
   - Errors: Monitor, at least one error-level log in five minutes.
   - Push: Monitor, failed+gone > 5% over 1 hour with at least 10 attempts.
   - Queue: Monitor, `lagP95Ms > 300000`, or no `queue_batch` for 15 minutes after jobs were enqueued.
   - Cron: healthchecks.io free plan, one check per slot (`notes` each minute, `07`, `08`, `20`, `03` daily) with a 10-minute grace period. The Worker pings the check URL after each run. A failed run pings the `/fail` URL. The ping carries no data. Check URLs are kept in a Worker secret, not in the repository.
   - Ingest: Monitor at about 0.25 GB per day, half the Free allowance.

   The PO runs an idempotent repo script with a dry-run mode to create the Monitors and the five healthchecks.io checks. It reads API credentials from the environment and prints the `HEALTHCHECKS_URLS` JSON for the Worker secret. If Cloudflare rejects Monitor creation through the API, the script prints the dashboard steps.
5. **Client errors (phase 3).** `POST /api/telemetry` behind the session, body limit 2 KB, same-origin guard, at most 20 reports per user per minute through the Workers Rate Limiting binding. Fields: route, error name, a normalized stack hash, release, browser family. No user text, URL query, email, user id or couple id. Client source maps are uploaded in this phase, not before.
6. **Workers traces.** Enable tracing with `head_sampling_rate: 1`. Starting 1 December 2026, Workers Logs, Workers Traces and Issues share the account's Free allowance of 0.5 GB per day. Cloudflare pauses ingestion at the limit until 00:00 UTC. If the ingest Monitor fires, lower the trace sampling rate, for example to 0.2. [Cloudflare Observability pricing](https://developers.cloudflare.com/observability/pricing/)

### Safety and privacy

- When `RESEND_API_KEY` is missing, log the login code and test email only if `ENVIRONMENT === "development"`. Other environments log mail unavailability without either field.
- Use hashed ids only if correlation becomes necessary: HMAC with a secret salt, never a raw id. Phases 1 and 2 need no user/couple identifiers.
- Application logs exclude request bodies, cookies, Authorization headers, emails outside the development mail case, push endpoints and keys, payloads, titles, journal/note content, raw IPs and raw user/couple IDs.
- Workers traces record raw API URLs with IDs and query strings, outbound URLs including push endpoints, D1 SQL text, R2 object keys containing couple IDs, user agent details and coarse geolocation. Workers invocation logs record the raw request URL, response status, outcome and CPU and wall time. [Trace attributes](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/), [Invocation logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/#invocation-logs)
- Cloudflare processes logs, traces, issues and metrics. healthchecks.io receives a timed ping per cron slot from the Worker's IP with no application data.
- Alerts go to the PO's email.

### Delivery phases

1. **Safety and errors (shippable alone, no PoC needed).** Keep OTPs and emails out of production logs and enable Issues.
2. **PoC** (below). On the first alert setup script run, create the error Monitor and confirm that a test error triggers an email. Phase 3 implementation can proceed before the PoC.
3. **Logs, cron and push alerts.** JSON logger, Workers traces, `cron_run` and `queue_batch` events, healthchecks.io pings and the alert setup script. Analytics Engine only if the PoC requires it. This phase makes a push or cron miss visible.
4. **Client errors.** `/api/telemetry`, `ErrorBoundary` and `window.onerror`, rate limit, client source maps.
5. **SLO and runbook.** Record the targets above, the 30-minute post-deploy watch, and a weekly review of Issues, push ratio, cron checks and queue lag.

### Consequences

- The PO learns about a new error, a broken push, a missed cron slot or a stalled queue by email instead of a partner message.
- One external account (healthchecks.io) is added for cron only. If it is down, alerts for cron stop; the app is not affected.
- Cloudflare keeps logs and traces for seven days under the shared allowance.
- Monitors run on a beta SQL API. If it changes, the push and queue alerts need to be re-created; the log events stay the same.
- `failures` and `last_success_at` in `push_subscriptions` become readable through the same outcomes used by the push alert.

## Diagrams

- [Current observability (C4 container)](../diagrams/observability-current.html)
- [Target observability (C4 container)](../diagrams/observability-target.html)

## Alert setup PoC

- **Questions:**
  1. Can a Monitor query JSON fields of Workers logs (`event = "queue_batch"`, summing counts) and email within 5 minutes of crossing a threshold?
  2. Can a Monitor query an Analytics Engine dataset? Only needed if question 1 fails.
  3. How long are Workers logs queryable on the current plan, and is that enough for the daily 98% push check?
  4. Does a test 500 appear as an issue with a stack at `src/worker/...` and trigger the error Monitor email?
- **Pass:** 1 or 2 works with email delivered; 3 gives at least 1 day; 4 gives the right file/line and an email within 5 minutes; logs contain no cookie, body, OTP, email or push endpoint.
- **Scope:** First run of the alert setup script. Use a temporary Worker for the test error.
