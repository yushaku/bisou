# ADR 0017: The shared wish jar lives in its own couple-owned table

Status: accepted (November 2026)

## Context
Each partner keeps a private jar the other can only spin and claim in secret ([wish jar spec](../product/wishes.md) R2, R17; [ADR 0005](0005-wish-jar-privacy-and-photo-reuse.md)). The couple also wants a shared jar ("Hai đứa") for things they want to do together: both partners see, add, change and delete every shared wish, and either marks one done, which makes a journal entry. Creating a shared wish notifies the other partner with its title, the first notification that names a wish ([notifications](../product/notifications.md) R9).

## Decision
- **Shared wishes get their own table**, `shared_wishes` (couple, creator, title, optional price, link, open/done, done day and note, timestamps), `ON DELETE CASCADE` with the couple; migration additive. Extending `wishes` with a "shared" flag was rejected: every private query (owner list, partner-empty flag, spin candidates, claims, R17 ordering) would need a new predicate, and one missed predicate leaks a private wish or a claim.
- **No path moves a wish between jars.** No route turns a private wish into a shared one or back; shared rows have no priority, claim or spin.
- **Access is by couple membership**, not ownership: either partner reads and writes any shared wish of their couple. The creator is kept only to show who added it.
- **A shared wish photo is a `photos` row with a new `shared_wish_id` column** (unique when set), like the wish photo in ADR 0005. Pending now means `entry_id`, `wish_id` and `shared_wish_id` all null in every photo query (cap, attach, delete, purge, sweep, GET). Attaching a pending upload still requires the caller to be its uploader; keeping the photo already attached does not, so one partner can edit the other's shared wish without touching its photo.
- **Done reuses the received pattern**: one batch inserts the journal entry (author: the partner who marked it done, text "Đã làm cùng nhau" / "Done together" plus title and note), attaches the caller's pending photos and marks the wish done only if every attach matched. The journal push goes out as for any entry. A done wish cannot be edited; deleting it keeps the entry.
- **Create sends one push** through the existing queue ([ADR 0010](0010-push-sending-through-queues.md)) to the other partner's devices with the partner's journal switch on, naming the creator and the title cut to about 60 characters, with its own stable topic/tag so a newer one replaces an older one, and a link that opens the jar tab on "Hai đứa". Edit, delete and done send nothing beyond the journal push.

## Consequences
- Private jar code and its secrecy tests stay untouched; the shared jar has its own routes and queries.
- Every new photo query must test three parent columns; tests guard each place.
- Lock screens may show a shared wish title; the PO accepted this. Queue retries may let an older shared-wish push replace a newer one; accepted.
- D1 removes shared wishes with the couple. Their R2 photos are removed only once the leave/delete-couple feature exists ([ADR 0004](0004-photos-upload-first-private-r2.md)).
