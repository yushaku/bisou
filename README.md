# Bisou

A private PWA for one couple. Sign in with an emailed 6 digit code, choose a display name, pair with an invite code or link, see your days together and next milestone, and keep a shared journal and private wish jars. Display names can be changed but cannot be cleared. The app supports Vietnamese and English.

The journal opens from Home, groups entries by day with the newest first, and loads older days as you scroll. Each entry can contain up to 2000 characters and 4 photos, with each photo cropped to a square by its author. Only the author can edit or permanently delete an entry and its photos. Both partners can read it; deleted photos may remain in the partner's browser cache for up to one day before becoming stale.

Each partner keeps a private wish jar with optional prices, links and one photo per wish. Spin the other jar within a VND budget, up to 20 times per rolling 24 hours, and claim a priced wish in secret. Marking your own wish received creates a shared journal entry in your current app language, with an optional note and up to four photos. The Claims screen shows received gifts; deleting a received wish removes its claim silently. Deleting an open claimed wish leaves a one-time notice for the claimer; it is removed once they see it, or by the daily cleanup after 30 days.

Home shows the next 3 upcoming events; See all lists the next 12 months: yearly anniversaries, every 1,000th day, both partners' birthdays, four holidays and the couple's own events, with own events further out under Later. Each person sets only their own birthday in Settings. Either partner can add, change or delete a custom event (one-off or yearly, up to 100 upcoming per couple); the + in the tab bar adds an event on Home, an entry on Journal and a wish on Wishes.

Switching tabs restores their scroll positions and keeps loaded journal pages for the current session. Journal text appears before its photos, and the photo viewer supports horizontal swipes as well as its buttons and arrow keys.

One Cloudflare Worker (Hono) serves the React SPA (Workers static assets) and the API under `/api`. D1 stores entries and photo records; the private R2 bucket `bisou`, bound as `PHOTOS` in `wrangler.jsonc`, stores the cropped photos. Free plan only.

## Layout

- `src/worker`: the Worker. `app.ts` mounts one route module per area: `auth`, `me`, `couple`, `events`, `journal`, `photos` and `wishes`.
- `src/client`: React app. `i18n/vi.ts` is the source dictionary, `i18n/en.ts` must have the same keys.
- `src/shared`: types used by both sides.
- `migrations`: D1 migrations (`wrangler d1 migrations`).
- `assets/`: brand artwork, exported to `public/` and `src/client/assets/brand-heart.webp` by `pnpm icons`.
- `test`: API tests running inside the Workers runtime (`@cloudflare/vitest-plugin`).

## Local setup

Use Node.js 24 or newer (the design checks run TypeScript directly).

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Open http://localhost:5173. Without `RESEND_API_KEY` in `.dev.vars` no mail is sent: the code is printed in the `pnpm dev` log. D1 and R2 are emulated locally in `.wrangler/state`; local photo uploads need no remote bucket or R2 credentials.

With `ENVIRONMENT=development` and `DEV_LOGIN_CODE=111111` in `.dev.vars`, request a code first, then sign in with `111111` or the normal OTP; production ignores `DEV_LOGIN_CODE`.

Open http://localhost:5173/design for the development-only component gallery and three sample screens. Read [DESIGN.md](DESIGN.md) before changing UI; it records the approved visual direction and design constraints.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite and the Worker together (local D1 and R2 in `.wrangler/state`) |
| `pnpm dev:phone [port]` | Same dev server on port 5180 (or the given port) plus a cloudflared quick tunnel; prints an https URL to open on a phone |
| `pnpm build` | Builds the client (`dist/client`, with service worker) and the Worker (`dist/bisou`) |
| `pnpm typecheck` | `tsc --noEmit` for client, Worker, Vite config and tests |
| `pnpm test` | API and client logic tests (Vitest in workerd, Resend mocked), then design-system and migration checks (Node) |
| `pnpm icons` | Exports the in-app logo, PNG favicons and install icons from the brand artwork |
| `pnpm db:migrate:local` | Applies migrations to the local D1 |
| `pnpm run deploy` | Builds, then `wrangler deploy` (needs the setup below) |

## Deploy

Pushing `main` releases production through GitHub Actions after typecheck, tests, build and a safety check of pending migrations. Additive D1 migrations run before the Worker deploys; destructive migrations need the Product Owner's approval.

The GitHub `production` environment needs the `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable. In addition to Worker deployment and D1 permissions, the CI token needs **Workers R2 Storage: Read** so Wrangler can validate the `PHOTOS` bucket binding.

To retry a failed release, open **Actions**, select **Deploy production**, then **Run workflow** on `main`.

## Setup steps for a human (not automated)

1. Resend: sign up, add the domain `mail.yuchi-education.com`, add its DNS records in Cloudflare, create an API key.
2. `wrangler d1 create bisou`, paste the `database_id` into `wrangler.jsonc`, then `wrangler d1 migrations apply bisou --remote`.
3. Create the private photo bucket with `wrangler r2 bucket create bisou`; `wrangler.jsonc` already binds it as `PHOTOS`. Keep public bucket access disabled; the Worker checks the session and couple before serving photos.
4. `wrangler secret put RESEND_API_KEY` and `wrangler secret put OTP_PEPPER` (a long random value).
5. `pnpm run deploy`, open the workers.dev URL on the iPhone in Safari, Add to Home Screen, log in, close and reopen the app to confirm the session persists.
