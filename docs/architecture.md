# Bisou architecture

Private PWA for one couple: shared journal with photos, milestone timeline, secret wish jar. Scope: [ideas/bisou.md](ideas/bisou.md), plan: [../todo.md](../todo.md).

Diagrams (open in a browser, specs beside them):

- [system-architecture.html](system-architecture.html) ([spec](system-architecture.json)): components and trust boundary.
- [otp-login-sequence.html](otp-login-sequence.html) ([spec](otp-login-sequence.json)): email OTP login, session cookie, `/api/me`.

Decisions: [ADR 0001](adr/0001-cloudflare-workers-d1-r2.md) Cloudflare Workers + D1 + R2, [ADR 0002](adr/0002-email-otp-via-resend.md) email OTP via Resend, [ADR 0003](adr/0003-pwa-instead-of-native.md) PWA instead of native.

Status legend: **built** = todo step 1 (login spike), **planned** = later todo steps, design may still change.

## 1. Overview

| Part | Technology | Notes |
|---|---|---|
| Client | React + Vite + TypeScript PWA, Tailwind v4 | Installable on iPhone and Android. vi + en. UI follows [DESIGN.md](../DESIGN.md). |
| Server | One Cloudflare Worker, Hono, built with `@cloudflare/vite-plugin` | Serves static assets and `/api/*`. Free plan: Web Crypto only, no native hashing libs. |
| Data | D1 (SQLite), binding `DB`, migrations in `/migrations` | Times are Unix epoch milliseconds. |
| Photos | R2, private bucket (planned binding `PHOTOS`) | Served only through the Worker after session and couple checks. |
| Mail | Resend free over `fetch`, sender `no-reply@mail.yuchi-education.com` | OTP codes only. |
| Hosting | `*.workers.dev` | Custom domain later (not in MVP). |

Source layout: `src/client` (React app, `i18n/`), `src/worker` (`app.ts`, `routes/`, `middleware/`, `lib/`), `src/shared/types.ts` (types shared by both), `migrations/`, `test/` (Vitest with the Workers pool).

## 2. Runtime and request flow

1. Navigation or asset request: Workers static assets answer directly (`not_found_handling: single-page-application`). The Worker script does not run, so these requests do not count against the Worker request quota.
2. `/api/*`: `assets.run_worker_first: ["/api/*"]` routes to Hono (`src/worker/app.ts`, base path `/api`). Middleware order:
   1. `Cache-Control: no-store` on every API response.
   2. `originGuard`: any method other than GET/HEAD/OPTIONS needs an `Origin` header whose host equals the request host, else `403 forbidden_origin`.
   3. `requireSession`: every route except `/api/auth/*` needs a valid `bisou_session` cookie, else `401 unauthorized` (and the stale cookie is cleared).
3. Route modules: `routes/auth.ts`, `routes/me.ts` (built). Planned: `couple`, `journal`, `wishes`, `photos`.
4. Errors: JSON `{ error: "<code>" }`; unknown routes `404 not_found`; unhandled `500 server_error` (logged, Workers observability on).

## 3. Auth flow (built)

See [otp-login-sequence.html](otp-login-sequence.html).

