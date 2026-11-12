# Wish jar

## Purpose

Partners have small wishes they are shy to say out loud, and each wants to surprise the other without asking. Each keeps a private jar; the other can only spin it within a budget, secretly claim the result, and later see it become a [journal](journal.md) memory. It builds on [pairing](pairing.md).

## Actors

- **Owner**: the partner whose jar it is.
- **Spinner**: the other partner; after a claim, the **claimer**.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (owner): keep my small wishes in a jar only I can read and change, so that I can wish without saying it out loud. AC1, AC2, AC9, AC13, AC16
- US2 (spinner): spin my partner's jar within a budget, so that I find a wish I can fulfil as a surprise. AC3, AC4, AC5, AC6, AC14, AC15
- US3 (claimer): secretly claim a wish and release it if plans change, so that I can plan the surprise. AC7, AC8, AC9
- US4 (owner): keep spins and claims hidden from me, so that the surprise stays intact. AC10, AC18
- US5 (owner): mark a wish received and see it become a shared memory, so that the moment is kept. AC11, AC12, AC17

## Business rules

Jar

- R1. Every partner has one jar; a person not yet paired has none, and an outsider learns nothing about it.
- R2. Only the owner sees their jar's list and adds, changes or deletes its wishes.
- R3. A wish needs a title of 1 to 100 characters (outer spaces ignored); a photo, price, web link and priority are optional.
- R4. A price is a whole amount of Vietnamese dong (VND), above zero.
- R5. Priority is nice to have, really want (the default) or dream.
- R6. A wish has at most one photo, square and kept like journal photos.

Spin

- R7. The spinner enters a budget in VND and Bisou picks one wish at random among those without a price or priced at or below it; the same wish may come up again later.
- R8. A received wish or a claimed wish never comes up.
- R9. In the pick, a dream counts three times and a really want twice as much as a nice to have.
- R10. When the owner's jar holds no open wish (received or deleted ones do not count, claimed ones do), the spinner is told the jar has no wishes yet before spinning, and no spin is offered. When the jar has wishes but none fits the budget, the spinner is told only that nothing fits. Neither shows a count, a price or a claim.
- R11. A partner may spin at most 20 times in any rolling 24 hours; further spins wait until the oldest is 24 hours old.
- R12. The spinner sees only the wish landed on: title, photo, price and link, never its priority or any other wish.

Claim

- R13. The spinner may claim the wish landed on; a wish has at most one claim.
- R14. A claim lasts until the claimer releases it or the owner marks the wish received; it never expires.
- R15. The claimer sees their claims as the owner last changed them and may release any; a released wish can come up again.
- R16. The owner may change or delete a claimed wish with no warning; after a delete, the claimer sees it once as no longer in the jar.
- R17. Nothing the owner sees, order, counts or timing included, shows a spin or claim.

Received

- R18. Only the owner marks a wish received, after confirming, with a received day (default today, journal day rules), up to 4 photos and an optional note.
- R19. A received wish moves to the owner's private received list, for good, and the owner sees a short celebration.
- R20. It makes one journal entry: author the owner, day the received day, text naming the received wish's title and the note (2000 characters at most) in the owner's app language, and the photos.
- R21. That entry is marked as made from a wish and otherwise is an ordinary entry; deleting it leaves the wish received.
- R22. If the wish was claimed, the claimer sees that claim as received.

Personal data

- R23. Wishes and photos are the owner's personal data, kept only for the jar while the couple exists or until the owner deletes them for good.
- R24. Claims and spins belong to the spinner; spins are kept only to count the limit.

Both jars

- R25. Both partners see both jars side by side, mine and my partner's, each titled with that person's name and photo or initial.
- R26. My jar looks fuller the more open wishes it holds (open as in R10): empty at none, then a few steps up to full at about ten.
- R27. My partner's jar shows only empty or filled, the same one bit as R10, never how many; when empty it says there are no wishes yet and cannot be opened.
- R28. Opening my jar shows my wishes; opening my partner's filled jar starts the spin.

Wish details

- R29. A partner can open a wish in their own jar to see its full title, a large photo, the price, the priority, its link, the day it was added and, for a received wish, its received day and note, with the same actions as the wish's own menu.
- R31. Opening a wish's details leaves claims, both jars and the spin unchanged: the spinner still sees only what R12 allows, and no view shows a spin or claim (R17).

