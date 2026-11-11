# ADR 0011: Card box text lives in Worker code, and a paid box sends only its preview cards

Status: proposed (November 2026)

## Context
The card box ([card box spec](../product/card-box.md)) is Bisou's first paid content. Free boxes are open to every couple. A paid box marks some of its cards as preview cards; a couple that does not own the box plays only those. In v1 nobody can own a paid box: unlocking and payment are deferred. Card text a couple may not play must never reach its phones, by any means (R42). Seen history stays on each phone (R61) and a loaded box plays offline (R44). The [garden spec](../product/garden.md) lists paid services as out of scope: that still holds for the garden, which stays free, and this ADR covers paid boxes only.

## Decision
- **Box and card text live in a Worker-only module**, `src/worker/lib/cardBoxes.ts`: box ids (slugs, never renamed or reused), name, description, whether the box is free, and cards in box order with ids assigned once (`lql-01`, `dc-04`). Text is vi and en, with kind-specific fields (two options for `rather`, the 1 and 10 labels for `scale`). Only types go in `src/shared/cardBox.ts`. The content cannot go in `src/shared` like the garden's ([ADR 0008](0008-garden-data-and-privacy.md)), because the client bundle would then carry every paid card. A D1 seed was rejected for the same reason as in ADR 0008: every text fix would become a migration. Boxes and cards are never deleted; a box leaves the catalogue only by a code change that keeps its id unused.
- **Preview is a per-card flag in the content** (`preview: true`), not a position or a count. Deep Connection marks 3 cards. Every paid box marks at least one; a test checks it.
- **The server cuts content before sending it.** One function decides whether a box is open for the caller's couple, and one function builds the card list: every card of an open box, only the preview cards otherwise. In v1 a box is open exactly when it is free, so the non-preview cards of a paid box are never sent. No route sends a card one draw at a time, so drawing, previous card and start-over run on the phone, and the server never learns what was drawn (R62).
- **The client contract carries no ownership or price.** A box summary says only `open`; a box detail holds the cards the couple may play. The client plays whatever it gets: an open box as the full box, a box that is not open as a small preview box that ends with a one-time "not open yet" line and starts over. The client never decides what is locked.

## Unlocking and payment (deferred)
Planned direction, not built: one D1 row per couple and paid box (`card_box_unlocks (couple_id, box_id, unlocked_at)`, PK on both, `ON DELETE CASCADE` with the couple, no source column), read into a set by the box routes and checked in the one "is open" function. Single-use codes and a VietQR payment webhook would each end in the same `INSERT OR IGNORE` into that table; payments get an order table keyed by a UNIQUE provider reference. The client needs no change for this beyond an unlock screen: a box turns `open` and its next detail holds every card.

## Consequences
- New cards and boxes are a Worker code change; the client learns them from the API and keeps no list of its own.
- A phone keeps the box text it was given (localStorage, for offline play) until its next online refresh. Once unlocks exist, a take-back would reach the phone only then, and a partner can always screenshot a card. Both are accepted limits.
- v1 stores nothing new in D1. Card ids and which cards are preview cards are visible to any couple; other paid text is not.
