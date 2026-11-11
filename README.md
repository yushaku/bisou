# Bisou

A private PWA for one couple. Sign in with an emailed 6 digit code, choose a display name, pair with an invite code or link, see your days together and next milestone, and keep a shared journal and private wish jars. Display names can be changed but cannot be cleared. The app supports Vietnamese and English.

The journal opens from Home, groups entries by day with the newest first, and loads older days as you scroll. Each entry can contain up to 2000 characters and 4 photos, with each photo cropped to a square by its author. Only the author can edit or permanently delete an entry and its photos. Both partners can read it; deleted photos may remain in the partner's browser cache for up to one day before becoming stale.

Each partner keeps a private wish jar with optional prices, links and one photo per wish. Spin the other jar within a VND budget, up to 20 times per rolling 24 hours, and claim a priced wish in secret. Marking your own wish received creates a shared journal entry in your current app language, with an optional note and up to four photos. The Claims screen shows received gifts; deleting a received wish removes its claim silently. Deleting an open claimed wish leaves a one-time notice for the claimer; it is removed once they see it, or by the daily cleanup after 30 days.

Home shows the next 3 upcoming events; See all lists the next 12 months: yearly anniversaries, every 1,000th day, both partners' birthdays, four holidays and the couple's own events, with own events further out under Later. Each person sets only their own birthday in Settings. Either partner can add, change or delete a custom event (one-off or yearly, up to 100 upcoming per couple); the + in the tab bar adds an event on Home, an entry on Journal and a wish on Wishes.

The Garden keeps the original 60 cards and adds 35 bilingual questions across five relationship statuses: Getting acquainted, In love, Living together, Married and With children. Both partners choose the same starting status to open its content and earlier questions. Decision questions accept text, a neutral choice or a deferred/not-applicable choice; each counts equally and reveals both responses once both submit. Completing the furthest opened status's decision questions opens the later status both have chosen, including a target that skips statuses. Either partner can leave the next status unset. Opened content and completed progress remain after an author's post-reveal deletion; status choices do not record real-life milestones or agreement. Rules: [Garden](docs/product/garden.md).

Switching tabs restores their scroll positions and keeps loaded journal pages for the current session. Journal text appears before its photos, and the photo viewer supports horizontal swipes as well as its buttons and arrow keys.

To install, open Bisou in Safari on iPhone and choose Share, Add to Home Screen, Add; on Android, use the install button on the Home card or the browser menu.

One Cloudflare Worker (Hono) serves the React SPA (Workers static assets) and the API under `/api`. D1 stores couples, journal entries, photo records, wishes, birthdays and events; the private R2 bucket `bisou`, bound as `PHOTOS` in `wrangler.jsonc`, stores the cropped photos, and profile photos under `users/<id>/avatar/`. Free plan only.

![Bisou system architecture: release pipeline and Cloudflare runtime](docs/system-architecture.svg)

