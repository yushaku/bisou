# Questions and the garden

## Decided at Gate 1

- PO: v1 is the daily card and the garden; each deck is one plant; each partner answers privately, the card flips when both have answered, either partner can swap today's card, tapping a plant opens its deck for extra play, and both get a notification when both have answered today's card (R6, R10, R12 to R15, R20, R33).
- PO: freshness belongs to the whole garden and follows today's card (yellow after about 3 days, drooping after about 2 weeks, nothing dies); each plant's size shows how much its deck was played (R23, R26).
- PO: today's card is a weighted rotation favouring smaller plants, never the same deck two days running; a swap may land in another deck; extra play stays open but a plant grows at most one size a day and never shrinks (R8 to R10, R24, R25).
- PO: about 60 cards (6 decks of 10, Vietnamese and English) drafted by the PM from the sources below and reviewed by the PO before build (R2, R3).
- PO: no reply or reaction to answers, no guessing quiz, no numbers, streaks, scores or percentages, never who is late or who neglected the garden; the first to answer sees the card face down with "waiting for your partner"; "thẻ" means card, "lá" only a plant's leaf (R14, R16, R17, R30, R31).
- PO: not in v1: life stage cards, a shared closing line, returning cards, a monthly self rating, a weekly good news card.
- PO: with one answer waiting, both get a new daily card next day; the old card stays in its deck; no answer is lost (R7).
- PO: a partner may swap today's card only while neither has answered it; once one has answered, swap is locked for both (R10, R11); the lock shows gently without naming who answered.
- PO: a partner may edit their own answer before the flip and after the flip; an edited answer after the flip shows "đã sửa" / "edited" to both (R18, R19).
- PO: garden notifications use the partner journal switch; no third kind, no push_subscriptions rebuild (R32 to R34).
- PO: the Vietnam calendar day (R5); deck weights (R8); answers of 1 to 1000 characters, text only (R12); 8 plant sizes (R23); extra flips send nothing and leave freshness alone (R22); leaving ends the garden for both (R39); the 60 cards at .team/garden/cards.md are approved.

## Purpose

Partners want to keep learning who the other is (their past, hopes, worries, how they feel about money, family and disagreements) without it feeling like a test. Bisou gives them one question card a day that both answer on their own and read together, and a shared garden that shows, gently, which topics they have talked about and which they have left alone. It builds on [pairing](pairing.md) and [notifications](notifications.md).

Grounding (inspiration, not content): layered self-disclosure from light to deep (Aron 1997), intimacy grows from feeling understood, so cards ask about feelings and not only events (Reis and Shaver 1988, Laurenceau 1998), knowing the partner's inner world (Gottman Love Maps), money disagreements (Dew 2012), recurring disagreements are talked about, not solved (Gottman).

## Actors

- **Partner**: a member of a couple; both have the same rights in the garden.
- **Author**: the partner who wrote a given answer.
- **Outsider**: anyone else, unpaired people included.

## Business rules

Garden and decks

- R1. Each couple has one garden; only the two partners see it, an outsider learns nothing about it, and a person not yet paired has none.
- R2. The garden has six plants, one per deck, each labelled with its deck's name: Ký ức (Memories), Ước mơ (Dreams), Tiền bạc (Money), Khi bất đồng (When we disagree), Gia đình hai bên (Both families), Mỗi ngày của mình (Everyday us).
- R3. Each deck holds question cards ordered from light to deep; a card is played once flipped and is never offered again.
- R4. Cards and garden texts show in the reader's app language, Vietnamese or English; answers show as written.
- R5. The garden's day follows the Vietnam calendar for both partners, whatever the device's time zone, so both always share one today's card (as [notifications](notifications.md) R10).

Today's card