| Step | Endpoint | Behavior |
|---|---|---|
| Request code | `POST /api/auth/request {email, lang}` | Normalize email (trim, lowercase). Rate limit per email: 1 per 60 s, 5 per hour (from `otp_requests`), else `429 rate_limited` with `retryAfter`. Generate uniform 6 digit code, store `HMAC-SHA256(OTP_PEPPER, email + ":" + code)` in `otp_codes` (one live code per email, upsert resets attempts), send mail in `lang`. Response is `{ok: true}` whether the address is known or not, and whether Resend succeeded or not. |
| Verify | `POST /api/auth/verify {email, code, lang}` | Code expires after 10 min. Attempt counter is incremented atomically before the HMAC check (`UPDATE ... WHERE attempts < 5 RETURNING`), so parallel guesses cannot exceed 5. Constant time compare via `crypto.subtle.verify`. On success the code row is deleted (single use), the user is found or created (`INSERT OR IGNORE`), and a session is created. |
| Session | cookie `bisou_session` | 32 random bytes (base64url). D1 stores only SHA-256 of the token. Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=90 days`. Sliding: when less than 60 days remain, expiry is pushed to now + 90 days and the cookie is re-sent. |
| Who am I | `GET /api/me`, `PATCH /api/me {displayName, locale}` | Returns `{user}`. |
| Logout | `POST /api/auth/logout` | Deletes the session row and clears the cookie. |

Error codes: `invalid_email`, `invalid_code` (with `attemptsLeft`), `code_expired`, `too_many_attempts`, `rate_limited`, `unauthorized`, `forbidden_origin`.

Local dev: without `RESEND_API_KEY` the code is printed to the dev server log and, only when `ENVIRONMENT=development`, the response carries a `devNote`.

## 4. Data model

### Built (migration `0001_auth.sql`)

| Table | Columns | Keys and indexes |
|---|---|---|
| `users` | `id TEXT` (UUID), `email TEXT NOT NULL`, `display_name TEXT NULL`, `locale TEXT NOT NULL DEFAULT 'vi'` (`vi`/`en`), `created_at INTEGER` | PK `id`; UNIQUE `email` |
| `otp_codes` | `email TEXT`, `code_hash TEXT` (hex HMAC), `expires_at INTEGER`, `attempts INTEGER DEFAULT 0`, `created_at INTEGER` | PK `email` (one live code per email) |
| `otp_requests` | `id INTEGER AUTOINCREMENT`, `email TEXT`, `created_at INTEGER` | PK `id`; index `(email, created_at)`; rows older than 1 h are deleted on the next request for that email |
| `sessions` | `token_hash TEXT` (hex SHA-256), `user_id TEXT`, `created_at INTEGER`, `expires_at INTEGER` | PK `token_hash`; FK `user_id -> users.id ON DELETE CASCADE`; index `user_id` |

### Planned (later todo steps, names indicative)

| Table | Step | Columns | Keys and rules |
|---|---|---|---|
| `couples` | 2 | `id`, `start_date TEXT` (YYYY-MM-DD, for the days-together counter), `created_at` | PK `id` |
| `couple_members` | 2 | `user_id`, `couple_id`, `joined_at` | PK `user_id` (a user belongs to at most one couple); FK `couple_id`; at most 2 rows per couple, checked in the redeem batch |
| `pair_codes` | 2 | `code TEXT` (6 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, no 0/O, 1/I/L), `creator_id`, `expires_at`, `created_at` | PK `code`; one live code per creator; redeem creates `couples` + 2 `couple_members` and deletes the code in one D1 batch (single use); creator cannot redeem own code |
| `journal_entries` | 3, 4, 7 | `id`, `couple_id`, `author_id`, `entry_date TEXT`, `body TEXT`, `is_milestone INTEGER`, `milestone_title`, `milestone_icon`, `wish_id NULL`, `created_at`, `updated_at` | PK `id`; index `(couple_id, entry_date)`; partial index on milestones; UNIQUE `wish_id` (one entry per done wish) |
| `photos` | 3, 5, 7 | `id` (UUID), `couple_id`, `uploader_id`, `kind` (`journal`/`wish`/`done`), `r2_key`, `content_type`, `bytes`, `width`, `height`, `entry_id NULL`, `wish_id NULL`, `created_at` | PK `id`; UNIQUE `r2_key` |
| `wishes` | 5, 7 | `id`, `couple_id`, `owner_id`, `title`, `photo_id NULL`, `price INTEGER` (VND, whole units), `link NULL`, `priority INTEGER`, `status` (`open`/`done`), `done_at NULL`, `done_photo_id NULL`, `created_at`, `updated_at` | PK `id`; index `(owner_id, status, price)` for the spin query |
| `wish_claims` | 6 | `wish_id`, `claimer_id`, `created_at` | PK `wish_id` (one claim per wish); FK `wish_id ON DELETE CASCADE`; `claimer_id` must be the owner's partner |

## 5. Authorization rules

| Area | Rule |
|---|---|
| All `/api` except `/api/auth/*` | Valid session required. Every query is scoped by `user.id` from the session, never by an id sent by the client. |
| Profile | A user reads and edits only their own `users` row. |
| Pairing (planned) | Create code only when not in a couple. Redeem only when not in a couple and the code is live. Couple id always comes from `couple_members` of the session user. |
| Journal (planned) | Both members read all entries of their couple. Create: author = session user. Edit and delete: author only (proposal; both partners editing is a product choice to confirm). |
| Photos (planned) | Upload needs a couple. `GET /api/photos/:id` loads the `photos` row and serves it only if `photos.couple_id` equals the caller's couple; wish photos additionally follow the wish rules below. |
| Wish jar (planned) | See below. |

### Wish secrecy (key privacy rule)

- **Owner endpoints** (`GET/POST/PATCH/DELETE /api/wishes`, mark done): read only `wishes` where `owner_id = session user`. They never join or read `wish_claims`, so no response field, status code, error message or ordering can depend on a claim. Editing or deleting a claimed wish behaves exactly like an unclaimed one; deleting cascades the claim silently.
- **Partner cannot list.** There is no endpoint that returns the partner's wishes as a list.
- **Spin**: `POST /api/wishes/spin {budget}` picks one random `open` wish where `owner_id = partner`, `price <= budget`, not already claimed, and returns that single wish (title, photo, price, link). Empty result is a normal `200` with `null`. Spins are rate limited per user (for example 20 per day) to slow down jar enumeration.
- **Claim**: `POST /api/wishes/:id/claim` succeeds only if the wish belongs to the caller's partner and is `open` and unclaimed. Claims are never returned to the owner by any endpoint.
- **Claimer views**: `GET /api/claims` lists the caller's own claims (with wish details and status, so a claimer sees when it becomes done); `DELETE /api/claims/:wishId` releases a claim.
- **Wish photos**: served to the owner, or to the partner only when the wish is currently claimed by them or was the result of their spin; done photos become journal photos.
- **Done**: `POST /api/wishes/:id/done` (owner only, with an uploaded photo id) runs one D1 batch: set `status = 'done'`, `done_at`, `done_photo_id`; insert a `journal_entries` row with `wish_id` and the photo. The client plays the celebration on success. The claim row is kept for the claimer's history.
- **Tests**: each owner endpoint must have a test that a claimed and an unclaimed wish produce byte-identical responses (apart from ids and timestamps).

## 6. Photo pipeline and R2 layout (planned, step 3)

1. Client picks a file (`accept="image/*"`; iOS usually hands HEIC over as JPEG to the web, otherwise decode fails and the user sees an error).
2. Decode with `createImageBitmap`, draw on a canvas with the long edge at most 1600 px, export `image/webp` at about 0.8 quality. If the browser returns another type (older Safari cannot encode WebP), fall back to `image/jpeg` 0.8.
3. Upload: `POST /api/photos?kind=journal|wish|done` with the raw blob body, max 2 MB, content type checked against an allow list. The Worker streams the body into R2 (no image processing in the Worker, so CPU stays well under 10 ms) and inserts the `photos` row.
4. Serve: `GET /api/photos/:id` after the checks in section 5; streams the R2 object with `Cache-Control: private, max-age=31536000, immutable` (keys never change). The service worker never caches it; the browser HTTP cache may.
5. Delete: removing an entry or wish deletes its `photos` rows and R2 objects (R2 deletes are free).

R2 key layout: `couples/<coupleId>/<kind>/<uuid>.<webp|jpg>` where `kind` is `journal`, `wish` or `done`. Keys are never derived from user input.

## 7. i18n

- Two typed dictionaries: `src/client/i18n/vi.ts` (source of `MessageKey`) and `en.ts`; missing keys fail typecheck.
- Initial locale: `localStorage["bisou.locale"]` if set, else `vi` when the browser language starts with `vi`, else `en`. The toggle stores the choice and sets `<html lang>`.
- `users.locale` mirrors the choice server side; the OTP mail uses the `lang` sent with the request.

## 8. PWA and service worker

- `vite-plugin-pwa`, `registerType: autoUpdate`, manifest `display: standalone`, portrait, icons 192/512/maskable plus `apple-touch-icon.png`.
- Workbox precaches the built shell, including bundled illustrations and fonts (`js, css, html, svg, png, webp, webmanifest, woff2`). `navigateFallback: /index.html` with `/api/` denied; no runtime caching. User data and uploaded photos come from the network; offline shows the shell only.
- Theme: semantic tokens with independent palette, style and background choices; light/dark/system mode. Defaults and extension rules live in [DESIGN.md](../DESIGN.md).

## 9. Configuration and secrets

| Name | Kind | Where | Purpose |
|---|---|---|---|
| `DB` | D1 binding | `wrangler.jsonc` | Database `bisou`. |
| `PHOTOS` | R2 binding (planned) | `wrangler.jsonc` | Bucket for photos, private (no public access, no r2.dev URL). |
| `ENVIRONMENT` | var | `wrangler.jsonc`, `.dev.vars` | `production` or `development` (enables `devNote`). |
| `OTP_PEPPER` | secret | `wrangler secret put` | HMAC key for codes. Rotating it invalidates live codes only. |
| `RESEND_API_KEY` | secret | `wrangler secret put` | Resend key with sending access only. Unset locally: codes go to the log. |

Local: copy `.dev.vars.example` to `.dev.vars` (never committed).

## 10. Free-tier limits

| Service | Limit (free) | Bisou usage | When hit |
|---|---|---|---|
| Workers requests | 100,000 / day | A few hundred per day; static assets are not counted | Further `/api` requests fail until 00:00 UTC; the shell still loads from cache. |
| Workers CPU | 10 ms / request | HMAC, SHA-256, D1 calls; no image work | Request killed with an error (1102). Keep heavy work on the client. |
| Workers subrequests | 50 / request | 1 (Resend) | n/a |
| D1 | 5 GB total, 5M rows read and 100k rows written per day | Tiny | Queries fail until the daily reset; reads return 500. |
| R2 | 10 GB-month storage, 1M Class A and 10M Class B ops per month, no egress fee | About 300 KB per photo, about 30,000 photos | Beyond free usage R2 bills the account; add a usage alert. |
| Resend | 3,000 mails / month, 100 / day, 1 verified domain | Logins only (sessions last 90 days) | Send fails; API still answers `{ok: true}`, the error is logged, the user gets no mail. |

## 11. Deployment and human-only steps

Deploy: `pnpm run deploy` (`vite build` then `wrangler deploy`). Migrations: `wrangler d1 migrations apply bisou --remote` (local: `pnpm db:migrate:local`).

Human-only (needs accounts, DNS or a phone):

1. `wrangler login` to the Cloudflare account.
2. `wrangler d1 create bisou`, paste the real `database_id` into `wrangler.jsonc` (currently a placeholder), apply migrations remotely.
3. Resend: add domain `mail.yuchi-education.com`, publish the SPF, DKIM (and DMARC) DNS records at the DNS host of `yuchi-education.com`, wait for verification, create a sending-only API key.
4. `wrangler secret put RESEND_API_KEY` and `wrangler secret put OTP_PEPPER` (value from `openssl rand -base64 32`).
5. Step 3: enable R2 in the dashboard (may ask for a payment method), `wrangler r2 bucket create bisou-photos`, add the `PHOTOS` binding.
6. Test on a real iPhone: open the workers.dev URL in Safari, Add to Home Screen, log in, force close, reopen, confirm still logged in. Repeat on Android Chrome.

## 12. Known risks

| Risk | Impact | Mitigation |
|---|---|---|
| iOS standalone PWA cookie persistence | iOS keeps a separate cookie jar for home screen apps and may purge script-writable storage after 7 days without use. If the session cookie is lost, the user must log in again. | Cookie is HttpOnly and server set (not subject to the script storage cap); validate in todo step 1 on a real iPhone; OTP login is cheap to redo. |
| Resend deliverability | OTP mail lands in spam or is delayed; Gmail may distrust a young subdomain. | SPF, DKIM, DMARC on the subdomain; plain short mail; "check spam" hint in the UI; 60 s resend button. |
| Resend quota | 100 mails per day; a bug or abuse could burn it. | Per email rate limit; consider a per IP limit if abuse appears. |
| D1 / R2 limits | Exceeded quota breaks the app for the rest of the day (D1) or starts billing (R2). | Usage far below limits; set Cloudflare notifications. |
| Wish jar enumeration | A partner spinning many times with a high budget can see most of the jar over time. | Spin rate limit; accepted for a two person app. |
| `workers.dev` domain change | Moving to a custom domain changes origin: cookies, localStorage and the installed PWA do not carry over. | OTP login is not domain bound (unlike passkeys); users reinstall and log in once. |
| HEIC and WebP support | Some browsers cannot decode HEIC or encode WebP. | JPEG fallback; clear error for undecodable files. |
