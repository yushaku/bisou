# Repository instructions

## Commands

`pnpm dev`: run locally; without `RESEND_API_KEY`, OTP codes appear in the log.
`pnpm dev:phone`: open on a phone through a cloudflared tunnel.
Verify: `pnpm run typecheck`, `pnpm test`, `pnpm run build`.
Migrations are additive only.
Merging into `main` and pushing it releases production through GitHub Actions; see [README Deploy](README.md#deploy).

## Design system

Read [DESIGN.md](DESIGN.md) before creating or changing UI, components, tokens, assets, or user-facing copy. It records Bisou's approved visual direction and design constraints; do not invent a separate visual system per feature.

Keep exact token values in their source files. When the user changes a design decision, update `DESIGN.md` with the implementation. Other documents and agent instructions must link to it rather than duplicate its rules. Explicit current user instructions take precedence.

## Docs

- Product rules: [docs/product/](docs/product/).
- Decisions: [docs/adr/](docs/adr/).
- Visual rules: [DESIGN.md](DESIGN.md).
- How to run: [README.md](README.md).
- Changes: [CHANGELOG.md](CHANGELOG.md).
- [docs/architecture.md](docs/architecture.md) and [docs/ideas/bisou.md](docs/ideas/bisou.md) are read-only legacy references; code wins.
