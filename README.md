# Bisou

A private PWA for one couple: shared journal and wish jar. Email OTP login and profile editing work today. The design system previews the upcoming couple, journal and wish screens in Vietnamese and English.

One Cloudflare Worker (Hono) serves the React SPA (Workers static assets) and the API under `/api`. Data lives in D1. Free plan only.

## Layout

- `src/worker`: the Worker. `app.ts` mounts one route module per area (`routes/auth.ts`, `routes/me.ts`; later `couple`, `journal`, `wishes`).
- `src/client`: React app. `i18n/vi.ts` is the source dictionary, `i18n/en.ts` must have the same keys.
- `src/shared`: types used by both sides.
- `migrations`: D1 migrations (`wrangler d1 migrations`).
- `assets/*.svg`: icon sources, rendered to `public/` by `pnpm icons`.
- `test`: API tests running inside the Workers runtime (`@cloudflare/vitest-plugin`).

## Local setup

Use Node.js 24 or newer (the design checks run TypeScript directly).

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Open http://localhost:5173. Without `RESEND_API_KEY` in `.dev.vars` no mail is sent: the code is printed in the `pnpm dev` log.

Open http://localhost:5173/design for the development-only component gallery and three sample screens. Read [DESIGN.md](DESIGN.md) before changing UI; it records the approved visual direction and design constraints.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite and the Worker together (local D1 in `.wrangler/state`) |
| `pnpm build` | Builds the client (`dist/client`, with service worker) and the Worker (`dist/bisou`) |
| `pnpm typecheck` | `tsc --noEmit` for client, Worker, Vite config and tests |
| `pnpm test` | API tests (Vitest in workerd, Resend mocked), then design-system checks (Node) |
| `pnpm icons` | Regenerates the PNG icons from `assets/*.svg` |
| `pnpm db:migrate:local` | Applies migrations to the local D1 |
| `pnpm run deploy` | Builds, then `wrangler deploy` (needs the setup below) |

## Setup steps for a human (not automated)

1. Resend: sign up, add the domain `mail.yuchi-education.com`, add its DNS records in Cloudflare, create an API key.
2. `wrangler d1 create bisou`, paste the `database_id` into `wrangler.jsonc`, then `wrangler d1 migrations apply bisou --remote`.
3. `wrangler secret put RESEND_API_KEY` and `wrangler secret put OTP_PEPPER` (a long random value).
4. `pnpm run deploy`, open the workers.dev URL on the iPhone in Safari, Add to Home Screen, log in, close and reopen the app to confirm the session persists.