- R6. Each day the couple has one today's card, the same for both.
- R7. At the start of a day, both partners get a new today's card; a card with one answer waiting stays on its deck to be answered later; an untouched card goes back to its place in its deck.
- R8. A new card comes from a deck chosen at random, weighted so a small plant is drawn at most 3 times as often as a fully grown one; the draw skips any card that already holds a waiting answer unless the deck has no other card; it is that deck's card in play if it has one, otherwise its first unplayed card.
- R9. The deck of the previous today's card is never chosen, unless it is the only deck with cards left; a deck with no card left is never chosen.
- R10. Either partner may swap today's card ("Đổi thẻ khác" / "Another card") while neither has answered it; the new card is drawn as R8 and R9, skipping cards with a waiting answer as R8, never the swapped one, which goes to the back of its deck; both see the new card.
- R10a. Once one partner has answered today's card, swap is locked for both; neither sees a "swap" button. The lock shows gently without naming who answered, as the accepted exception to R13 that lets each partner know the other has answered.
- R11. When no deck has a card left, there is no today's card, the garden reads "Thẻ mới đang trên đường tới" ("New cards are on their way"), and freshness does not fade meanwhile.

Answering and flipping

- R12. Each partner answers on their own ("Viết câu trả lời" / "Write your answer") with text of 1 to 1000 characters, outer spaces ignored, line breaks accepted; no photos.
- R13. Until both have answered, neither sees the other's answer; the partner who has not answered sees no sign of whether the other has, except once either has answered swap is locked for both (the lock shows gently without naming who answered, an accepted trade-off to know the other answered).
- R14. A partner who has answered sees their own card face down and the partner's place reading "Đang chờ người ấy" ("Waiting for your partner"), with no name, time or duration.
- R15. Once both have answered, the card is flipped; each partner taps "Lật thẻ" ("Flip") and sees both answers side by side, their own first, each with its author's name, with no time and no sign of who answered first.
- R16. Answers get no reply, reaction, rating or comment; the couple talks about them in person.
- R17. No card asks a partner to guess the other's answer.
- R18. Before the flip, the author may change or delete their answer at any time; a deleted answer puts the card back to unanswered for them, and with no answer left it may be swapped again.
- R19. After the flip, the author may change their answer, which then shows "đã sửa" ("edited") to both, or delete it after confirming, leaving "Câu trả lời này đã được xoá" ("This answer was deleted") in its place.

Extra play

- R20. Tapping a plant ("Chạm một cây để chơi thêm" / "Tap a plant to play more") opens its deck: its name, a one-line purpose, its card in play, and its flipped cards, newest first, each opening both answers and the day it was flipped. The flipped cards include daily cards answered at any time, even if unanswered by the other partner on their original day.
- R21. A deck has at most one card in play: today's card if it comes from that deck, otherwise its first unplayed card; when the daily draw skips a deck's first unplayed card because it holds a waiting answer, that card becomes the deck's active card again once today's card from that deck is played; an extra card cannot be swapped and follows R12 to R19.
- R22. Flipping an extra card sends no notification and does not change freshness.

Growth and freshness

- R23. Every plant starts as a sprout and has 8 sizes, the 8th being a full tree.
- R24. A plant grows one size on each day on which at least one of its cards is flipped (the day the second answer is saved), never more than one size a day, until it is a full tree.
- R25. A plant never shrinks, whatever is deleted and however long the garden waits.
- R26. Freshness belongs to the whole garden: it is fresh until 2 days after the last day a today's card was flipped (or the garden began), its leaves turn yellow from the 3rd day and droop from the 14th day; nothing ever dies.
- R27. Flipping a today's card makes the whole garden fresh at once and shows it being watered: "Cây Tiền bạc vừa được tưới. Hẹn mai một thẻ mới." ("The Money plant just got watered. A new card tomorrow.")
- R28. A yellow garden reads "Mấy hôm nay vườn hơi khát, lá đang ngả vàng. Một thẻ hôm nay là cây tươi lại." ("The garden is a little thirsty, its leaves are turning yellow. One card today and it perks up."); a drooping garden reads "Lâu rồi hai đứa chưa ghé. Không cây nào mất đi đâu, cây vẫn đợi." ("It's been a while. No plant is lost, they are waiting for you both.").

No score, no blame