## Main flows and exceptions

- Flow for US1: the owner adds a wish with a title and optional extras and later changes or deletes it. Exception: an empty or over-long title, or a price of zero, is refused and nothing is saved.
- Flow for US2: the spinner enters a budget and a wish comes up with its title, photo, price and link. Exceptions: an empty jar or a budget nothing fits is explained without hints; the 21st spin within 24 hours is refused.
- Flow for US3: the spinner claims the wish landed on and may release it later; the claimer sees changes the owner made.
- Flow for US5: the owner confirms a received wish with a day, photos and a note; it leaves the jar, a journal entry appears for both, and a claimer sees the claim as received.

## Acceptance criteria

- AC1 (R1, R2). Given a couple, then A cannot see or change B's jar, an outsider learns nothing, and an unpaired person has no jar.
- AC2 (R3, R4, R5). Given B saves only a title, then it saves as really want; an empty title, 101 characters or a price of 0 VND are refused.
- AC3 (R7, R8, R9). Given a jar with a nice to have, two really want and one dream wish without price that all fit the budget, when A spins, then any may come up; each really want counts twice, the dream three times and the nice to have once.
- AC4 (R10). Given B's only open, unclaimed wish costs 450,000 VND, when A spins with 200,000 VND, then A is told nothing fits, with no hint of any price.
- AC5 (R11). Given A spun 20 times from 08:00, when A spins at 21:00, then it is refused; from 08:00 next day it works.
- AC6 (R12). Given a spin lands on a wish, then A sees title, photo, price and link, not the priority or another wish.
- AC7 (R13, R8). Given A claimed a wish, then it never comes up again and a second claim is refused.
- AC8 (R14, R15, R16). Given A claimed a wish, when B changes its price, then B gets no warning and A sees the new price; once released, it can come up again.
- AC9 (R16, R23). Given A claimed a wish, when B deletes it, then it is gone for good and A sees it once as no longer in the jar.
- AC10 (R17, R24). Given A spun and claimed, then B's jar looks as if A never had.
- AC11 (R18, R19, R22). Given a claimed wish, then A cannot mark it received; B can, not for a future day, and it leaves the jar for good, the celebration plays and A's claim shows received.
- AC12 (R20, R21). Given B marks a wish received on a day, then both see B's entry under that day, made from a wish; only B can change or delete it, and deleting keeps the wish received.
- AC13 (R6). Given B adds a photo to a wish, then it is saved square and kept like journal photos, and the wish never holds more than one photo.
- AC14 (R10, R1). Given B has no wishes, when A opens the spin, then A is told B has no wishes yet and no spin is offered; if B's only wish is one A claimed, the spin is offered and A is told nothing fits; an outsider learns neither.
- AC15 (R25, R26, R27, R28). Given B has no wishes and A has 7, then A sees their own jar mostly full and B's jar empty and not openable; B sees A's jar filled, looking the same as if A had 1 or 30, and opening it starts the spin.
- AC16 (R29). Given a wish with a title, price, dream priority and link, when B opens it, then B sees the full title, the price, the priority, the link and the day it was added, with the wish's own actions.
- AC17 (R29). Given a wish received with a note, when B opens it among received wishes, then the details also show the received day and the note.
- AC18 (R31, R12, R17). Given A spun and claimed a wish, then A's claim and A's spin look as before, B's jars look as before, and B's wish details show no sign of the claim.

## Glossary

- **Wish jar** (hũ điều ước), **wish** (điều ước), **budget** (ngân sách).
- **Spin** (quay hũ): the random pick within a budget.
- **Claim** (nhận làm): the secret "I'll make it"; **release** (bỏ nhận) gives it back.
- **Received** (đã nhận): the owner got the wish.

## Out of scope

- Wishes and claims when a partner leaves; decide with leaving (see [pairing](pairing.md)).
- Export and full deletion; they come with account deletion.
- Other currencies, a celebration for the claimer, undoing received.
- Notifications about wishes, spins, claims or the jar: never sent ([notifications](notifications.md) R9); an entry made from a received wish notifies only as a journal entry.

## Open questions

None.

Retired: R30
