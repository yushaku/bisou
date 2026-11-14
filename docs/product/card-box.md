# Card box (hộp thẻ)

## Purpose

Two partners sitting together, or on a call, want something good to talk about right now, with nothing to write, nothing scored and nothing kept. A card box gives them one card at a time on a topic; they read it and talk in person. Paid boxes and their unlocking are in [card-box-unlock](card-box-unlock.md), the launch boxes and card copy in [card-box-content](card-box-content.md). It builds on [pairing](pairing.md) and stays apart from the [garden](garden.md).

## Actors

- **Partner**: a member of a couple; both have the same rights over the couple's boxes.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): see the couple's boxes in my language and pick one, so that we choose a topic for tonight. AC1, AC3, AC5, AC6
- US2 (partner): draw cards one at a time, go back to earlier ones and skip freely, so that we always have something fresh to talk about. AC7, AC8, AC9, AC10
- US3 (partner): get cards that tell us what to say or do aloud, so that we talk without typing or scoring anything. AC11, AC12, AC13, AC35, AC36
- US4 (partner): change cards by swipe or by action, so that one hand is enough. AC32, AC33
- US5 (partner): keep playing a box already opened when I have no connection, so that a bus ride does not stop us. AC26, AC27
- US6 (partner): be sure play leaves no trace for others and never touches the garden, so that it stays light. AC4, AC30

## Business rules

Boxes

- R1. Card boxes are for partners in a couple: a person not yet paired has none, and an outsider learns nothing of which boxes a couple has played.
- R2. A box has a name, a one-line description and an ordered list of cards, each in Vietnamese and English; it has a cover image; it is free or paid, a paid box has a price, and in a paid box some cards are marked as preview.
- R3. Bisou has one or two free boxes, each open in full to every couple; paid boxes may be added at any time under the same rules.
- R6. Box names, descriptions and cards show in the reader's app language, so the two partners may read the same card in different languages.
- R7. The copy calls a set "hộp" / "box", never "bộ thẻ", "deck" or "thẻ hôm nay", which belong to the [garden](garden.md).
- R8. Playing a box never touches the garden (no card, growth or freshness change) and never sends a notification.

On Home and in the box list

- R9. Home shows the card box block right under today's card, or in its place when there is no today's card ([garden](garden.md) R11); the main areas of Bisou stay as they are.
- R10. The block shows the first 4 boxes of the box list order (R11) as a 2-column grid of tiles, without descriptions; tapping a box opens it, and the block also opens the box list.
- R11. The box list shows every box in the same grid: 18+ boxes always last; before them, free ones first, then paid ones, each group in Bisou's own order.
- R12. A tile shows the box's cover, name, description (box list only) and total card count, locked paid boxes included ("10 thẻ" / "10 cards"), and "Miễn phí" / "Free" for a free box or the price for a locked paid box; it has no purchase, contact or code entry, score or streak. While playing, a quiet counter shows "Đã xem 4/10" / "Seen 4/10" for an open box or "Xem thử 2/3" / "Preview 2/3" for a preview, counting distinct cards seen on this phone out of the playable total; next card and a random draw update it, previous card does not, and start over resets it to 1.

Drawing cards

- R13. Opening a box shows a card drawn at random among that box's cards not yet seen on this phone; "Thẻ tiếp" / "Next card" draws another the same way, unless the couple stepped back (R17).
- R14. A card counts as seen on a phone once it was shown there; each phone keeps its own history, so one phone may show cards the other already saw.
- R15. There is no limit on draws, no session to start or finish, and reopening the box later, on any day, continues with the cards not yet seen on that phone.
- R16. Once every card of a box was seen on a phone, the next draw starts that box over with every card unseen, never repeating the card just shown, and says once "Hai đứa đã xem hết hộp này, mình bắt đầu lại nhé" / "You've seen the whole box, starting over"; a locked paid box shows its buy view instead ([card-box-unlock](card-box-unlock.md) R28).
- R17. "Thẻ trước" / "Previous card" steps back through every card shown since the box was opened, one card per tap, until the first one; from a past card, next card shows the next card of that stack again, and draws a new card as R13 only from the newest one.
- R18. Any card can be skipped with next card: Bisou never asks why, marks nothing and suggests no card is expected to be done.

