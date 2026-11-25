# ADR 0018: Backend observability stays Cloudflare-native, with alerts on errors, cron and push

Status: accepted (November 2026)

## Context

The PO asked whether the backend has observability and said it is needed. It has some: `wrangler.jsonc` sets `observability.enabled`, so Workers Logs and built-in metrics exist, and routes log failures with `console.error` (`src/worker/app.ts`, `src/worker/lib/pushQueue.ts`, `src/worker/lib/notify.ts`, `src/worker/lib/webpush.ts`, `src/worker/index.ts`).

It is not enough to operate the app:
- Workers Issues is not enabled: failures are not grouped and nobody is notified. Source maps are not uploaded, so a stack points into the built bundle.
- Logs are free-text `[bisou] ...` lines with no request id, route, status, duration or release; they cannot be queried or aggregated reliably.
- No alert or SLO exists. `push_subscriptions.failures` and `last_success_at` are written but never read; a push outage is invisible until a partner reports it.
- Cron has no heartbeat: a missed 07:00, 08:00 or 20:00 slot is only discovered later.
- Client errors never leave the device; `ErrorBoundary` only calls `console.error`.
- `src/worker/lib/mail.ts` logs the email and the login code when `RESEND_API_KEY` is missing. If the secret were missing in production, logs would contain one-time codes.

Bisou is one Worker on Workers Free: a few hundred API requests a day, two people per couple, 5 USD/month would be a real cost. Notifications are a core feature (ADR 0007, ADR 0010), so losing a push or a reminder matters more than a slow page.

Targets, agreed with the PO:

| Target | Value |
|---|---|
| API server errors | 5xx ≤ 1% of requests per 15 minutes; alert at ≥ 3 in 5 minutes |
| Cron | every expected 07/08/20/03 slot runs; alert when a slot is > 10 minutes late |
| Push | ≥ 98% delivered per day; alert when failed+gone > 5% over 15 minutes (minimum 20 attempts) |
| Queue | p95 lag from enqueue to consume < 60 s; alert when > 5 minutes |
| API latency | p95 < 800 ms; push enqueue p95 < 2 s |
| Retention | 7 days for logs/traces (Cloudflare), 90 days for aggregated metrics (Analytics Engine) |
| Cost | 0 USD/month; revisit only when a quota is reached |
| Privacy | metadata only: no email, cookie, request body, push endpoint/keys, journal/note text, or raw user/couple id |

Cloudflare limits checked on 25 November 2026: Workers Logs is included in Free and Paid. Free is 200,000 log events/day with 3-day retention today; from 1 December 2026 it moves to the shared Observability allowance of 0.5 GB/day with 7-day retention. Workers Issues is in that allowance. Analytics Engine Free includes 100,000 data points written/day and 10,000 read queries/day; written data is kept for three months. Workers Paid is 5 USD/month with 50 GB/cycle and 10 GB-month storage. Cloudflare Alerts/Monitors can query SQL API datasets on a schedule and deliver email or webhooks on every plan.

## Options considered

**A. Cloudflare-native (chosen).** Enable Issues and source maps, standardize JSON logs, write a small Analytics Engine dataset for push/cron/queue events, and add Monitors that email the PO. Client errors arrive through a small Worker endpoint later. No new dependency, no third party, 0 USD.

**B. Sentry for errors and performance.** `@sentry/cloudflare` plus `@sentry/react` gives grouping, releases, client stack traces and 30-day retention on the Developer plan (0 USD, one user, 5,000 errors/month; Team 26 USD/month). Rejected for now: it adds dependencies and a vendor while still requiring Cloudflare-native alerts for cron, Queue and push; the 0 USD single-user plan fits, but the app does not yet have enough error volume to justify the extra surface. Revisit if client errors need release-by-release grouping or 30-day retention.

**C. OpenTelemetry export to an external backend.** Workers can export logs and traces over OTel; a Tail Worker or Observability export sends them to Grafana Cloud, Better Stack or Datadog. Rejected for now: another account, secret and billing, plus retention/cost that needs its own PoC, for a system with one runtime.

## Decision

### Signals

