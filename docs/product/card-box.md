# Hộp thẻ / Card box

## Decided at Gate 1

PO, 11 November 2026 (one-pager D1 to D8 and A1 to A5, Gate 1 answers G1 to G6, then the answers to Decisions 1 to 14; 12 November 2026, the UI round after testing the local build). Later items win over earlier ones.

1. D1. Named "Hộp thẻ" / "Card box"; each topic set is a box ("hộp Deep Connection"); the copy never says "bộ thẻ", "deck" or "thẻ hôm nay" (R7).
2. D2. A paid box unlocks per couple: one partner unlocks it, both use it (R4, R33). (Deferred: unlock, see todo.md.)
3. D3. One-time unlock per box, no subscription; bundles only once there are 3 or more paid boxes (R5, Out of scope). (Deferred: unlock, see todo.md.)
4. D4 (revised by 21 and 22). One or two free boxes open in full; a paid box plays only its preview cards for a couple without it; Bisou never hands non-preview card text to such a couple (R3, R27, R28, R42).
5. D5. Random draw among unseen cards, no card limit, no session; seen history only on the phone; a previous card button (R13 to R17).
6. D6. A block on Home under today's card, with the boxes, opening the box list; no new tab (R9 to R11).
7. D7 (superseded by 22). Unlocking with a code and payment are out of v1.
8. D8. Several card kinds from the start (R19).
9. A1. Five kinds: question, dare ("Thử"), rather, point, scale; none takes an answer and nothing is recorded, so a scale number is not a score (R19 to R25).
10. A2. Dares happen on the spot, together, never intimate and never in front of others; card copy follows [garden](garden.md) R62 although the features are separate (R48 to R53).
11. A3. Every card has Vietnamese and English text (R2, R6).
12. A4. Cards play on one phone; a loaded box works offline (R44 to R46).
13. A5. Unseen history starts over per box once every card was seen (R16).
14. G1. Launch with one free and one paid sample box of about 10 cards each, all five kinds covered between them; full content is written later; cards are original Bisou writing, sources only for reference (R3, R47, Appendix).
15. G2 (superseded by 22). The unlock screen with price, contact and code field is deferred (R29, R30).
16. G3 (superseded by 22). Codes, their limits and issuing are deferred (R32 to R38, R55).
17. G4. What happens to unlocked boxes when a couple splits is deferred, since leaving does not exist yet (R64, Out of scope).
18. G5 and G6 set the design step and the branch; they add no business rule. The design step is text only (flow and messages), no mockups.
19. Decision 1. A person not yet paired has no boxes, like the garden and the wish jar (R1).
20. Decision 2. "Thẻ trước" goes back through every card drawn since the box was opened, not one card (R17). From a past card, "Thẻ tiếp" moves forward through the cards already drawn before drawing a new one.
21. Decision 3. Each paid box has cards marked as preview in its content, not the first 3 by position; a couple without the box draws only among them, with draw, previous card and start over as in a free box (R27 to R31).
22. Decision 4. Payment and unlocking are out of v1 and go to todo.md: no price, contact, code field, codes, issuing or rate limit. When every preview card was seen, the next draw shows one line that the full box is not open yet, then the preview starts over; the box list marks paid boxes "Xem thử". Bisou never sends the non-preview cards of a paid box (R28, R29, R42).
23. Decisions 5 to 14, recommended options: 5 to 8 are moot with no unlocking; 9 dares ask at most holding hands or a hug (R50); 10 kind labels as in R19; 11 no count of cards seen or left (R12); 12 the start-over line shows once (R16); 13 the block sits right under today's card (R9); 14 the free box keeps the name "Làm quen lại". Copy follows this spec: "Thẻ tiếp", no count, start-over line once.
24. Spec v2 open points, recommended options: from a past card "Thẻ tiếp" moves forward through the cards already drawn before drawing a new one (R17); the preview continues with the preview cards not yet seen on this phone across openings, as in a free box (R15, R27).
25. UI round, item 14 (revises 22 "no price"). The box list and the Home block show boxes as a 2-column grid of product cards, each with a cover image, name, description and price: "Miễn phí" for a free box, the price (for example 49.000đ) with "Xem thử" for a paid box. Still no buy, contact or code: unlocking stays deferred (R9 to R12, R29, R43).
26. UI round, item 15. The card in the player looks like a physical card; swipe left shows the next card, swipe right the previous one, with a visible transition when the card changes; "Thẻ trước" and "Thẻ tiếp" do the same; with reduced motion the change is a short crossfade (R65 to R69).