The interactive version with source references is [docs/system-architecture.html](docs/system-architecture.html) (spec: [docs/system-architecture.json](docs/system-architecture.json)). All docs: [docs/](docs/README.md), published at https://yushaku.github.io/bisou/docs/.

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
pnpm dev
```

Open http://127.0.0.1:5191. `pnpm dev` waits for missing local migrations, seeds absent synthetic Garden couples, checks the seed, then starts Vite and the Worker against the same isolated D1/R2 persistence in `.wrangler/stage-seed-v1/state`. Existing data in `.wrangler/state` stays untouched; the default dev instance uses the dedicated seed database instead. No remote credentials or `.dev.vars` setup is needed.

The generated local-only config enables the existing development login code: request a code first, then sign in with `111111`. No mail is sent; normal local OTP logging remains. The runner does not read or change project `.dev.vars`, and production ignores `DEV_LOGIN_CODE`.

Open http://127.0.0.1:5191/design for the development-only component gallery and three sample screens. Read [DESIGN.md](DESIGN.md) before changing UI; it records the approved visual direction and design constraints.

### Garden seed testing (isolated local instance)

```sh
pnpm dev
```

Open **http://127.0.0.1:5191/garden**. The runner applies migrations only to its dedicated local database, creates missing synthetic couples, checks the seed and starts Vite with the local Worker on loopback. It leaves other dev servers and the regular `.wrangler/state` database alone. Stop this instance with Ctrl+C in its terminal.

Use a normal browser profile for partner A and a private window or another profile for B. Request a login code for the account first, then enter **111111**; this existing development-only login path sends no email here. Each scenario has two accounts: `seed-stage-<scenario>-a@example.com` and `seed-stage-<scenario>-b@example.com`. A starts in Vietnamese and B in English; switch language in the app as needed. Local OTP rate limits still apply.

| Scenario | Starting state | Try |
| --- | --- | --- |
| `placement` | Starting placement pending: A proposed Married; not yet placed | Accept as B, or decline and propose another context; daily play still works before acceptance |
| `reveal` | In love, no target; A has private text on `L2-01` | Open Money as B: the text stays hidden until B submits; `L2-03` has paired no-details/later choices and `L2-05` pairs text with later |
| `unlock` | In love, Living together mutually chosen; only B's final decision response is missing | Submit as B on `L2-19` in When we disagree to open Living together once; today's ordinary card and plants stay intact |
| `skip` | Living together, With children mutually chosen; only B's final decision response is missing | Submit as B on `L3-04` in Dreams; open With children without answering Married's decisions |

Each couple also has an untouched ordinary daily card, a private waiting ordinary answer, revealed/edited/deleted Money history, a swapped-card record and sample plants. Fixtures use the Vietnam date when first created; daily cards follow the real date afterward.

Data, generated local config and logs live under `.wrangler/stage-seed-v1/` (ignored); D1 persistence is `.wrangler/stage-seed-v1/state`. Rerunning **preserves existing couples and all manual changes**, including deleted answers and opened stages; it only creates missing scenario couples. To prepare/check without starting a server, run `node scripts/dev-seed-garden.mjs --prepare-only`. This runner has no remote mode, reads no project `.dev.vars`, and provides no reset command. Vite hot reload remains available for frontend edits. No tunnel or phone publication is started.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Apply missing local migrations, seed missing synthetic couples, then Vite and Worker on port 5191 (isolated local D1/R2) |
| `pnpm dev:phone [port]` | Same migration/seed/dev flow on port 5180 (or the given port) plus a cloudflared quick tunnel; prints an https URL to open on a phone |
| `pnpm build` | Builds the client (`dist/client`, with service worker) and the Worker (`dist/bisou`) |
| `pnpm typecheck` | `tsc --noEmit` for client, Worker, Vite config and tests |
| `pnpm test` | API and client logic tests (Vitest in workerd, Resend mocked), then design-system, migration and local seed-workflow checks (Node) |
| `pnpm icons` | Exports the in-app logo, PNG favicons and install icons from the brand artwork |
| `pnpm db:migrate:local` | Applies migrations to the original `.wrangler/state` D1; the default `pnpm dev` instance prepares its own DB automatically |
| `pnpm run deploy` | Builds, then `wrangler deploy` (needs the setup below) |

## Deploy

Pushing `main` releases production through GitHub Actions after typecheck, tests, build and a safety check of pending migrations. Additive D1 migrations run before the Worker deploys; destructive migrations need the Product Owner's approval.

For Garden statuses, apply the additive `migrations/0012_garden_levels.sql` before deploying the matching Worker and client. Reverting application code does not undo saved responses or opened-status records; retain the additive schema when rolling back.

The GitHub `production` environment needs the `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable. In addition to Worker deployment and D1 permissions, the CI token needs **Workers R2 Storage: Read** so Wrangler can validate the `PHOTOS` bucket binding.

Before the first deploy of this branch, run `node scripts/vapid-key.mjs` and `npx wrangler secret put VAPID_PRIVATE_KEY`, then paste the printed JWK. Never reuse the development key from `.dev.vars.example`. The push cron now runs hourly (`0 * * * *`).

To retry a failed release, open **Actions**, select **Deploy production**, then **Run workflow** on `main`.

## Setup steps for a human (not automated)

1. Resend: sign up, add the domain `mail.yuchi-education.com`, add its DNS records in Cloudflare, create an API key.
2. `wrangler d1 create bisou`, paste the `database_id` into `wrangler.jsonc`, then `wrangler d1 migrations apply bisou --remote`.
3. Create the private photo bucket with `wrangler r2 bucket create bisou`; `wrangler.jsonc` already binds it as `PHOTOS`. Keep public bucket access disabled; the Worker checks the session and couple before serving photos.
4. `wrangler secret put RESEND_API_KEY` and `wrangler secret put OTP_PEPPER` (a long random value).
5. `pnpm run deploy`, open the workers.dev URL on the iPhone in Safari, Add to Home Screen, log in, close and reopen the app to confirm the session persists.