1. **Issues + source maps.** Set `observability.issues.enabled` and `upload_source_maps: true` in the Worker build. Issues groups uncaught exceptions, failed invocations, 5xx responses and error logs; the PO receives email when a new issue appears. Source maps must cover both Vite chunks and the Worker bundle.
2. **Structured logs.** One JSON object per log line with `event`, `level`, `requestId` (the Cloudflare `cf-ray`), `route` (matched path, never the raw URL), `method`, `status`, `durationMs`, `release` (git SHA injected at build), `errorCode`, and counts/topic/outcome where relevant. A logger in `src/worker/lib/` does the shaping; call sites stop building strings. No body, cookie, `Authorization`, email, push endpoint, `p256dh`, `auth`, title or note text. Error messages are scrubbed before they are logged.
3. **Analytics Engine dataset `bisou_metrics`.** One binding, `METRICS`. Events:
   - `api_error`: route, method, status, errorCode, release; doubles: durationMs, count 1.
   - `cron_run`: slot (`07`, `08`, `20`, `03`), outcome, release; doubles: durationMs, count 1.
   - `push_result`: topic, outcome (`sent`, `gone`, `retry`, `dropped`, `failed`), release; doubles: count.
   - `queue_batch`: release; doubles: batchSize, sent, gone, retried, dropped, failed, lagP95Ms.
   - `client_error` (phase 3): route, errorName, release, userAgentFamily; doubles: count.
   Analytics Engine is aggregate data, not a log sink: no ids and no free text.
4. **Alerts by email.** Cloudflare Monitors query the dataset (or Workers metrics where a dataset is not needed):
   - `5xx ≥ 3 in 5 minutes` on `api_error`, plus Issues for grouping.
   - `push failure ratio > 5% in 15 minutes` with at least 20 attempts.
   - `cron_run count = 0` for an expected slot 10 minutes after it was due.
   - `queue_batch lagP95Ms > 300000` (5 minutes) or no consumer batch in 15 minutes.
   Each alert carries the route/topic/slot, release and counts only. Webhook delivery can be added later without changing the signals.
5. **Client errors (phase 3).** `POST /api/telemetry` behind the session, body limit 2 KB, 20 reports per user per minute, same-origin guard. Fields: route, error name, a normalized stack hash, release, browser family. No user text, URL query, email, user id or couple id. The endpoint writes `client_error` to Analytics Engine; it is not a general log collector.

### Safety and privacy

- Fix `mail.ts` first: never log the email or the code unless `ENVIRONMENT === "development"` and the request is local. In production, log only that mail is unavailable, without the recipient or code.
- Use hashed ids only if correlation becomes necessary: HMAC with a secret salt, never a raw id. Phase 1 needs no user/couple identifiers at all.
- Do not log request bodies, cookies, headers, push endpoints, keys, payloads, titles, journal/note content, or raw IP.
- Cloudflare is the only processor of telemetry. No Sentry/OTel destination is added by this decision.
- Alerts go to the PO's email; up to 20 recipients are supported if a second person joins operations.

### Delivery phases

1. **Safety and signal (shippable alone).** Fix OTP/email logging; enable Issues and source maps; add the JSON logger; send a test error and confirm email. No product behavior changes.
2. **Business metrics and alerts.** Add the Analytics Engine binding and the four events; add `enqueuedAt` to `PushJob` to measure queue lag; create the Monitors and document thresholds. This is the phase that makes a push or cron miss visible.
3. **Client errors.** Add `/api/telemetry`, wire `ErrorBoundary` and `window.onerror`, rate-limit and scrub. Ship behind a release flag if needed.
4. **SLO and runbook.** Record the targets above, the post-deploy watch (30 minutes), and a weekly review of Issues, push ratio, cron heartbeats and queue lag.

### Consequences

- The PO learns about a broken push, a missed cron slot or a 5xx burst by email instead of a partner message.
- Logs stay for 7 days and metrics for 90 days; there is no full request tracing and no third-party error UI.
- On Free, observability ingestion stops at 0.5 GB/day (from 1 December 2026) and Analytics Engine at 100,000 writes/day. Current traffic is far below both; if either is reached, sample logs or pay 5 USD/month for Workers Paid.
- The Team plan is not needed at this volume; Sentry can be added later for client grouping without changing the backend signals.
- Alerts are configured in the Cloudflare dashboard, not in this repository. The ADR records the thresholds; a screenshot or exported configuration should be attached to the runbook so the setup can be recreated.
- `failures` and `last_success_at` become useful: the dashboard can read them, and push alerts use the same outcomes.

## PoC before implementation

- **Question:** On Workers Free, with `observability.issues.enabled` and `upload_source_maps`, does a thrown 500 in staging appear as a grouped issue with a stack pointing at `src/worker/...` and an email within 2 minutes? Can a Monitor query the `bisou_metrics` Analytics Engine dataset and deliver an email within 5 minutes?
- **Pass:** issue visible in under 2 minutes; correct file/line; email delivered; Monitor fires at the configured threshold; logs contain no cookie, body, OTP, email or push endpoint.
- **Scope:** branch `poc/observability-issues`, staging only, throwaway, never merged; no production change.
