# Card box: paid boxes and unlocking

## Purpose

A couple wants to try a paid box before having it, and then keep it for both partners. Bisou lets any couple play a paid box's preview cards, then offers the whole box as a gift from Bisou; no money is asked and no payment happens. Drawing, kinds and the box list are in [card-box](card-box.md).

## Actors

- **Partner**: a member of a couple; either partner can unlock a box for both.
- **PO**: Bisou's owner, who decides which boxes exist and which cards of a paid box are preview.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): try a paid box through its preview cards and see its price, so that we know what the box is before getting it. AC14, AC15, AC17, AC25, AC48
- US2 (partner): get the whole box as a gift once we have seen the preview, so that both of us play it fully with nothing to pay. AC2, AC23, AC24, AC41, AC42, AC43, AC44, AC45, AC46, AC47

## Business rules

Preview and locked boxes

- R27. A couple that does not have a paid box draws only among its preview cards, with draw, previous card and start over working as in a free box ([card-box](card-box.md) R13 to R17), except for the end in R28; no other card of the box shows.
- R28. When every preview card was seen on the phone, the next draw shows the buy view (R78) instead of a card, and the preview does not start over by itself; previous card from the buy view steps back through the cards shown.
- R31. Preview cards count as seen on a phone like any card ([card-box](card-box.md) R14, R15).
- R42. Bisou never gives the non-preview cards of a paid box to a couple that has not unlocked it, by any means, on either phone.
- R43. Every couple can see the cover, name, description and price of every paid box.
- R85. Tiles on Home and in the box list show the price of a locked paid box and offer no purchase, contact or code entry.

Ownership

- R4. A paid box belongs to the couple once either partner unlocks it (R80).
- R5. An unlock is once and for good: no subscription, renewal or expiry.
- R39. An unlock reaches the partner's phone the next time it refreshes, with no notification.
- R40. Unlocking needs a connection.
- R58. For each paid box a couple unlocked, Bisou keeps the couple, the box and the day of the unlock, so that the box stays open for both partners, as long as the couple exists; correcting, deleting and exporting it are decided with leaving ([card-box](card-box.md) R64).
- R84. Once unlocked, the box's tile shows no price.

Gift unlock

- R78. When every preview card of a paid box was seen on the phone, the next draw shows a buy view instead of a card: the box's cover, name and price and a "Mua hộp" / "Buy box" action; nothing is paid.
- R79. Choosing "Mua hộp" shows a message, "Bạn tính mua thật à? Đùa thôi, cái này tôi tặng bạn." / "You were really going to pay? Just kidding, this one's on us.", with one action, "Nhận hộp" / "Get the box".
- R80. "Nhận hộp" unlocks the box for the couple, once and for good, for both partners (R4, R5); the player continues at once with the full box, cards seen as preview count as seen, and drawing goes on as in [card-box](card-box.md) R13.
- R81. Only a partner in a couple can unlock a box, and only a paid box that exists; a free or unknown box cannot be unlocked, and unlocking a box the couple already has changes nothing and gives the same result.
- R82. Offline, "Mua hộp" and "Nhận hộp" are disabled and the needs-connection message shows as elsewhere in Bisou (R40).
- R83. A couple that closed the buy view can get it again: reopening the box with every preview card already seen on that phone shows the buy view at once.

## Main flows and exceptions

- Flow for US1: the couple opens a paid box, draws its preview cards in random order, and after the last one meets the buy view instead of a card.
- Flow for US2: "Mua hộp" opens the joke message, "Nhận hộp" unlocks and the whole box plays at once; the partner's phone shows it open on its next refresh; closing the buy view and reopening the box shows it again; offline, the buttons are disabled.

## Acceptance criteria

- AC2 (R4, R5). Given one partner unlocked a box, then the other plays all of it too, with nothing to pay or renew, and it stays open on later days.
- AC14 (R27, R28). Given a couple without a paid box, then only its preview cards come up, never another card; after all were seen the next draw shows the buy view and no card.
- AC15 (R27). Given one preview card seen on Friday, when the couple reopens the box on Saturday, then it continues with the preview cards not yet seen, and previous card works as in a free box.
- AC17 (R31). Given two preview cards seen, then neither comes up again on that phone until the third was seen.
- AC23 (R39). Given one partner unlocked a box, when the other's phone next refreshes, then they play all of it and neither phone got a notification.
- AC24 (R40). Given a partner is offline at the buy view, then they cannot unlock the box (AC45).
- AC25 (R42). Given a couple without the box, then nothing Bisou gives their phones, by any means, holds the text of any card other than the preview cards.
- AC41 (R78, R28). Given every preview card was seen, when the partner asks for the next card, then the buy view shows with the cover, name, price and "Mua hộp", no card shows, and no "preview ended" line shows anywhere.
- AC42 (R79). Given a partner chooses "Mua hộp", then the message shows the Vietnamese text, or the English text when their app is in English, with the single action "Nhận hộp" / "Get the box".
- AC43 (R80, R4, R5). Given a partner chooses "Nhận hộp", then they draw from all the cards at once, the preview cards do not repeat until the others were seen, and the box is still open a month later with nothing to pay or renew.
- AC44 (R81). Given a couple already unlocked a box, when the other partner chooses "Nhận hộp" or the first does twice, then the box is open once with the same result; a free or unknown box cannot be unlocked, and a person not yet paired cannot unlock anything.
- AC45 (R82, R40). Given a partner is offline at the buy view, then "Mua hộp" is disabled with the needs-connection message and nothing is unlocked.
- AC46 (R83). Given a partner closed the buy view and reopens the box the next day with all preview cards still seen on their phone, then the buy view shows at once.
- AC47 (R84). Given a couple unlocked a box, then its tile on Home and in the list shows no price.
- AC48 (R85, R43). Given the Home block and the box list, then a locked paid box shows its cover, name, description and price in both, and no purchase, contact or code entry.

## Glossary

- **Preview** (xem thử): the cards marked as preview in a paid box; a couple without the box plays only these.
- **Free box** (hộp miễn phí) and **paid box** (hộp trả phí); **open box** (hộp đã mở) and **locked box** (hộp chưa mở) as ownership states.
- **Buy view** (màn mua hộp): what shows after the last preview card, with the box's cover, name, price and "Mua hộp".
- **Gift unlock** (hộp được tặng): the unlock "Nhận hộp" gives.

## Out of scope

- Unlocking a paid box with a code, real payment and contact: see todo.md.
- Payment inside Bisou, refunds and taking back an unlock.
- Subscription; bundles until there are 3 or more paid boxes.
- Owned boxes when a couple splits, export and account deletion ([card-box](card-box.md) R64).

## Open questions

None.

Retired: R29, R30, R32, R33, R34, R35, R36, R37, R38, R41, R55, R56, R57, R59, R60, AC16, AC18, AC19, AC20, AC21, AC22, AC29
