# Questions and the garden

## Purpose

Partners want to keep learning who the other is (their past, hopes, worries, how they feel about money, family and disagreements) without it feeling like a test. Bisou gives them one question card a day that both answer on their own and read together, and a shared garden that shows, gently, which topics they have talked about and which they have left alone. It builds on [pairing](pairing.md) and [notifications](notifications.md); relationship stages are in [garden-stages](garden-stages.md) and starred cards in [garden-stars](garden-stars.md).

## Actors

- **Partner**: a member of a couple; both have the same rights in the garden.
- **Author**: the partner who wrote a given answer.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): get one shared question card a day that we each answer privately and read together once both have answered, so that we learn about each other without a test. AC3, AC4, AC7, AC8, AC9, AC10, AC12, AC19, AC21
- US2 (partner): swap today's card while neither of us has answered it, so that we are not stuck with a card that does not fit. AC5, AC6
- US3 (partner): open a topic and play more cards from it, so that we can keep talking when we want to. AC11, AC12, AC18
- US4 (author): change or delete my own answer, so that I stay in control of what I wrote. AC6, AC16, AC17
- US5 (partner): see the topics grow and the garden stay fresh without scores or blame, so that talking feels inviting. AC2, AC11, AC14, AC15, AC19
- US6 (partner): be told when my partner has answered today's card, without seeing any content, so that I know it is my turn. AC20, AC49
- US7 (partner): keep our garden and answers private to the two of us and removed when the couple ends, so that I can write honestly. AC1, AC22, AC23

## Business rules

Garden and decks

- R1. Each couple has one garden; only the two partners see it, an outsider learns nothing about it, and a person not yet paired has none.
- R2. The garden has six plants, one per deck, each labelled with its deck's name: Memories, Dreams, Money, When we disagree, Both families, Everyday us.
- R3. Each deck holds question cards; ordinary cards run from light to deep, and an ordinary card is played once flipped and is never offered again; each card also belongs to a stage and is ordinary or decision ([garden-stages](garden-stages.md) R41).
- R4. Cards and garden texts show in the reader's app language, Vietnamese or English; answers show as written.
- R5. The garden's day follows the Vietnam calendar for both partners, whatever their time zone, so both always share one today's card (as [notifications](notifications.md) R10).

Today's card

- R6. Each day the couple shares one today's card.
- R7. At the start of a day, both partners get a new today's card; a card with one answer waiting stays on its deck to be answered later; an untouched card goes back to its place in its deck.
- R8. A new card is an ordinary card from an opened stage, drawn from a deck chosen at random and weighted so a small plant is drawn at most 3 times as often as a fully grown one; the draw skips any card that already holds a waiting answer unless the deck has no other card; it is that deck's card in play if it has one, otherwise its first unplayed card.
- R9. The deck of the previous today's card is never chosen, unless it is the only deck with cards left; a deck with no card left is never chosen.
- R10. Either partner may swap today's card while neither has answered it; the new card is drawn as R8 and R9, never from the swapped card's own deck unless no other deck has a card, skipping cards with a waiting answer as R8; the swapped card goes to the back of its deck and both partners see the new card.
- R10a. Once one partner has answered today's card, swap is locked for both; the partner answered state remains visible under R13.
- R11. When no deck has an opened ordinary card left, there is no today's card, the couple is told new cards are on their way, and freshness does not fade meanwhile.

Answering and flipping

- R12. Each partner answers on their own with text of 1 to 1000 characters, outer spaces ignored, line breaks accepted, no photos; a decision question also accepts a neutral or deferred choice ([garden-stages](garden-stages.md) R43).
- R13. Until both have answered, neither sees the other's answer content, choice or edit marks; the couple only sees whether the partner has answered, and the unanswered partner is told by name that it is their turn to write.
- R14. A partner who has answered sees their own card face down and is asked to wait for the other; real display names are used before and after the flip, falling back to generic names only when missing, without times or durations.
- R15. Once both have answered, each partner flips the card once per device; the flip and the daily watering play once, then both answers stay face up, own answer first with author names and no answer-order indicator.
- R16. Answers get no reply, reaction, rating or comment; the couple talks about them in person, and a star marks a whole flipped card, never one answer ([garden-stars](garden-stars.md) R66).
- R17. No card asks a partner to guess the other's answer.
- R18. Before the flip, the author may change or delete their answer at any time; a deleted answer puts the card back to unanswered for them, and with no answer left it may be swapped again.
- R19. After the flip, the author may change their answer, marked as edited to both, or confirm deletion, leaving a deletion notice; they may write a replacement on that same card, marked edited, while the partner's answer and the face-up state stay visible without new growth, freshness or notifications.

