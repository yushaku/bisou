# ADR 0018: Cloudflare observability with optional cron heartbeats

Status: accepted (November 2026), revised 26 November 2026

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
| API server errors | 5xx ≤ 1% of requests per 15 minutes | Workers Issues and the dashboard |
| Cron | `notes` each minute, 07/08/20/03 daily | `cron_run` in Workers Logs and optional healthchecks.io checks |
| Push | ≥ 98% delivered per day | Delivery counts in Workers Logs |
| Queue | p95 lag from enqueue to consume < 60 s | Queue lag in Workers Logs |
| API latency | p95 < 800 ms; push enqueue p95 < 2 s | Dashboard only, no alert |
| Retention | 7 days for logs and traces under the shared allowance | |
| Cost | 0 USD/month; revisit only when a quota is reached | |
| Application log privacy | Metadata only, with the local login exception below | [Safety and privacy](#safety-and-privacy) also describes traces and invocation logs |

Cloudflare facts, checked on 26 November 2026 from Cloudflare docs and changelog:
- Workers Issues groups uncaught exceptions, failed invocations, 5xx responses and error-level logs (`observability.issues.enabled`). Its automations support coding agents, webhooks, chat and incident management. [Issues automation destinations](https://developers.cloudflare.com/workers/observability/issues/automations/)
- Wrangler uploads Worker source maps by default from 4.150.0. The repo requires `^4.166.0`.
- From 1 December 2026 Workers Logs moves to the unified observability pricing ($0.25/GB ingested, $0.10/GB-month stored beyond the allowance). Analytics Engine Free includes 100,000 writes/day and keeps data for three months.
- Cron Triggers have had reported dispatch incidents (Cloudflare community, October 2026) where the handler never ran. Nothing inside the Worker can report a run that never started.

## Options considered

**A. Cloudflare-native plus an external heartbeat (chosen).** Issues for grouping errors, structured JSON logs, Workers traces and optional healthchecks.io pings for cron. No new npm dependency, 0 USD.

**B. Sentry for errors and performance.** `@sentry/cloudflare` plus `@sentry/react` gives grouping, releases, client stack traces and 30-day retention on the Developer plan (0 USD, one user, 5,000 errors/month; Team 26 USD/month). Rejected for now: it adds dependencies and a vendor while still needing something else for cron, Queue and push. Revisit if client errors need release-by-release grouping or 30-day retention.

**C. OpenTelemetry export to an external backend.** Workers can export logs and traces over OTel to Grafana Cloud, Better Stack or Datadog. Rejected for now: another account, secret and billing, plus retention/cost that needs its own PoC, for a system with one runtime.

**Cron alerts inside Cloudflare only** were considered and rejected: a Monitor or a self-check in the same cron cannot report that the cron itself stopped dispatching.

## Decision

### Signals

1. **Issues.** Set `observability.issues.enabled` for grouping and stacks. Source maps rely on Wrangler's default upload.
2. **Structured logs.** One JSON object per log line with `event`, `level`, `requestId`, `route` (matched path, never the raw URL), `method`, `status`, `durationMs`, `release` (git SHA injected at build), `errorCode`, and counts/topic/outcome where relevant. `requestId` is `cf-ray` for HTTP requests, and `crypto.randomUUID()` for cron and queue invocations, which have no request header. The logger in `src/worker/lib/` passes the entry object to the console so Workers Logs can index its fields. Emit one request error event for an API request that throws or returns a 5xx. For thrown errors, keep the stack frames and use the scrubbed message as the first line.
3. **Business events.** Emitted as structured log events first:
   - `cron_run`: slot (`notes`, `07`, `08`, `20`, `03`), outcome, durationMs, requestId, release.
   - `queue_batch`: topic counts, batchSize, sent, gone, retried, dropped, failed, lagP95Ms, release.
   - `client_error` (phase 4): route, errorName, stackHash, release, userAgentFamily.
   Queue lag is computed from the existing `PushJob.expiresAt`: `now - (expiresAt - PUSH_LIFETIME_MS)`. No new field in `PushJob`, so jobs already in the queue at deploy time still work. One `queue_batch` event per batch replaces the separate `push_result` event of the first version; topic counts stay inside it.
4. **Cron heartbeat and dashboard.** The PO reads the Cloudflare dashboard. Automated alerting is deferred. If the PO creates the five healthchecks.io checks by hand, the Worker pings each configured slot after it finishes. A failed run pings the `/fail` URL. Requests carry no body. The ping URLs live in the `HEALTHCHECKS_URLS` Worker secret. [Manual setup](../observability.md#optional-cron-heartbeats)
5. **Client errors (phase 4).** `POST /api/telemetry` behind the session, body limit 2 KB, same-origin guard, at most 20 reports per user per minute through the Workers Rate Limiting binding. Fields: route, error name, a normalized stack hash, release, browser family. No user text, URL query, email, user id or couple id. Client source maps are uploaded in this phase, not before.
6. **Workers traces.** Enable tracing with `head_sampling_rate: 1`. Starting 1 December 2026, Workers Logs, Workers Traces and Issues share the account's Free allowance of 0.5 GB per day. Cloudflare pauses ingestion at the limit until 00:00 UTC. Read ingestion in the Cloudflare dashboard. If it approaches the limit, lower the trace sampling rate, for example to 0.2. [Cloudflare Observability pricing](https://developers.cloudflare.com/observability/pricing/)

### Safety and privacy

- When `RESEND_API_KEY` is missing, log the login code and test email only if `ENVIRONMENT === "development"`. Other environments log mail unavailability without either field.
- Use hashed ids only if correlation becomes necessary: HMAC with a secret salt, never a raw id. Phases 1 and 2 need no user/couple identifiers.
- Application logs exclude request bodies, cookies, Authorization headers, emails outside the development mail case, push endpoints and keys, payloads, titles, journal/note content, raw IPs and raw user/couple IDs.
- Workers traces record raw API URLs with IDs and query strings, outbound URLs including push endpoints and healthchecks.io ping URLs, D1 SQL text, R2 object keys containing couple IDs, user agent details and coarse geolocation. Workers invocation logs record the raw request URL, response status, outcome and CPU and wall time. [Trace attributes](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/), [Invocation logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/#invocation-logs)
- Cloudflare processes logs, traces, issues and metrics. healthchecks.io receives a timed ping per cron slot from the Worker's IP with no application data.

### Delivery phases

- **Phase 1, safety and errors.** Keep OTPs and emails out of production logs and enable Issues.
- **Phase 3, logs and heartbeats.** JSON logger, Workers traces, `cron_run` and `queue_batch` events, and optional healthchecks.io pings.
- **Phase 4, client errors.** `/api/telemetry`, `ErrorBoundary` and `window.onerror`, rate limit, client source maps.
- **Phase 5, SLO and runbook.** Record the targets above, the 30-minute post-deploy watch, and a weekly review of Issues, push ratio, cron checks and queue lag.

### Consequences

- The PO checks the dashboard for errors, push outcomes, cron results and queue lag.
- The optional healthchecks.io account gives the PO a view of missed cron runs. Ping failures are logged as warnings. Cron jobs keep their own outcomes.
- Cloudflare keeps logs and traces for seven days under the shared allowance.

## Diagrams

- [Current observability (C4 container)](../diagrams/observability-current.html)
- [Target observability (C4 container)](../diagrams/observability-target.html)
