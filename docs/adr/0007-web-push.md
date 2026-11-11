# ADR 0007: Web Push sent by the Worker with WebCrypto, one hourly cron, no queue table

Status: proposed (November 2026)

## Context
Partners turn notifications on per device for two kinds: the partner's new journal entry and event reminders at 20:00 the day before and 08:00 on the day, Vietnam time, with quiet hours from 22:00 to 07:00 ([notifications spec](../product/notifications.md)). The app is one Worker on Workers Free (10 ms CPU and 50 subrequests per invocation, a handful of Cron Triggers per account) with D1 ([ADR 0001](0001-cloudflare-workers-d1-r2.md)), and a PWA whose service worker vite-plugin-pwa generates ([ADR 0003](0003-pwa-instead-of-native.md)). iPhone delivers Web Push only to the installed app (iOS 16.4 or later). Today one cron, `0 20 * * *` (03:00 in Vietnam), runs cleanup.

A push message must be encrypted for the device (RFC 8291, `aes128gcm` from RFC 8188) and signed for the push service with VAPID (RFC 8292), then POSTed to the device's endpoint (RFC 8030).

## Options considered

Encryption and VAPID
- **Own module on WebCrypto (chosen).** workerd has every primitive natively: ECDH P-256, HKDF and HMAC SHA-256, AES-128-GCM, ECDSA P-256 (its raw `r || s` signature is the JWS ES256 format as is). About 120 lines, tested byte for byte against the RFC 8291 Appendix A example.
- `web-push` (npm): written for Node `crypto` and `https`, with several dependencies (`http_ece`, `asn1.js`, `jws`, `https-proxy-agent`). Not built for workerd. Rejected.
- WebCrypto libraries for edge runtimes, such as `@pushforge/builder` and `@block65/webcrypto-web-push`: they run on Workers, are small with few or no dependencies, and each is maintained by one person. Their current size and last release were not checked in this run (no registry access); check with `npm view <name> dist.unpackedSize time.modified` before any choice. Rejected for now: they save about 120 tested lines, and any new dependency needs the PO's OK.

Cron
- **One hourly trigger `0 * * * *` that dispatches by Vietnam hour (chosen).** It uses one trigger of the account, replaces today's cleanup trigger, and later jobs (the daily question) need no new trigger. 24 invocations a day; the 20 hours with no job return before touching D1.
- Four exact triggers (00:00, 01:00, 13:00 and 20:00 UTC): uses most of the Free account's triggers and every new job needs another. Rejected.

Night journal entries
- **Recompute at 07:00 from `journal_entries` created since 22:00 (chosen).** A deleted entry is left out by itself (R18), the count comes from the rows (R17), and nothing needs cleanup. Needs one index on `created_at`.
- A pending queue table: more writes, a delete path to keep in sync with entry deletion, and its own cleanup. Rejected.

Idempotency
- **Claim columns on the subscription (chosen).** `journal_slot` holds the Vietnam day of the last 07:00 release sent to that device, `reminder_slot` the last reminder run (`YYYY-MM-DDTHH`). The cron claims and selects in one `UPDATE ... WHERE slot IS NOT the new one RETURNING`, so a repeated run sends nothing twice and a new device is never skipped. Nothing to clean up.
- A sent log table keyed by user and slot: one more table and a cleanup rule. Rejected.

Service worker
- **`workbox.importScripts: ["/push-sw.js"]` with a small hand written `public/push-sw.js` (chosen).** The generated service worker and its verified caching (skipWaiting, navigate fallback, API never cached) stay as they are; no dependency is added.
- `injectManifest` with our own TypeScript service worker: we would rewrite the precache and routing setup and add `workbox-precaching` and `workbox-routing` as direct dependencies. Rejected.

## Decision

