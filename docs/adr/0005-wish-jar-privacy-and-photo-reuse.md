# ADR 0005: Wish claims stay invisible to the owner, and wish photos reuse the journal photo table

Status: accepted (November 2026)

## Context
Each partner keeps a wish jar the other can spin and claim in secret ([wish jar spec](../product/wishes.md)); nothing the owner sees may show a spin or claim (R17), spins are kept only to count a limit (R24), and a wish has one square photo kept like journal photos (R6). Wish photos reuse the journal's upload first flow ([ADR 0004](0004-photos-upload-first-private-r2.md)).

## Decision
- Claims live in their own table, `wish_claims` (one per wish), and spins in `wish_spins` (user and time only). Owner jar responses contain no claim or spin data; claiming, spinning and releasing never write `wishes` or `photos`. Deleting an open claimed wish leaves a notice; deleting a received wish deletes its claim silently. GET claims is read-only; the client acknowledges displayed notices by POST, and daily cleanup removes unread notices 30 days after deletion.
- The spin picks in the Worker with `crypto.getRandomValues` and returns only the landed wish's id, title, price, link and photo id. An unguessable wish id lets the partner claim it while it is open, priced and unclaimed in the same couple; an attached photo id permits loading the photo within that couple. No landed wish is stored.
- A wish photo is a `photos` row with a new `wish_id` column (unique). Pending now means `entry_id IS NULL AND wish_id IS NULL` in every query (upload cap, attach, delete, purge, sweep).

## Consequences
- Upload, crop, sanitizer, R2 keys, cache headers and the sweep stay one code path for journal and wish photos.
- Any new photo query must test both columns, or a wish photo gets swept or attached to an entry; tests guard each place.
- A partner who once saw a wish photo id can keep loading it while the wish exists; the owner changing the photo gives it a new id.
- Accepted limits: varying the budget across 20 daily spins can reveal the cheapest priced wish; a landed wish id lets the partner follow that one wish while it exists.
- Moving claims or spins into `wishes`, or storing landed wishes, would break R17 or R24 and needs a new decision.