Card kinds

- R19. Every card is one of six kinds and shows its kind label: question ("Câu hỏi" / "Question"), dare ("Thử" / "Try it"), rather ("Chọn một" / "Pick one"), point ("Ai hơn?" / "Who's more?"), scale ("Từ 1 đến 10" / "1 to 10") or truth or dare ("Thật hay thử thách" / "Truth or dare").
- R20. A question card shows one question; each partner answers aloud in turn.
- R21. A dare card shows one small thing both partners do right now, together.
- R22. A rather card shows two options as two blocks; each partner says which one they pick and why.
- R23. A point card shows one "Ai hay… hơn?" / "Who… more?" line; on three, both point at once at the partner they mean.
- R24. A scale card shows one question with what 1 and 10 mean; each partner says a number from 1 to 10 aloud.
- R25. No card has anywhere to type, pick or rate: tapping a block, a number or a name records nothing, and Bisou keeps no answer, choice, number or result; a scale number is never a score.
- R26. A box may hold any mix of kinds.
- R71. A truth or dare card shows two blocks, "Thật" / "Truth" with one question both partners answer aloud in turn and "Thử thách" / "Dare" with one small thing both do right now, together; whoever drew reads both and says aloud which one they do, nothing is selected and nothing is recorded (R25).
- R72. Truth or dare cards are drawn at random like every card (R13 to R17), with no step to choose truth or dare first, and next card never asks which side was done (R18).

Playing a card

- R66. Swiping left on the card shows the next card, exactly as next card (R13, R17); swiping right shows the previous card, exactly as previous card (R17), and does nothing on the first card.
- R68. Next card and previous card stay available as actions and do the same as the swipes, so the player works one-handed and without swiping.
- R69. When the person asks for reduced motion, the card change is a short fade instead of a flying motion, and every other rule is the same.

Offline and data

- R44. A box opened once with a connection on a phone plays on that phone without one: drawing, previous card and start over work as online.
- R45. Offline, the Home block and the box list show what was loaded, with the offline notice.
- R46. A box never opened with a connection on that phone says it needs a connection and shows no card.
- R61. Which cards were seen stays on each phone and never reaches Bisou or the partner; clearing Bisou's data on a phone starts every box over there.
- R62. Bisou keeps no answer, choice, number or reaction to any card, and no record of which cards a couple drew or when.
- R63. Both partners see the same boxes in the box list, and the same ones open.
- R64. A couple splitting, export and account deletion are decided when leaving exists ([pairing](pairing.md) R2), including what happens to the couple's unlocked boxes; this spec promises nothing more until then.

## Main flows and exceptions

- Flow for US1: Home shows the grid under today's card; a tile opens its box; the block opens the full list.
- Flow for US2: the first card shows at once; next card draws, previous card walks back; when all cards were seen the box starts over with one line, once.
- Flow for US3: each card shows its kind label and its text; nothing on it takes input.
- Flow for US4: a swipe or an action changes the card; on the first card swiping right does nothing.
- Flow for US5: a box never opened with a connection says it needs one and shows no card.
- Flow for US6: closing the app loses nothing the couple cares about, since nothing but the seen history on the phone is kept.

## Acceptance criteria