## Purpose

Two partners sitting together, or on a call, want something good to talk about right now, with nothing to write, nothing scored and nothing kept. A card box gives them one card at a time on a topic; they read it and talk in person. Some boxes are free; a paid box shows only its preview cards for now, and unlocking it comes later. It builds on [pairing](pairing.md) and stays apart from the [garden](garden.md).

## Actors

- **Partner**: a member of a couple; both have the same rights over the couple's boxes.
- **PO**: Bisou's owner, who decides which boxes exist and which cards of a paid box are preview.
- **Outsider**: anyone else, unpaired people included.

## Running example

Sơn and Linh sit together on Friday evening, 13 November 2026. Linh opens Home, taps the card box block, sees the boxes as a grid of product cards, picks the free box "Làm quen lại" (marked "Miễn phí"), draws cards on her phone, swiping left for the next card, and they talk. Then she opens the paid box "Deep Connection" (49.000đ, "Xem thử") and plays its preview cards; when all of them were seen, a short line says the rest of the box is not open yet and the preview starts over. There is no code to enter.

## 1. Boxes

A box is a set of cards on one topic. Free boxes are open in full to every couple; a paid box plays only its preview cards.

Example: on 13 November Sơn and Linh have "Làm quen lại", free, and "Deep Connection", paid, which they can try through its 3 preview cards.

- R1. Card boxes are for partners in a couple: a person not yet paired has none, and an outsider learns nothing of which boxes a couple has played.
- R2. A box has a name, a one-line description and an ordered list of cards, each in Vietnamese and English; it has a cover image; it is free or paid, a paid box has a price, and in a paid box some cards are marked as preview.
- R3. Bisou has one or two free boxes, each open in full to every couple; paid boxes may be added at any time under the same rules.
- R4. (Deferred: unlock, see todo.md.) A paid box belongs to the couple once either partner unlocks it.
- R5. (Deferred: unlock, see todo.md.) An unlock is once and for good: no subscription, renewal or expiry.
- R6. Box names, descriptions and cards show in the reader's app language, so the two partners may read the same card in different languages.
- R7. The copy calls a set "hộp" / "box", never "bộ thẻ", "deck" or "thẻ hôm nay", which belong to the [garden](garden.md); "mở khoá hộp" / "unlock the box" is kept for when unlocking comes (Deferred: unlock, see todo.md).
- R8. Playing a box never touches the garden (no card, growth or freshness change) and never sends a notification.

- AC1 (R1). Given Sơn and Linh are a couple, then both see the boxes; a person not yet paired sees none, and an outsider cannot tell which boxes they have played.
- AC2 (R4, R5). (Deferred: unlock, see todo.md.) Given Sơn unlocked Deep Connection, then Linh plays all of it too, with nothing to pay or renew.
- AC3 (R6). Given Linh's app is in English and Sơn's in Vietnamese, when both look at lql-01, then Linh reads "Which food tastes like home to you? Tell each other about it." and Sơn reads its Vietnamese text.
- AC4 (R8). Given they play 20 cards, then today's card, every plant and its freshness are unchanged, and neither phone gets a notification.

## 2. On Home and the box list

Boxes are reached from a block on Home, under today's card. The tab bar stays as it is. Both the block and the list show boxes like a shop: a 2-column grid of product cards.

Example: at 20:00 Linh opens Home. Under today's card she sees the card box block as a grid: "Làm quen lại" with its cover, description and "Miễn phí", next to "Deep Connection" with its cover, description, "49.000đ" and "Xem thử". Tapping the block's title shows the box list in the same grid.