Keys
- One secret, `VAPID_PRIVATE_KEY`: the P-256 key pair as a JWK JSON string (`kty`, `crv`, `x`, `y`, `d`). The public key (`0x04 || x || y`, base64url) is derived from it, so the public and private halves can never disagree, and no var holds it. `scripts/vapid-key.mjs` prints a new JWK with Node WebCrypto.
- Production: the PO runs the script and `wrangler secret put VAPID_PRIVATE_KEY` before merge. Losing or rotating the key ends every subscription; each device must turn notifications on again.
- Local dev: `.dev.vars.example` carries a generated dev only key. Tests: `vitest.config.ts` binds a generated test only key, so CI needs no secret.
- Without the secret, `GET /api/push` returns `publicKey: null`, the Notifications page says unavailable, and senders skip with one log line.
- VAPID `sub` is the constant `mailto:no-reply@mail.yuchi-education.com` (the domain Bisou already sends mail from); JWT `aud` is the endpoint's origin, `exp` 12 hours ahead.

Schema (migration 0010, additive)
- `push_subscriptions`: `id` TEXT PK, `user_id` FK users ON DELETE CASCADE, `endpoint` TEXT NOT NULL UNIQUE (at most 2048 characters), `p256dh` TEXT, `auth` TEXT, `journal` and `reminders` INTEGER 0 or 1, `journal_slot` TEXT NULL, `reminder_slot` TEXT NULL, `failures` INTEGER default 0, `created_at` INTEGER, `last_success_at` INTEGER NULL.
- Indexes: the UNIQUE autoindex on `endpoint` (upsert, delete, sign out); `push_subscriptions_user (user_id, created_at)` (a user's devices, sends to the partner, claims, the per user cap); `push_subscriptions_reminders (reminders, user_id)` (the reminder cron's driving query is a SEARCH, not a SCAN); `journal_entries_created (created_at)` (the 07:00 window).
- A row exists only while at least one kind is on (R28): turning both off deletes it.

API (session required, origin guarded like every write)
- `GET /api/push` returns `{ publicKey: string | null, devices: { endpoint, journal, reminders }[] }` for the caller's own devices; the client finds its own by comparing endpoints. Endpoints never go in a URL, because URLs are logged.
- `PUT /api/push/subscription` with `{ endpoint, keys: { p256dh, auth }, journal, reminders }` upserts on `endpoint` and returns `{ device }`, or `{ device: null }` after deleting when both are false. Requires a couple of two (404 `not_in_couple`, R4). 503 `push_unavailable` without the key. At most 10 devices per user: the same batch deletes the oldest beyond 9 others. An endpoint already stored for another user moves to the caller, since only the browser holding it can produce it.
- `DELETE /api/push/subscription` with `{ endpoint }` deletes the caller's row; idempotent.
- `POST /api/auth/logout` takes an optional `{ endpoint }` and deletes that row of the session's user in the same batch as the session (R26).
- Validation: `endpoint` is an absolute `https:` URL with no credentials or port on an allow listed push host (`fcm.googleapis.com`, `web.push.apple.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`), which blocks SSRF; `p256dh` decodes to 65 bytes starting with `0x04` and imports as a P-256 key; `auth` decodes to 16 bytes. Anything else is 400 `invalid_subscription`.