- R29. Both partners see the same garden: sizes, freshness and messages are shared.
- R30. The garden shows no count, streak, score, percentage, level or progress figure; the only figures are the days of flipped cards.
- R31. Nothing in the garden, its order, timing or messages included, shows which partner answered, played or neglected anything, except a partner's own answered card to themselves (R14).

Notifications

- R32. When both have answered today's card, every device of both partners with the partner journal kind on gets "Cả hai đã trả lời thẻ hôm nay. Lật thẻ thôi!" ("You both answered today's card. Time to flip!"); it never names the question, a deck, an answer or who answered last, and tapping it opens the garden (controlled by [notifications](notifications.md) R3 and quiet hours R16 to R18).
- R33. Changing or deleting an answer, swapping, extra play and freshness send nothing; Bisou never sends a reminder to answer.
- R34. When a flip happens during the quiet hours window (22:00 to 07:00 Vietnam time), no notification is sent.

Personal data

- R36. Each answer is its author's personal data, kept with its card and day only to show it to the two partners as these rules allow, while the couple exists or until the author deletes it; it never appears in a notification.
- R37. Which cards were drawn, swapped and flipped, whether each partner has answered the card in play, and the plants' sizes and freshness belong to the couple and are kept only to run the garden.
- R38. Each partner can see their own answers at any time and the other's after the flip (R15, R20), change and delete their own (R18, R19), and, when export arrives, download their own answers with their questions and days, never the partner's answers.
- R39. When a partner leaves the couple or deletes their account (not possible yet, [pairing](pairing.md) R2), the couple's garden ends for both: all its answers, cards in play and plants are deleted for good, after each partner has been able to download their own answers.

## Running example

An and Bình, together since 12 February 2023. Their garden opens on 9 November 2026 with six sprouts, fresh.

1. 9 November, 08:00: today's card is money-01, "Hồi nhỏ, nhà mình nói chuyện tiền bạc với nhau như thế nào?" ("Growing up, how did your family talk about money?").
2. 12:10: An answers; An sees the card face down and "Đang chờ người ấy". At 12:30 Bình sees the card as if nobody had answered.
3. 21:40: Bình answers; both get "Cả hai đã trả lời thẻ hôm nay. Lật thẻ thôi!". Each flips and reads both answers. Tiền bạc grows to size 2.
4. 22:15: An taps Tiền bạc and answers money-02 as extra play; Bình answers at 22:50; it flips, nothing is sent, Tiền bạc stays size 2.
5. 10 November: today's card is memories-01; Bình swaps it before anyone answers and both get dreams-01. An answers it; Bình does not.
6. 11 November: the day's new card is family-01; dreams-01 with An's answer stays in Ước mơ's deck. At 23:20 Bình opens Ước mơ and answers dreams-01; it flips during quiet hours and no notification is sent. Ước mơ grew on 11 November.
7. Nobody plays from 12 November: the garden turns yellow on 14 November and droops on 25 November. On 26 November they flip today's card and the whole garden is fresh again; no plant lost a size.

## Main flows

Answer today's card, wait face down, flip and read; swap today's card; open a plant and play extra; change or delete one's own answer. Anything breaking a rule is refused with a reason, saving nothing.

## Acceptance criteria

