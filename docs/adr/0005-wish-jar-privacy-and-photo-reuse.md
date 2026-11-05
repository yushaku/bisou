# ADR 0005: Wish claims stay invisible to the owner, and wish photos reuse the journal photo table

Status: proposed (November 2026)

## Context
Each partner keeps a wish jar the other can spin and claim in secret ([wish jar spec](../product/wishes.md)); nothing the owner sees may show a spin or claim (R17), spins are kept only to count a limit (R24), and a wish has one square photo kept like journal photos (R6). Journal photos already have an upload first flow where "pending" means `photos.entry_id IS NULL` ([ADR 0004](0004-photos-upload-first-private-r2.md)).

## Decision
- Claims live in their own table, `wish_claims` (one per wish), and spins in `wish_spins` (user and time only). Owner routes read `wishes` and `photos` only; claiming, spinning and releasing never write `wishes` or `photos`. Deleting a claimed wish turns its claim into a one-time notice for the claimer.
- The spin picks in the Worker with `crypto.getRandomValues` and returns only the landed wish's title, price, link and photo id. Wish and photo ids reach the partner only through spin results and their own claims, so an unguessable id is the permission to claim it or load its photo; no landed wish is stored.
- A wish photo is a `photos` row with a new `wish_id` column (unique). Pending now means `entry_id IS NULL AND wish_id IS NULL` in every query (upload cap, attach, delete, purge, sweep).

## Consequences
- Upload, crop, sanitizer, R2 keys, cache headers and the sweep stay one code path for journal and wish photos.
- Any new photo query must test both columns, or a wish photo gets swept or attached to an entry; tests guard each place.
- A partner who once saw a wish photo id can keep loading it while the wish exists; the owner changing the photo gives it a new id.
- Moving claims or spins into `wishes`, or storing landed wishes, would break R17 or R24 and needs a new decision.