- R9. Home shows the card box block right under today's card, or in its place when there is no today's card ([garden](garden.md) R11); the tab bar keeps Home, Journal, Wishes and Garden.
- R10. The block shows the boxes as a 2-column grid of product cards, free boxes first, then paid boxes; each card shows the box's cover image, name, description and price (R12); tapping a box opens it, and the block also opens the box list.
- R11. The box list shows every box in the same 2-column grid of product cards, free ones first, then paid ones, each group in Bisou's own order.
- R12. A product card shows "Miễn phí" / "Free" for a free box, and for a paid box its price, for example 49.000đ, together with the mark "Xem thử" / "Preview". It has no buy button, contact or code field, and neither the block nor the list shows how many cards were seen or are left, nor any progress, score or streak.

- AC5 (R9, R10). Given 13 November, then Linh's Home shows today's card, then the block as a 2-column grid with Làm quen lại followed by Deep Connection, each with cover image, name and description; the tab bar still has four tabs.
- AC6 (R11, R12). Given the box list, then it is a 2-column grid; Làm quen lại comes first with "Miễn phí", and Deep Connection shows "49.000đ" and "Xem thử"; no buy, contact or code field, and no count of cards seen or left.

## 3. Drawing cards

In an open box a partner draws one card at a time, at random, among cards not yet seen on that phone. There is no limit and no session: they stop when they like.

Example: at 20:05 Linh opens Làm quen lại and gets lql-04; she taps "Thẻ tiếp" and gets lql-08, then lql-02. Sơn wants lql-04 again, so she taps "Thẻ trước" twice. By 20:50 they have seen all ten cards on Linh's phone; the next draw starts the box over.

- R13. Opening a box shows a card drawn at random among that box's cards not yet seen on this phone; "Thẻ tiếp" / "Next card" draws another the same way, unless the couple stepped back (R17).
- R14. A card counts as seen on a phone once it was shown there; each phone keeps its own history, so Sơn's phone may show cards Linh already saw.
- R15. There is no limit on draws, no session to start or finish, and reopening the box later, on any day, continues with the cards not yet seen on that phone.
- R16. Once every card of a box was seen on a phone, the next draw starts that box over with every card unseen, never repeating the card just shown, and says once "Hai đứa đã xem hết hộp này, mình bắt đầu lại nhé" / "You've seen the whole box, starting over". A paid box's preview says the line in R28 instead.
- R17. "Thẻ trước" / "Previous card" steps back through every card shown since the box was opened, one card per tap, until the first one. From a past card, "Thẻ tiếp" shows the next card of that stack again, and draws a new card as R13 only from the newest one.
- R18. Any card can be skipped with "Thẻ tiếp": Bisou never asks why, marks nothing and suggests no card is expected to be done.

- AC7 (R13, R14). Given Linh saw lql-04 and lql-08 on her phone, then neither comes up again on it until all ten were seen; on Sơn's phone either may come up.
- AC8 (R15). Given Linh draws 30 times in one evening, then nothing stops her; when she reopens Làm quen lại on Saturday, then it continues with cards not yet seen on her phone.
- AC9 (R16). Given all ten cards were seen on Linh's phone and lql-10 is showing, when she taps "Thẻ tiếp", then a card other than lql-10 shows with the start-over line, once.
- AC10 (R17). Given Linh was shown lql-04, lql-08 and lql-02 in this order, when she taps "Thẻ trước" twice, then lql-08 and lql-04 show and she can go back no further; "Thẻ tiếp" then shows lql-08, then lql-02, and only after that a card not yet seen.

## 4. Card kinds

Every card is one of five kinds. The kind tells the couple what to do aloud; nothing is typed, picked or kept.

Example: lql-03 reads "Ai hay hát một mình trong nhà tắm hơn?"; they count to three and both point: Linh at Sơn, and Sơn at Sơn. lql-06 asks how much each likes the rainy season; Sơn says 8, Linh says 3, and Bisou shows only the question and what 1 and 10 mean.

- R19. Every card is one of five kinds and shows its kind label: question ("Câu hỏi" / "Question"), dare ("Thử" / "Try it"), rather ("Chọn một" / "Pick one"), point ("Ai hơn?" / "Who's more?") or scale ("Từ 1 đến 10" / "1 to 10").
- R20. A question card shows one question; each partner answers aloud in turn.
- R21. A dare card shows one small thing both partners do right now, together.
- R22. A rather card shows two options as two blocks; each partner says which one they pick and why.
- R23. A point card shows one "Ai hay… hơn?" / "Who… more?" line; on three, both point at once at the partner they mean.
- R24. A scale card shows one question with what 1 and 10 mean; each partner says a number from 1 to 10 aloud.
- R25. No card has anywhere to type, pick or rate: tapping a block, a number or a name records nothing, and Bisou keeps no answer, choice, number or result; a scale number is never a score.
- R26. A box may hold any mix of kinds.

