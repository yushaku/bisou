# Repository instructions

Do not read or search files under these directories unless I explicitly ask: node_modules, dist, .git, **pycache**.

## Commands

`pnpm dev`: local seed, sign in with `111111` at http://127.0.0.1:5191.
`pnpm dev:phone`: open on a phone through a cloudflared tunnel.
Verify: `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `pnpm lint`.
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
- [docs/architecture.md](docs/architecture.md) is a read-only legacy reference; code wins.

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.



&nbsp;