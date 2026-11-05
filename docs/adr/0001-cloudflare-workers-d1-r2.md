# ADR 0001: Cloudflare Workers, D1 and R2 on the free plan

Status: accepted (November 2026)

## Context
Bisou is a private app for two people. It needs an HTTPS host for a PWA, a small relational store, and photo storage of a few GB, at zero monthly cost and without a credit card commitment if possible.

## Decision
One Cloudflare Worker (Hono) serves the static PWA (Workers static assets) and the JSON API under `/api`. D1 (SQLite) stores structured data; R2 stores photos in a private bucket served through the Worker. Hosting stays on `*.workers.dev` until a domain is bought.

## Consequences
- Free limits: 100k Worker requests/day (static assets not counted), 10 ms CPU per request, so only Web Crypto (HMAC, SHA-256), no bcrypt or image processing on the server.
- Photos are compressed on the client; R2 has no egress fee, 10 GB free.
- One deploy unit (`wrangler deploy`), migrations via `wrangler d1 migrations`.
- Lock-in to Workers APIs (bindings, D1); Hono and plain SQL keep a move feasible.

## Alternatives rejected
- Firebase (Spark): new Cloud Storage buckets can no longer be created on Spark; Blaze with a card is required for photos.
- Supabase free: projects pause after inactivity and storage is 1 GB; a two person app idles often.
- VPS: monthly cost and maintenance (patching, backups, TLS) for no benefit at this size.