- AC1 (R1). Given An and Bình are a couple, then an outsider learns nothing of their garden and a person not yet paired has none.
- AC2 (R2, R23, R26, R30). Given the garden opens on 9 November 2026, then both see six labelled sprouts, fresh, with no figure anywhere.
- AC3 (R5, R6). Given An is in Tokyo, when it is 00:30 on 10 November there and 22:30 on 9 November in Vietnam, then An still sees money-01, the same card as Bình.
- AC4 (R8, R9). Given money-01 was flipped on 9 November, then 10 November's card never comes from Tiền bạc; smaller plants are much more likely than larger ones.
- AC5 (R10). Given nobody answered memories-01 on 10 November, when Bình taps "Đổi thẻ khác", then both see a new card that is not memories-01 nor from Tiền bạc, and memories-01 comes back only after the other Ký ức cards.
- AC6 (R10, R10a, R18). Given An answered dreams-01, then neither can swap it; when An deletes that answer, the swap is offered again.
- AC7 (R12). Given An saves an empty answer or one of 1001 characters, then it is refused; 1000 characters save.
- AC8 (R13, R14, R31). Given step 2, then An sees "Đang chờ người ấy" with no name or time, Bình sees no sign of An's answer, and neither can read the other's.
- AC9 (R15, R32). Given step 3, then both get the notification without the question or any answer; Bình's flip shows Bình's answer then An's, named, with no time and no sign that An answered first.
- AC10 (R16, R17). Given a flipped card, then neither can reply, react, rate or comment on an answer, and no card asks to guess the other's answer.
- AC11 (R22, R24). Given step 4, then Tiền bạc stays size 2, nothing is sent and freshness is unchanged; when they flip money-03 on 10 November, Tiền bạc grows to size 3.
- AC12 (R7). Given step 5 (An answered dreams-01, Bình did not), when 11 November starts, then a new daily card is drawn, and dreams-01 stays in Ước mơ's deck. When Bình opens Ước mơ and answers dreams-01, it flips.
- AC13 (R32, R34, R24). Given step 6, when both have answered during quiet hours, no notification is sent to either; Ước mơ grew on 11 November.
- AC14 (R26, R28, R29, R31). Given step 7, then both see the garden fresh on 12 and 13 November, yellow with its message from 14 November, drooping with its message from 25 November, never naming anyone.
- AC15 (R25, R27). Given step 7 on 26 November, when they flip today's card, then the whole garden is fresh at once and shown watered, with every plant at least its earlier size.
- AC16 (R18, R13). Given An answered money-01 and Bình has not, when An changes the answer, then Bình sees neither version until the flip.
- AC17 (R19, R25). Given money-01 and money-02 are flipped, when An changes the money-01 answer, then Bình sees the new text marked "đã sửa"; when Bình deletes the money-02 answer after confirming, then An sees "Câu trả lời này đã được xoá" and Tiền bạc keeps its size.
- AC18 (R20, R21). Given steps 1 to 4, when An taps Tiền bạc, then An sees its name, purpose, money-03 to answer, and money-02 then money-01 with 9 November; Tiền bạc never has two cards in play.
- AC19 (R11). Given every card is played, then there is no today's card, the garden reads "Thẻ mới đang trên đường tới", and it stays fresh.
- AC20 (R32, R33). Given Bình turned the partner journal kind off on the phone, then the phone gets no garden notification; edits, swaps and extra flips notify nobody.
- AC21 (R4). Given An's app is in English, then An reads "Growing up, how did your family talk about money?" and Bình's answer as Bình wrote it.
- AC22 (R36, R38). Given export exists, when An downloads their data, then it holds An's answers with questions and days and none of Bình's answers.
- AC23 (R39). Given leaving exists and Bình leaves, then both could first download their own answers, and afterwards the garden and all its answers are gone for both.

## Glossary

- **Garden** (vườn, "Vườn của hai đứa"): the couple's six plants.
- **Plant** (cây): one deck shown as a plant; **leaf** (lá) is only ever part of a plant.
- **Deck** (bộ thẻ) and **card** (thẻ): a topic and one question in it.
- **Today's card** (thẻ hôm nay): the day's shared card.
- **Card in play** (thẻ đang chơi): a deck's card being answered, not yet flipped.
- **Flip** (lật thẻ): both answers shown once both answered.
- **Swap** (đổi thẻ khác) and **extra play** (chơi thêm).
- **Size** (cỡ cây), from **sprout** (mầm) to **full tree** (cây lớn).
- **Fresh** (tươi), **yellow** (ngả vàng), **drooping** (rũ lá).

## Out of scope

- Life stage cards, a shared closing line, returning cards, a monthly self rating, a weekly good news card (Gate 1).
- Writing or picking one's own questions, more decks, cards beyond the first 60 (they come later under the same rules).
- Reminders to answer, notifications for extra play.
- The garden on Home; showing the garden to anyone else.