- AC11 (R19, R23, R25). Given lql-03, then Linh sees the label "Ai hơn?" and the line, and nothing to tap to choose a partner.
- AC12 (R22, R25). Given lql-02, then both options show as two blocks; tapping one marks nothing and nothing is kept.
- AC13 (R24, R25). Given lql-06, then Linh sees the question with 1 "Chỉ mong trời nắng" and 10 "Mưa là vui", no number to select and no total anywhere.

## 5. Preview

Any couple can try a paid box through its preview cards, the cards the box's content marks as preview. Which cards they are does not depend on their position in the box.

Example: at 21:00 Linh opens Deep Connection, whose preview cards are dc-02, dc-05 and dc-07. She draws them in a random order, goes back with "Thẻ trước", and once all three were seen, a line says the rest of the box is not open yet and the three start over.

- R27. A couple that does not have a paid box draws only among its preview cards, with draw, previous card and start over working as in a free box (R13 to R17); no other card of the box shows.
- R28. When every preview card was seen on the phone, the next draw shows once "Hết thẻ xem thử. Phần còn lại của hộp sẽ mở sau." / "That's all the preview cards. The rest of the box opens later.", then the preview starts over with every preview card unseen, never repeating the card just shown.
- R29. The Home block and the box list mark a paid box "Xem thử" / "Preview" and show its price (R12); no buy button, contact or code field shows. (Unlock screen: Deferred: unlock, see todo.md.)
- R30. (Deferred: unlock, see todo.md.) A way to contact Bisou for a box.
- R31. Preview cards count as seen on a phone like any card (R14, R15).

- AC14 (R27, R28). Given Linh opens Deep Connection, then only dc-02, dc-05 and dc-07 come up, never another card; after all three were seen the next draw shows the "Hết thẻ xem thử" line once and a preview card other than the one just shown.
- AC15 (R27). Given Linh saw dc-05 on Friday and reopens Deep Connection on Saturday, then she continues with dc-02 and dc-07 not yet seen, and "Thẻ trước" works as in a free box.
- AC16 (R29). Given the Home block and the box list, then Deep Connection shows "49.000đ" and is marked "Xem thử" in both, and no buy button, contact or code field shows anywhere.
- AC17 (R31). Given Linh saw dc-02 and dc-05, then neither comes up again on her phone until dc-07 was seen.

## 6. Codes (deferred)

(Deferred: unlock, see todo.md.) A code would unlock one paid box for the couple. None of this is in v1: no code field, no codes, no limit on tries.

- R32. (Deferred: unlock, see todo.md.) A code has 6 characters from the invite code alphabet ([pairing](pairing.md) R6).
- R33. (Deferred: unlock, see todo.md.) A code names one paid box, works once and unlocks it for the couple.
- R34. (Deferred: unlock, see todo.md.) A code does not expire until used.
- R35. (Deferred: unlock, see todo.md.) A code for another box unlocks the box it names.
- R36. (Deferred: unlock, see todo.md.) A code for an owned box says "đã mở khoá" and is not used up.
- R37. (Deferred: unlock, see todo.md.) A wrong or used code gets one message and counts as a wrong try.
- R38. (Deferred: unlock, see todo.md.) At most 10 wrong tries per person per rolling hour.
- R39. (Deferred: unlock, see todo.md.) An unlock reaches the partner's phone with no notification.
- R40. (Deferred: unlock, see todo.md.) Unlocking needs a connection.
- R41. (Deferred: unlock, see todo.md.) However the box was paid for, the unlock is the same.

- AC18 (R32, R33). (Deferred: unlock, see todo.md.)
- AC19 (R36). (Deferred: unlock, see todo.md.)
- AC20 (R37). (Deferred: unlock, see todo.md.)
- AC21 (R38). (Deferred: unlock, see todo.md.)
- AC22 (R35). (Deferred: unlock, see todo.md.)
- AC23 (R39). (Deferred: unlock, see todo.md.)
- AC24 (R40). (Deferred: unlock, see todo.md.)

