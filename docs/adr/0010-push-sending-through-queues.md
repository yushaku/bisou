# ADR 0010: Push sending goes through Cloudflare Queues, one message per device

Status: proposed (November 2026)

## Context
Every push is sent inline today ([ADR 0007](0007-web-push.md)): routes send in `ctx.waitUntil` after the write, and the hourly cron sends every reminder and kind note message in one invocation. On Workers Free an invocation has 50 subrequests and 10 ms of CPU; each push is one `fetch` plus ECDH, HKDF, AES-GCM and an ECDSA signature. ADR 0007 set the limit at about 40 devices per run. A push that fails with 429, 5xx or a network error only adds 1 to `failures` and is never tried again.

Quiet hours are gone (PO, November 2026): every push may be sent at any hour and lives 24 hours (TTL 86400).

Cloudflare Queues is on Workers Free (checked against the Queues pricing and limits pages, updated 30 October 2026): 10,000 operations a day, about 3 per delivered message (write, read, delete) plus 1 read per retry; retention fixed at 24 hours; up to 100 messages per `sendBatch`; a consumer invocation has the same CPU limit as any invocation of the plan. Queues delivers at least once.

## Options considered

Where to send
- **Queues, every push (chosen).** One sending path with retries; the hourly cron only enqueues, so its cost no longer grows with devices. A push sent right after a write arrives about 1 to 2 seconds later (batch wait).
- Queues for the cron only: the route pushes keep a second path without retries. Rejected.
- Workers Paid: lifts the per invocation limits but costs a monthly fee and still has no retry. Rejected for now.
- Durable Object alarms: more code and storage for what Queues gives as configuration. Rejected.

Message content
- **Subscription id plus the rendered message (chosen).** Producers keep their recipient choice, counting, claims and per locale rendering as they are; the consumer only loads the device row by id and sends. Endpoint and keys never leave D1, and a device turned off or signed out while its message waits is skipped by itself.
- The full device row (endpoint, `p256dh`, `auth`): copies personal data into the queue for up to 24 hours (R29). Rejected.
- References only (author, kind, count), rendered by the consumer: moves the counting and wording logic into the consumer and duplicates the producer queries. Rejected.

Failures
- **Retry 429, 5xx and network errors up to 3 times, never past the message's expiry (chosen).** Delay is `Retry-After` when the push service sends one, else 30 s, 2 min, 8 min.
- No retry: Queues would only split the load. Rejected.
- Dead letter queue: costs operations and nothing reads it. Rejected; a final failure is logged and counted in `failures`, as today.

## Decision

Queue and binding
- One queue `bisou`, named like the D1 database and R2 bucket. The same Worker produces and consumes it: `queues.producers` binds `PUSH_QUEUE`, `queues.consumers` sets `max_batch_size` 5, `max_batch_timeout` 1, `max_retries` 3, no dead letter queue. Batch size 5 keeps one consumer invocation within 10 ms of CPU; tune it from `cpuTime` in Workers observability.
- `Env.PUSH_QUEUE: Queue<PushJob>`.

Message
- `PushJob = { id, topic, message: { title, url, tag }, expiresAt }`: `id` is `push_subscriptions.id`, `topic` one of `journal`, `garden`, `notes`, `events`, `message` the payload ADR 0007 already defines (title in the recipient's language, never entry or note text, R8, R9), `expiresAt` the enqueue time plus 24 hours.
- No endpoint, key, user id or locale in a job.

Producers
- `notifyJournal`, `notifyGarden`, `notifyNote`, `remindEvents` and `notifyNotes` keep their queries, `reminder_slot` claims and rendering, and replace the loop of `sendPush` calls with one `enqueuePush(env, jobs)`, which calls `PUSH_QUEUE.sendBatch` in chunks of 100.
- Without `VAPID_PRIVATE_KEY` producers skip as today, so nothing is enqueued.
- A failed `sendBatch` is logged with the topic and job count only. Reminder devices already claimed by `reminder_slot` are not sent again in that slot (R13 rather than a late or double reminder).

Consumer (`queue(batch, env)` in `src/worker/index.ts`, logic in `src/worker/lib/notify.ts` or a new `src/worker/lib/pushQueue.ts`)
- Web Push has no multi device send: each device needs its own encrypted payload and POST (RFC 8291), so one job is one device. The messages of a batch are handled in parallel (`Promise.allSettled`); this cuts wall time, not CPU, so the batch size stays bound by CPU.
- For each message: if `Date.now() >= expiresAt`, ack and drop. Else load `id, endpoint, p256dh, auth` by id; no row, ack. Else `sendPush` with `ttl = floor((expiresAt - now) / 1000)`.
- `sendPush` returns `sent`, `gone`, `retry` (429, 5xx, network error, with `retryAfter` seconds when given) or `failed` (other statuses). It keeps its D1 updates: `sent` clears `failures`, `gone` deletes the row, `retry` and `failed` add 1 to `failures`.
- `sent`, `gone`, `failed`: ack. `retry`: `message.retry({ delaySeconds })` while `message.attempts <= 3` and `now + delay < expiresAt`, else ack. A D1 error while loading or updating the device counts as `retry`.
- One log line per batch with counts only: sent, gone, retried, dropped, failed. Never an endpoint, key, payload or response body (ADR 0007 Privacy).

Duplicates and order
- Producer claims stay, so a cron rerun enqueues nothing twice. The queue may still deliver a job twice; the device then shows one notification, because the same `tag` replaces the earlier one and the push service collapses by `Topic`. Accepted, no sent log table.
- Order between jobs is not guaranteed. Two journal pushes from one author carry the same title, so the order is invisible.

Local dev, tests and deploy
- `wrangler dev` and the Vitest pool run the queue locally from `wrangler.jsonc`; no setup.
- Producer tests assert the jobs enqueued; consumer tests use `createMessageBatch` and `getQueueResult` from `cloudflare:test` for ack, retry with delay, expiry drop and deleted device. Existing end to end push tests run the consumer on the enqueued jobs.
- Before the merge that ships this, the queue must exist on the production account (`wrangler queues create bisou`, done by the PO on 11 November 2026); deploy fails without it.
- No migration.

Privacy
- A job holds a subscription id and a rendered title (the partner's display name or event names) in Cloudflare Queues for at most 24 hours. Notifications spec R27 says so.

## Consequences
- Cron and route invocations no longer send, so their subrequests and CPU no longer grow with devices; each consumer invocation handles at most 5 pushes.
- Transient push service errors get up to 3 retries within the 24 hour TTL.
- Budget: about 3 operations per push, so about 3,000 pushes a day fit in the Free plan's 10,000 operations, minus retries.
- A push sent after a write arrives about 1 to 2 seconds later than today.
- Each push needs a D1 read by id in the consumer.
- Removes the "move to Queues before about 40 devices" shortcut in `remindEvents` and the matching line of ADR 0007.
