# Starred cards

## Purpose

A few flipped cards hold answers the couple wants to read again, and finding them means opening six decks. Either partner can star such a card, and starred cards stay in front of the couple with both answers. It extends [garden](garden.md); decision questions are in [garden-stages](garden-stages.md).

## Actors

- **Partner**: a member of a couple; both have the same rights.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): star a card we both answered, so that we can find and reread it with both answers without opening every deck. AC37, AC38, AC39, AC40, AC48
- US2 (partner): see our starred cards where we meet each day, newest first, so that what matters to us stays in reach. AC41, AC42, AC43
- US3 (partner): see changed or deleted answers reflected on a starred card, so that the card never shows something stale. AC44, AC45
- US4 (partner): star without it being noticed, ranked or shared, so that it stays a quiet shared mark. AC37, AC46, AC47

## Business rules

- R65. A card has at most one star, shared by the couple: when either partner stars it, both see it starred, and either partner may unstar it, whoever starred it.
- R66. The star marks the whole question card with both answers, never one answer, and carries no rating, reply or comment.
- R67. Every card both partners have answered and that is visible to both under the rules that govern its kind can be starred: an ordinary card once flipped ([garden](garden.md) R15), a decision question ([garden-stages](garden-stages.md) R41) once both partners have submitted a response and the paired reveal shows both; a card in play and any card with fewer than two answers show no star.
- R68. A partner stars or unstars a card wherever it is shown flipped: today's card, a deck's flipped cards (which show each card's star), a stage's list of answered questions, and the starred cards themselves.
- R69. A starred card shows among a partner's starred cards only once that partner has flipped it, so a star never reveals answers before the partner's own flip.
- R70. The couple's important questions show the 3 most recently starred cards, newest star first; with more than 3, the couple can open every starred card in the same order, and an empty full list says there are none yet.
- R71. The important questions are absent when no starred card shows, and a card that is still today's card shows only as today's card, joining the starred cards from the next day in its star order.
- R72. Each starred card shows its deck, its question in the reader's app language ([garden](garden.md) R4) and both answers as written, own answer first with author names; a decision answer that is a neutral or deferred choice shows that choice's label in place of text; a long answer is shortened in the short list and shown in full when the card is opened.
- R73. An answer changed after the flip shows its current text marked as edited, a deleted one shows a deletion notice in its place, a neutral or deferred choice keeps showing its label in the full list, and the card keeps its star ([garden](garden.md) R19).
- R74. While both answers of a starred card are deleted, it leaves the starred cards but keeps its star in its deck, and it returns in its star order as soon as either author writes a replacement.
- R75. Neither the star nor the starred cards show who starred a card or when; the order is the only trace of time.
- R76. Starring and unstarring send no notification, add no plant growth, and leave freshness unchanged.
- R77. Any number of cards can be starred; starring a starred card or unstarring an unstarred one changes nothing, when both partners act at once the later action counts, and a failed save changes nothing.
- R78. Which cards are starred belongs to the couple, is kept only to show starred cards while the couple exists, is not in a partner's own download ([garden](garden.md) R38), and ends with the garden when a partner leaves ([garden](garden.md) R39).

## Main flows and exceptions

- Flow for US1: a partner stars a flipped card; both see it starred. Either partner may unstar it. Exception: a card with fewer than two answers or not yet flipped cannot be starred, and a failed save changes nothing.
- Flow for US2: the couple sees the 3 newest starred cards with both answers; with more, they open the full list in the same order. Exception: a starred card the partner has not flipped yet is not shown to that partner.
- Flow for US3: an author edits or deletes an answer on a starred card; both see the edited mark or deletion notice, and the card stays starred. If both answers are deleted the card leaves the list until a replacement is written.

## Acceptance criteria

- AC37 (R65, R75, R76). Given a flipped card, when A stars it, then both see it starred and among the starred cards, nothing names A or a time, B gets no notification, and garden freshness is unchanged.
- AC38 (R65, R68). Given a card A starred, when B unstars it, then it leaves both partners' starred cards and shows no star in its deck's flipped cards.
- AC39 (R67). Given A answered a card and B had not, then it shows no star until it is flipped; given both partners responded to a decision question, then it can be starred; given only one responded, then it shows no star.
- AC40 (R69). Given B answers an extra card second and A has not flipped it yet, when B stars it, then A's starred cards do not show it until A flips it.
- AC41 (R70). Given four starred cards, then the couple sees the 3 most recently starred, newest first, and can open all four in the same order.
- AC42 (R71). Given a starred card that is today's card, then it shows once, as today's card with its star; given no starred card, then no starred section shows.
- AC43 (R72). Given A's app is in English, then A reads the question in English with A's answer first and B's answer as B wrote it.
- AC44 (R73). Given a starred card where B edited and A deleted an answer, then both see B's new text marked as edited and a deletion notice in place of A's answer.
- AC45 (R74). Given both answers of a starred card are deleted, then it leaves the starred cards but stays starred in its deck; when A writes a new answer, it returns in its star order marked as edited.
- AC46 (R77). Given A and B star the same card at the same moment, then it has one star; given A stars a card while B unstars it, then both see the later action's result.
- AC47 (R78). Given export and leaving exist, when A downloads their data, then it holds no star; when B leaves, the stars end with the garden.
- AC48 (R67, R68, R72). Given A wrote an answer to a decision question and B chose the deferred option, when A stars it from the stage's answered questions, then it shows among the starred cards on both sides with A's text and B's choice shown by its label, not text.

## Glossary

- **Star** (gắn sao) and **important question** (câu hỏi quan trọng): the couple's one shared mark on a flipped card, which keeps it in front of the couple with both answers.

## Out of scope

- Starring one answer, a personal star per partner, a note or reason on a star, sorting or grouping starred cards, sharing them outside the couple.

## Open questions

None.

Retired: none
