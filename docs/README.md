# Bisou docs

Published at https://yushaku.github.io/bisou/docs/ by `.github/workflows/pages.yml` on every push to `main` that touches the docs.

## Diagrams

- [System architecture](system-architecture.html) (spec: [JSON](system-architecture.json))
- [Database schema](database-schema.html) (spec: [JSON](database-schema.json))

## Product rules

- [Pairing and days together](product/pairing.md)
- [Shared journal](product/journal.md)
- [Wish jar](product/wishes.md)
- [Upcoming events](product/events.md)
- [Custom events](product/custom-events.md)
- [Questions and the garden](product/garden.md)
- [Kind notes](product/notes.md)
- [Notifications](product/notifications.md)
- [Profile photo](product/avatar.md)
- [Installed app](product/pwa.md)

## Decisions

- [0001: Cloudflare Workers, D1 and R2 on the free plan](adr/0001-cloudflare-workers-d1-r2.md)
- [0002: Email OTP login via Resend](adr/0002-email-otp-via-resend.md)
- [0003: PWA instead of a native app](adr/0003-pwa-instead-of-native.md)
- [0004: Journal photos upload first, private R2](adr/0004-photos-upload-first-private-r2.md)
- [0005: Wish jar privacy and photo reuse](adr/0005-wish-jar-privacy-and-photo-reuse.md)
- [0006: Profile photos per user in R2](adr/0006-profile-photos-per-user-in-r2.md)
- [0007: Web Push](adr/0007-web-push.md)
- [0008: Garden data and privacy](adr/0008-garden-data-and-privacy.md)
- [0009: Kind notes gated in SQL, closed into the journal](adr/0009-kind-notes-gated-in-sql-and-closed-into-journal.md)
- [0010: Push sending through Cloudflare Queues](adr/0010-push-sending-through-queues.md)

## Other

- [Design system](../DESIGN.md)
- [Changelog](../CHANGELOG.md)
- [Legacy architecture notes](architecture.md) (read-only, code wins)