Sending
- `src/worker/lib/webpush.ts`: `encrypt` (RFC 8291 with a fresh ephemeral key and salt per message, record size 4096, one record), `vapidHeader`, `isPushEndpoint`, and `sendPush(env, row, message, options)` that POSTs with `Content-Encoding: aes128gcm`, `TTL`, `Urgency: normal` and `Topic` (`journal` or `events`).
- Payload: `{ title, url, tag }`, rendered on the server in the recipient's language (R31) from the client message catalogs. The title holds only the author's display name or the event names (R5, R10, R17). Never entry text, photos, entry day, wish data or anything about spins, claims or jars (R8, R9).
- TTL is the time left until the next 22:00 in Vietnam, so a message the device could not receive in time is dropped instead of showing in quiet hours or a day late (R13, R16).
- Response: 2xx sets `last_success_at` and `failures = 0`; 404 or 410 deletes the row (R28); anything else adds 1 to `failures` and is logged with the status only.
- Journal: after the entry is saved (`POST /api/journal` and `POST /api/wishes/:id/received`, R6), `ctx.waitUntil` sends to the partner's devices with `journal = 1`; the author's devices never receive it (R7). Between 22:00 and 07:00 Vietnam time nothing is sent then.
- Cron `0 * * * *` dispatches on `controller.scheduledTime` in Vietnam time: 03:00 cleanup (unchanged), 07:00 night journal release, 08:00 reminders for today, 20:00 reminders for tomorrow. No catch-up hour: a run never sends a reminder late (R13). An event is reminded as it stands at run time (R14).
- Night release: entries with `created_at` in [22:00, 07:00) grouped by author in code; one message per recipient device, claimed with `journal_slot`.
- Reminders: devices with `reminders = 1`, their couples loaded once each, `upcomingEvents` per recipient with only the partner as a person (no reminder of one's own birthday, R12), events of the target day joined in list order in one message (R11), claimed with `reminder_slot`.

Client
- `public/push-sw.js` (imported by the generated service worker): `push` always shows a notification (iOS revokes a subscription that shows none), with `tag` so a new journal message replaces an older one (R19); a payload it cannot read shows "Bisou". `notificationclick` focuses an open window or opens one, at the payload `url` only when it is a same origin path, else `/`.
- Permission comes only from a tap (R1): `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` is the first await in the tap handler, so the registration and public key are loaded before the button is enabled. iPhone in a browser tab and browsers without `PushManager` show their own states (R20).
- Settings > Notifications at `/settings/notifications`, shown to partners only: device state and one switch per kind; the last kind turned off deletes the row and unsubscribes the browser.
- Home card in the installed app only, for a device whose permission is still `default` with no subscription and no dismissal stored (R23 to R25).
- Sign out sends the device's endpoint with the logout request, then unsubscribes locally (R26).

Privacy
- Endpoint, `p256dh` and `auth` are personal data: kept only as R27 and R28 say, sent only to that endpoint's push service (R29), deleted with the user by CASCADE.
- Logs carry kinds, counts and HTTP statuses only: never an endpoint, key, payload, push service response body or a fetch error message (which may contain the URL).

## Consequences
- No new dependency and no new table besides `push_subscriptions`; the crypto is pinned by the RFC example in a test.
- Cleanup now runs inside the hourly dispatcher at 03:00; `scheduled` returns early in the other hours.
- A journal message the device does not receive before 22:00 is dropped, and a reminder is never sent late; both follow the quiet hours rule rather than delivery at any cost.
- A session that expires without a sign out keeps its device subscribed; a device that turns notifications on again for another account moves the row to that account.
- One cron invocation sends to every device. On Workers Free each push is one subrequest of 50 and a few ms of CPU; past about 40 devices per run, move sending to Queues or the paid plan.
- The day before reminder runs at 20:00, so an event added after 20:00 for the next day gets only its 08:00 reminder (R13).

## Superseded in part (November 2026)

The PO cancelled quiet hours. The text above is kept as written; where it differs, this note wins.
- No push is held or dropped by the hour: journal, garden and kind note pushes are sent at once at any time.
- Every push has a fixed TTL of 24 hours (86400 s), event reminders included, so a device that was offline may show a reminder late (R13 still stops Bisou itself from scheduling late reminders). The "TTL until the next 22:00" rule is gone.
- The 07:00 night journal release and its combined "wrote N entries" message are removed; each entry sends its own push and the existing tag lets a newer one replace an older one (R19). The 07:00 cron keeps only the kind note dispatch.
- `push_subscriptions.journal_slot` and the index `journal_entries_created` are no longer used; they stay in the schema because migrations are additive only.
- Sending now goes through Cloudflare Queues, one message per device, with retries; see [ADR 0010](0010-push-sending-through-queues.md). The "move to Queues before about 40 devices" limit is gone.
