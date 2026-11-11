# Bisou

A private PWA for one couple: shared journal, wish jars, upcoming events, the Garden question cards and kind notes, in Vietnamese and English. One Cloudflare Worker (Hono) serves the React SPA and the API under `/api`, with D1 for data and a private R2 bucket for photos. Free plan only.

Docs (product rules, decisions, diagrams): https://yushaku.github.io/bisou/docs/ ([source](docs/README.md)).

![Bisou system architecture: release pipeline and Cloudflare runtime](docs/system-architecture.svg)

## Layout

- `src/worker`: the Worker; `app.ts` mounts one route module per area.
- `src/client`: React app. `i18n/vi.ts` is the source dictionary, `i18n/en.ts` must have the same keys.
- `src/shared`: types used by both sides.
- `migrations`: D1 migrations, additive only.
- `assets/`: brand artwork, exported by `pnpm icons`.
- `test`: API tests in the Workers runtime (`@cloudflare/vitest-plugin`).

## Local setup

Node.js 24 or newer.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:5191. Request a login code, then sign in with `111111` (no mail is sent). `pnpm dev` uses its own D1/R2 state in `.wrangler/stage-seed-v1/` with seeded synthetic couples, and needs no `.dev.vars` or remote credentials. `/design` shows the development-only component gallery.

### Garden seed couples

Each scenario has `seed-stage-<scenario>-a@example.com` (Vietnamese) and `-b@example.com` (English). Use a separate browser profile or private window for B. Reruns keep your manual changes and only add missing couples; `node scripts/dev-seed-garden.mjs --prepare-only` prepares without starting a server.

| Scenario | Starting state | Try |
| --- | --- | --- |
| `placement` | A proposed Married; not yet placed | Accept as B, or decline and propose another |
| `reveal` | In love; A has private text on `L2-01` | Open Money as B: the text stays hidden until B submits |
| `unlock` | In love, Living together chosen; B's last decision missing | Submit `L2-19` as B to open Living together |
| `skip` | Living together, With children chosen; B's last decision missing | Submit `L3-04` as B to open With children directly |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Local migrations and seed, then Vite and Worker on port 5191 |
| `pnpm dev:phone [port]` | Same on port 5180 plus a cloudflared quick tunnel URL for a phone |
| `pnpm build` | Client (`dist/client`) and Worker (`dist/bisou`) |
| `pnpm typecheck` | `tsc --noEmit` for client, Worker, Vite config and tests |
| `pnpm test` | Vitest in workerd, then design-system, migration and seed checks |
| `pnpm icons` | Logo, favicons and install icons from the brand artwork |
| `pnpm db:migrate:local` | Migrations on the original `.wrangler/state` D1 |
| `pnpm run deploy` | Build, then `wrangler deploy` |

## Deploy

Pushing `main` releases production through GitHub Actions after typecheck, tests, build and a pending-migration check. Additive D1 migrations run before the Worker deploys; destructive ones need the Product Owner's approval. Pushes that only touch Markdown or `docs/` skip the deploy; docs changes publish the docs site. To retry a release, run **Deploy production** from **Actions** on `main`.

The GitHub `production` environment needs the `CLOUDFLARE_API_TOKEN` secret (Worker, D1 and **Workers R2 Storage: Read** permissions) and the `CLOUDFLARE_ACCOUNT_ID` variable.

## First-time setup (manual)

1. Resend: add the domain `mail.yuchi-education.com`, its DNS records in Cloudflare, and an API key.
2. `wrangler d1 create bisou`, put the `database_id` in `wrangler.jsonc`, then `wrangler d1 migrations apply bisou --remote`.
3. `wrangler r2 bucket create bisou` (keep public access off; bound as `PHOTOS`).
4. `wrangler secret put RESEND_API_KEY` and `wrangler secret put OTP_PEPPER` (a long random value).
5. `node scripts/vapid-key.mjs`, then `wrangler secret put VAPID_PRIVATE_KEY` with the printed JWK. Never reuse the key in `.dev.vars.example`.
6. `pnpm run deploy`, add the app to the iPhone Home Screen, log in, and reopen it to confirm the session persists.