Extra play

- R20. A partner may open any plant to see its name, a one-line purpose, its card in play and its flipped cards newest first, each with both answers and the day it was flipped; flipped cards include daily cards answered later, even if the other partner had not answered on the original day.
- R21. A deck has at most one ordinary card in play: today's card if it comes from that deck, otherwise its first unplayed card; when the daily draw skips a deck's first unplayed card because it holds a waiting answer, that card becomes the deck's card in play again once today's card from that deck is played; an extra card cannot be swapped and follows R12 to R19.
- R22. Flipping an extra card sends no notification and does not change freshness.

Growth and freshness

- R23. Every plant starts as a sprout and has 8 sizes, the 8th being a full tree.
- R24. A plant grows one size on each day on which at least one of its ordinary cards is flipped (the day the second answer is saved), never more than one size a day, until it is a full tree.
- R25. A plant never shrinks, whatever is deleted and however long the garden waits.
- R26. Freshness belongs to the whole garden: it is fresh until 2 days after the last day on which that day's card was flipped (or the garden began), its leaves turn yellow from the 3rd day and droop from the 14th day; nothing ever dies.
- R27. Completing today's card makes the whole garden fresh at once; its first flip on a device shows a watering scene once, and later visits never replay it.
- R28. A yellow garden says it is a little thirsty and that one card today perks it up; a drooping garden says it has been a while, that no plant is lost and that they are waiting for the couple; neither names anyone.

No score, no blame

- R29. Both partners see the same garden: sizes, freshness and messages are shared.
- R30. The garden shows no streak, score, percentage or numeric plant level; dates, named stages, shared completion and a gentle count of conversations left to discuss are allowed ([garden-stages](garden-stages.md) R61).
- R31. The garden uses no blame, lateness or neglect indicators; names, answered flags (R13, R14), shared completion and mutual stage choices are shown without response timestamps.

Notifications

- R32. When a partner answers today's card, each device of the other partner with the partner journal kind on gets a notification that the partner answered today's card; it never names the question, a deck or an answer (controlled by [notifications](notifications.md) R3). The author's own devices never get it.
- R33. Changing or deleting an answer, swapping, extra play, answering a card of an earlier day, decision answers, starring and freshness send nothing; Bisou never sends a reminder to answer.

Personal data

- R36. Each answer or response choice is its author's personal data, kept with its card and day only to show it to the two partners as these rules allow, while the couple exists or until the author deletes it; it never appears in a notification.
- R37. Which cards were drawn, swapped and flipped, whether each partner has answered the card in play, the plants' sizes and freshness, and the couple's stage records belong to the couple and are kept only to run the garden.
- R38. Each partner can see their own answers at any time and the other's after the flip (R15, R20), change and delete their own (R18, R19), and, when export exists, download their own answers with their questions and days, never the partner's answers.
- R39. When a partner leaves the couple or deletes their account (not possible yet), the couple's garden ends for both: all its answers, cards in play and plants are deleted for good, after each partner has been able to download their own answers.

## Main flows and exceptions

- Flow for US1: a partner writes an answer and sees the card face down; the other partner is told it is their turn; once both have answered each flips the card and reads both answers. Exception: an answer outside 1 to 1000 characters is refused and nothing is saved.
- Flow for US2: before any answer, either partner swaps; both see the new card. Exception: once one partner has answered, the swap is refused; if no other card exists, the swap is refused.
- Flow for US3: a partner opens a plant, answers its card in play and, when both have answered, flips it; nothing is sent.
- Flow for US4: the author edits or deletes an answer; before the flip the other partner sees nothing change, after the flip both see the edited mark or the deletion notice.
- Flow for US5: no card is flipped for 3 days and the garden turns yellow, after 14 it droops; one flipped daily card makes it fresh again with every plant at its earlier size.
- Flow for US6: a partner's first answer to today's card sends one private notification to the other partner, at any hour.

## Acceptance criteria