## 7. Locked cards stay locked

A couple can read the preview cards of a paid box and nothing more, anywhere. No couple has a paid box in v1.

Example: on 13 November nothing on Sơn's or Linh's phone holds the text of any Deep Connection card other than dc-02, dc-05 and dc-07, online or offline.

- R42. The server never sends the non-preview cards of a paid box to any couple, by any means in Bisou, on either phone.
- R43. Every couple can see the cover image, name, description and price of every paid box.

- AC25 (R42). Given Sơn and Linh open Deep Connection, then nothing Bisou gives their phones, by any means, holds the text of any card other than dc-02, dc-05 and dc-07.

## 8. Offline

A box loaded once on a phone plays on that phone without a connection. As on every screen ([installed app](pwa.md), Offline), loaded data stays visible.

Example: on Saturday Sơn and Linh are on a bus without signal; Linh opens Làm quen lại and Deep Connection, both opened on her phone the evening before, and draws as usual.

- R44. A box opened once with a connection on a phone plays on that phone without one: drawing, the previous card and the start-over in R16 and R28 work as online.
- R45. Offline, the Home block and the box list show what was loaded, while the offline toast shows.
- R46. A box never opened with a connection on that phone says it needs a connection and shows no card.

- AC26 (R44). Given Linh opened both boxes online on Friday, when she is offline on Saturday, then both play and the previous card works.
- AC27 (R45, R46). Given Sơn never opened Deep Connection on his phone, when Sơn is offline, then the block and list still show, and opening Deep Connection says it needs a connection.

## 9. Card copy

Cards are Bisou's own writing, warm and plain, for two adults talking face to face. The garden's copy rule applies to every card.

Example: dc-07 asks Sơn and Linh to hold hands and each say a "Cảm ơn vì..." sentence; no card asks them to kiss, to message a friend or to do anything where others can see.

- R47. Every card is original Bisou writing; no card copies another app, game or list.
- R48. Every card follows [garden](garden.md) R62: respectful adult language, no private financial or intimate details required, and nothing that implies consent to intimacy.
- R49. A dare is done right then, by both partners together where they are, within a few minutes, with nothing to buy or prepare.
- R50. A dare asks at most light affection either partner can easily decline, such as holding hands or a hug; never kissing, undressing or anything sexual.
- R51. A dare never involves anyone else or being seen: no calling, messaging or posting to others, nothing done in public.
- R52. A point card is about a harmless habit or a sweet trait, never a fault that blames or mocks.
- R53. A scale card asks each partner about themselves, never to rate the other partner, the relationship or their love.
- R54. A card's Vietnamese and English say the same thing, each written naturally; Vietnamese cards speak to both partners without "anh" / "em" or any form that assumes who is who.

- AC28 (R49 to R54). Given the launch cards in the appendix, then each dare can be done on the spot by the two of them alone with at most holding hands, each point card is about a harmless habit, each scale card asks about oneself, and no Vietnamese card uses "anh" or "em".

## 10. Issuing codes (deferred)

(Deferred: unlock, see todo.md.) In v1 there is no payment and no code; nobody issues anything.

- R55. (Deferred: unlock, see todo.md.) Only the PO creates codes, outside the app.
- R56. (Deferred: unlock, see todo.md.) The PO hands each code to the buyer outside the app.
- R57. (Deferred: unlock, see todo.md.) The PO can check whether a code was used.

- AC29 (R55, R56). (Deferred: unlock, see todo.md.)

## 11. Personal data

In v1 Bisou keeps nothing about a couple's card play: no codes, no wrong tries, no ownership rows. There is nothing to see, correct, delete or export beyond what each phone holds.

Example: on the evening of 13 November Bisou holds nothing of Sơn and Linh's play; which cards Linh saw lives only on Linh's phone.