- AC1 (R1, R63). Given a couple, then both see the same boxes; a person not yet paired sees none, and an outsider cannot tell which boxes they played.
- AC3 (R6). Given one partner's app is in English and the other's in Vietnamese, when both look at the same card, then each reads it in their own language.
- AC4 (R8). Given the couple plays 20 cards, then today's card, every plant and its freshness are unchanged, and neither phone gets a notification.
- AC5 (R9, R10, R11). Given six boxes, two of them 18+, then Home shows today's card, then the block as a grid of the first 4 boxes with the free boxes first and no 18+ box, each tile with cover and name but no description; the box list shows all six with the two 18+ boxes last.
- AC6 (R11, R12). Given Home or the box list, then free boxes come first and every tile shows the card count, including locked paid boxes; free boxes show "Miễn phí", locked paid boxes their price, unlocked paid boxes none; given 4 of 10 cards seen on this phone, then the player shows "Đã xem 4/10"; given 2 of 3 preview cards seen, then it shows "Xem thử 2/3", without revealing other cards; next card updates the count, previous card leaves it, start over shows 1.
- AC7 (R13, R14). Given a partner saw two cards on one phone, then neither comes up again on it until all were seen; on the other phone either may come up.
- AC8 (R15). Given a partner draws 30 times in one evening, then nothing stops them; when they reopen the box the next day, then it continues with cards not yet seen on that phone.
- AC9 (R16). Given all cards were seen on a phone, when the partner asks for the next card, then a different card shows with the start-over line, once.
- AC10 (R17). Given three cards shown in order, when the partner steps back twice, then the second and first show and they cannot go further; next card then shows the second, then the third, and only after that a card not yet seen.
- AC11 (R19, R23, R25). Given a point card, then it shows the label "Ai hơn?" and the line, and nothing to tap to choose a partner.
- AC12 (R22, R25). Given a rather card, then both options show as two blocks; tapping one marks nothing and nothing is kept.
- AC13 (R24, R25). Given a scale card, then it shows the question with what 1 and 10 mean, no number to select and no total anywhere.
- AC26 (R44). Given both boxes were opened online, when the phone is offline, then both play and previous card works.
- AC27 (R45, R46). Given a box never opened on a phone, when it is offline, then the block and list still show, and opening that box says it needs a connection.
- AC30 (R61, R62). Given an ordinary evening of play, then Bisou holds no box ownership beyond the unlocked ones ([card-box-unlock](card-box-unlock.md) R58), no record of which cards were drawn and nothing of what the partners said.
- AC32 (R66, R68). Given a partner on the second card, when they swipe right, then the first card shows as if previous card was pressed; when they swipe left, then the second shows as if next card was pressed; on the first card a right swipe changes nothing.
- AC33 (R69). Given the phone asks for reduced motion, when the card changes by swipe or action, then it changes with a short fade and no flying motion.
- AC35 (R71, R19, R25). Given a truth or dare card in Vietnamese, then the partner sees the label "Thật hay thử thách" and two blocks "Thật" and "Thử thách"; in English "Truth or dare", "Truth" and "Dare"; tapping either block marks nothing and nothing is kept.
- AC36 (R72). Given a box of truth or dare cards, then a card with both sides shows right away with nothing to pick first; next card shows the next card without asking what they did.

## Glossary

- **Card box** (hộp thẻ): the capability; **box** (hộp): one topic set of cards; **tile** (thẻ sản phẩm): a box shown in the grid.
- **Draw** (rút thẻ), **next card** (thẻ tiếp), **previous card** (thẻ trước), **seen** (đã xem), **start over** (bắt đầu lại).
- **Kinds** (loại thẻ): question (câu hỏi), dare (thử), rather (chọn một), point (ai hơn), scale (từ 1 đến 10), truth or dare (thật hay thử thách).
- **Swipe** (vuốt): left for the next card, right for the previous one.

## Out of scope

- Two phones showing the same card in sync; seen history shared between phones.
- Saving answers, choices, reactions, ratings, results or any score.
- Any link to the garden (no "save to garden", no growth or freshness) and any notification.
- Depth-ordered sessions and writing one's own cards.
- Owned boxes when a couple splits, export and account deletion (R64).

## Open questions

None.

Retired: R65, R67, AC31