- AC1 (R1). Given two partners are a couple, then an outsider learns nothing of their garden and a person not yet paired has none.
- AC2 (R2, R23, R26, R30). Given a garden has just opened, then both see six labelled sprouts, fresh, with no figure anywhere.
- AC3 (R5, R6). Given partner A is in another time zone where it is already the next day while it is still the same day in Vietnam, then A still sees the same today's card as partner B.
- AC4 (R8, R9). Given a card was flipped on one day, then the next day's card never comes from its deck; smaller plants are much more likely to be drawn than larger ones.
- AC5 (R10). Given nobody answered today's card, when a partner swaps it, then both see a new card that is not the swapped one, not from its deck and not from the previous day's deck, and the swapped card comes back only after the other cards of its deck.
- AC6 (R10, R10a, R18). Given one partner answered today's card, then neither can swap it; when that partner deletes the answer, the swap is offered again.
- AC7 (R12). Given a partner saves an empty answer or one of 1001 characters, then it is refused; 1000 characters save.
- AC8 (R13, R14, R31). Given A answered and B has not, when B looks at the card, then B sees A's name and that A has answered but no answer text, choice or edit mark; A sees a face-down card and is asked to wait for B.
- AC9 (R15, R27). Given both answered, when a partner first flips on a device, then both named answers appear and the daily watering plays once; after a reload or visiting the garden or a deck, the card stays face up with no flip prompt or replay.
- AC10 (R16, R17). Given a flipped card, then neither partner can reply, react, rate or comment on an answer, and no card asks to guess the other's answer.
- AC11 (R22, R24). Given a plant already grew today, when the couple flips an extra card of any plant, then nothing is sent and freshness is unchanged; when a card of that plant is flipped on a later day, the plant grows one size.
- AC12 (R7). Given A answered a card and B did not, when the next day starts, then a new daily card is drawn and the first card stays in its deck; when B later answers it from the deck, it flips.
- AC14 (R26, R28, R29, R31). Given no daily card is flipped, then both see the garden fresh for 2 days, yellow with its message from the 3rd day and drooping with its message from the 14th, never naming anyone.
- AC15 (R25, R27). Given the garden is drooping, when the couple flips today's card, then the whole garden is fresh at once and shown watered, with every plant at least its earlier size.
- AC16 (R18, R13). Given A answered and B has not, when A changes the answer, then B sees neither version until the flip.
- AC17 (R19, R25). Given a flipped card, when an author edits, then both see the edited mark; after confirmed deletion the deletion notice appears and growth is unchanged; writing again replaces the notice with an edited answer while the partner's answer stays visible and the flip is not replayed.
- AC18 (R20, R21). Given a plant with flipped cards, when a partner opens it, then they see its name, purpose, the one card in play and its flipped cards newest first with the day flipped; a plant never has two cards in play.
- AC19 (R11). Given every opened ordinary card is played, then there is no today's card, the couple is told new cards are on their way, and the garden stays fresh.
- AC20 (R32, R33). Given B turned the partner journal kind off on a device, then that device gets no garden notification; edits, swaps, extra flips and answers to earlier days' cards notify nobody.
- AC21 (R4). Given A's app is in English, then A reads cards in English and B's answer as B wrote it.
- AC22 (R36, R38). Given export exists, when A downloads their data, then it holds A's answers with questions and days and none of B's answers.
- AC23 (R39). Given leaving exists and B leaves, then both could first download their own answers, and afterwards the garden and all its answers are gone for both.
- AC49 (R32, R33). Given A answered a card on its day and B answers that card the next day, then B's flip is shown and the plant grows, A gets nothing, and the first answer to a new today's card still notifies the other partner at any hour.

## Glossary

- **Garden** (vườn): the couple's six plants.
- **Plant** (cây): one deck shown as a plant; **leaf** (lá) is only ever part of a plant.
- **Deck** (bộ thẻ) and **card** (thẻ): a topic and one question in it. The six decks are Ký ức (Memories), Ước mơ (Dreams), Tiền bạc (Money), Khi bất đồng (When we disagree), Gia đình hai bên (Both families), Mỗi ngày của mình (Everyday us).
- **Today's card** (thẻ hôm nay): the day's shared card.
- **Card in play** (thẻ đang chơi): a deck's card being answered, not yet flipped.
- **Flip** (lật thẻ): both answers shown once both answered.
- **Swap** (đổi thẻ khác) and **extra play** (chơi thêm).
- **Size** (cỡ cây), from **sprout** (mầm) to **full tree** (cây lớn).
- **Fresh** (tươi), **yellow** (ngả vàng), **drooping** (rũ lá).

## Out of scope

- Life stage cards beyond the stage catalogue, a shared closing line, returning cards, a monthly self rating, a weekly good news card.
- Writing or picking one's own questions, more decks, adding cards beyond the current catalogue.
- Reminders to answer, notifications for extra play, showing the garden to anyone else.

## Open questions

None.

Retired: R34, R35, AC13