- R58. (Deferred: unlock, see todo.md.) Bisou would keep which paid boxes a couple owns and the day each was unlocked.
- R59. (Deferred: unlock, see todo.md.) Bisou would keep for each code its box and, once used, the couple and the day.
- R60. (Deferred: unlock, see todo.md.) Wrong tries would be kept per person for one hour.
- R61. Which cards were seen stays on each phone and never reaches Bisou or the partner; clearing Bisou's data on a phone starts every box over there.
- R62. Bisou keeps no answer, choice, number or reaction to any card, and no record of which cards a couple drew or when.
- R63. Both partners see the same boxes in the box list. (Owned boxes: Deferred: unlock, see todo.md.)
- R64. A couple splitting, export and account deletion are decided when leaving exists ([pairing](pairing.md) R2); this spec promises nothing more until then. (Owned boxes: Deferred: unlock, see todo.md.)

- AC30 (R58 to R62). Given the evening of 13 November, then Bisou holds no code, no wrong try, no box ownership, no record of which cards they drew and nothing of what they said.

## 12. The card player

The card on screen looks like a physical card and moves like one. This adds to the drawing rules in section 3 and changes none of them.

Example: Linh swipes left on lql-04 and the card flies off with a slight turn while lql-08 settles from the deck; she swipes right and lql-04 comes back. Sơn, one-handed, taps "Thẻ tiếp" and gets the same result.

- R65. The card looks like a physical card: playing-card proportions, rounded corners, a paper look and a deck edge behind it.
- R66. Swiping left on the card shows the next card, exactly as "Thẻ tiếp" (R13, R17); swiping right shows the previous card, exactly as "Thẻ trước" (R17), and does nothing on the first card.
- R67. When the card changes, a visible transition plays: the old card flies off with a slight rotation and the next one settles from the deck.
- R68. "Thẻ trước" and "Thẻ tiếp" stay on screen and do the same as the swipes, with the same transition, so the player works one-handed and without swiping.
- R69. When the phone asks for reduced motion, the card change is a short crossfade instead of the fly-off and settle, and every other rule is the same.

- AC31 (R65). Given Linh opens a card, then it shows with playing-card proportions, rounded corners, a paper look and a deck edge behind it.
- AC32 (R66, R67, R68). Given Linh is on lql-08 after lql-04, when she swipes right, then lql-04 shows with the transition, as if she tapped "Thẻ trước"; when she swipes left, then lql-08 shows, as if she tapped "Thẻ tiếp"; on the first card a right swipe changes nothing.
- AC33 (R69). Given Linh's phone asks for reduced motion, when she changes the card by swipe or button, then the cards change with a short crossfade and no flying or rotating.

## Decisions to confirm

None open.

## Glossary

- **Card box** (hộp thẻ): the feature; **box** (hộp): one topic set of cards.
- **Free box** (hộp miễn phí) and **paid box** (hộp trả phí).
- **Product card** (thẻ sản phẩm): a box shown in the grid with cover image, name, description and price; **swipe** (vuốt): left for the next card, right for the previous one.
- **Preview** (xem thử): the cards marked as preview in a paid box; a couple without the box plays only these.
- **Draw** (rút thẻ), **next card** (thẻ tiếp), **previous card** (thẻ trước), **seen** (đã xem), **start over** (bắt đầu lại).
- **Kinds** (loại thẻ): question (câu hỏi), dare (thử), rather (chọn một), point (ai hơn), scale (từ 1 đến 10).
- Deferred with unlocking (see todo.md): **unlock** (mở khoá hộp), **code** (mã mở khoá), **unlock screen** (màn mở khoá), **wrong try** (lần nhập sai), **open box** (hộp đã mở) and **locked box** (hộp chưa mở) as ownership states.

## Out of scope

- Unlocking a paid box (codes, price, payment): next, see todo.md.
- Payment inside Bisou, refunds and taking back an unlock.
- A place in Bisou to create, list or cancel codes (R55).
- Subscription; bundles until there are 3 or more paid boxes.
- Two phones showing the same card in sync; seen history shared between phones.
- Saving answers, choices, reactions, ratings, results or any score.
- Any link to the garden (no "save to garden", no growth or freshness) and any notification.
- Depth-ordered sessions, writing one's own cards, more boxes and cards beyond the launch set (they come later under these rules).
- Owned boxes when a couple splits, export and account deletion (R64).

## Appendix: Launch cards

Original Bisou writing. Cards are listed in box order; in a paid box the cards marked preview in the Preview column are the ones a couple without the box plays.

### Làm quen lại / Getting to know you again (free)

Description: "Những câu nhẹ nhàng để thấy lại người bên cạnh." / "Light cards to see each other anew."

| Id | Kind | Vietnamese | English |
|---|---|---|---|
| lql-01 | question | Món ăn nào mỗi lần ăn là thấy nhớ nhà? Kể cho nhau nghe. | Which food tastes like home to you? Tell each other about it. |
| lql-02 | rather | Một ngày nghỉ ở nhà không làm gì cả / Một ngày đi tới chỗ hai đứa chưa từng tới | A day off at home doing nothing / A day out somewhere neither of you has been |
| lql-03 | point | Ai hay hát một mình trong nhà tắm hơn? | Who sings alone in the shower more? |
| lql-04 | question | Năm mười lăm tuổi, mỗi người mơ lớn lên sẽ làm gì? | At fifteen, what did each of you dream of becoming? |
| lql-05 | dare | Nhìn vào mắt nhau đủ 30 giây, không ai nói gì. | Look into each other's eyes for 30 seconds, without a word. |
| lql-06 | scale | Mỗi người thích mùa mưa đến mức nào? 1: Chỉ mong trời nắng. 10: Mưa là vui. | How much do you each like the rainy season? 1: Bring back the sun. 10: Rain makes my day. |
| lql-07 | question | Có bài hát nào nghe lại là thấy mình của ngày xưa không? | Is there a song that takes you straight back to who you used to be? |
| lql-08 | rather | Một bữa sáng thật ngon / Thêm một tiếng ngủ | A really good breakfast / One more hour of sleep |
| lql-09 | dare | Mỗi người lấy một món đồ trong nhà có câu chuyện riêng, rồi kể về nó trong một phút. | Each pick up one thing at home that has a story, and tell it in one minute. |
| lql-10 | question | Hồi mới quen, có khoảnh khắc nhỏ nào mà đến giờ mỗi người vẫn nhớ? | From when you first met, what small moment does each of you still remember? |

### Deep Connection (paid)

Description: "Những câu chậm hơn, để hiểu nhau sâu hơn." / "Slower cards, to understand each other more deeply."

| Id | Preview | Kind | Vietnamese | English |
|---|---|---|---|---|
| dc-01 | | question | Gần đây có lúc nào mỗi người thấy người kia thật sự hiểu mình? Kể lại lúc đó. | When did each of you last feel truly understood by the other? Tell that moment. |
| dc-02 | preview | scale | Dạo này mỗi người thấy mình mệt đến mức nào? 1: Còn nhiều sức lắm. 10: Cạn pin rồi. | How tired has each of you been lately? 1: Plenty left in me. 10: Running on empty. |
| dc-03 | | rather | Lúc buồn, được ôm thật lâu / Lúc buồn, được ngồi nghe mình kể hết | When you're down, a long hug / When you're down, someone who listens to all of it |
| dc-04 | | question | Điều gì từ gia đình mình mà mỗi người muốn giữ cho hai đứa, và điều gì muốn để lại phía sau? | What from your own family would each of you keep for the two of you, and what would you leave behind? |
| dc-05 | preview | point | Ai hay giấu chuyện buồn để người kia khỏi lo hơn? | Who hides a worry more, so the other won't fret? |
| dc-06 | | question | Một năm nữa, mỗi người mong hai đứa đã cùng làm được điều gì? | A year from now, what would each of you like the two of you to have done together? |
| dc-07 | preview | dare | Nắm tay nhau, mỗi người nói một câu bắt đầu bằng "Cảm ơn vì..." mà trước giờ chưa nói. | Hold hands and each say one sentence starting with "Thank you for..." that you have never said before. |
| dc-08 | | scale | Sau khi giận nhau, mỗi người cần bao lâu mới muốn nói chuyện lại? 1: Nói được ngay. 10: Cần thật nhiều thời gian. | After an argument, how long does each of you need before you want to talk again? 1: Right away. 10: A good while. |
| dc-09 | | question | Người kia làm điều gì khiến mỗi người thấy được yêu nhất, dù là chuyện rất nhỏ? | What does the other do that makes you feel most loved, even something very small? |
| dc-10 | | question | Có ước mơ nào mỗi người đã cất đi mà vẫn muốn một ngày được thử? | Is there a dream each of you put away but would still like to try one day? |
