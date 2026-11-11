# Wish jar

## Purpose

Partners have small wishes they are shy to say out loud, and each wants to surprise the other without asking. Each keeps a private jar; the other can only spin it within a budget, secretly claim the result, and later see it become a [journal](journal.md) memory. It builds on [pairing](pairing.md).

## Actors

- **Owner**: the partner whose jar it is.
- **Spinner**: the other partner; after a claim, the **claimer**.
- **Outsider**: anyone else, unpaired people included.

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
- R10. When the owner's jar holds no open wish (received or deleted ones do not count, claimed ones do), the spinner is told so before spinning, for example "Bình chưa bỏ điều ước nào vào hũ" or "Binh hasn't put any wishes in the jar yet", and no spin is offered. When the jar has wishes but none fits the budget, the spinner is told only that nothing fits. Neither shows a count, a price or a claim.
- R11. A partner may spin at most 20 times in any rolling 24 hours; further spins wait until the oldest is 24 hours old.
- R12. The spinner sees only the wish landed on: title, photo, price and link, never its priority or any other wish.

Claim

- R13. The spinner may claim the wish landed on ("I'll make it"); a wish has at most one claim.
- R14. A claim lasts until the claimer releases it or the owner marks the wish received; it never expires.
- R15. The claimer sees their claims as the owner last changed them and may release any; a released wish can come up again.
- R16. The owner may change or delete a claimed wish with no warning; after a delete, the claimer sees it once as no longer in the jar.
- R17. Nothing the owner sees, order, counts or timing included, shows a spin or claim.

Received

- R18. Only the owner marks a wish received, after confirming, with a received day (default today, journal day rules), up to 4 photos and an optional note.
- R19. A received wish moves to the owner's private received list, for good, and the owner sees a short celebration.
- R20. It makes one journal entry: author the owner, day the received day, text "Received: " plus the title and note (2000 characters at most), and the photos. The entry's words are in the owner's app language, Vietnamese or English, for example "Đã nhận: Khăn linen" or "Received: Linen scarf".
- R21. That entry is marked as made from a wish and otherwise is an ordinary entry; deleting it leaves the wish received.
- R22. If the wish was claimed, the claimer sees that claim as received.

Personal data

- R23. Wishes and photos are the owner's personal data, kept only for the jar while the couple exists or until the owner deletes them for good.
- R24. Claims and spins belong to the spinner; spins are kept only to count the limit.

Wishes tab

- R25. The Wishes tab shows both jars above its sections: mine on the left, my partner's on the right, each titled "Hũ của {tên}" ("{name}'s jar") with that person's photo or initial.
- R26. My jar looks fuller the more open wishes it holds (open as in R10): empty at none, then a few steps up to full at about ten.
- R27. My partner's jar shows only empty or filled, the same one bit as R10, never how many; when empty it reads "Chưa bỏ điều ước nào" ("No wishes yet") and cannot be opened.
- R28. Tapping my jar opens my jar; tapping my partner's filled jar opens the spin.

Wish detail

- R29. Tapping a wish card in my jar opens a detail sheet from the bottom with the full title, a large photo, the price, the priority, a button to the link, the day it was added, for a received wish also its received day and note, and the same actions as the card's "⋯" menu.
- R30. The sheet is never taller than the screen; when the content is longer, it scrolls inside the sheet.
- R31. Claims, both jars and the spin card are unchanged: the spinner still sees only what R12 allows, and no sheet shows a spin or claim (R17).

## Running example

An and Binh, together since 12 February 2023. Binh's jar on 6 November 2026: scented candle 350,000 VND, nice to have; linen scarf 450,000 VND, really want, with photo; ceramic mug set 280,000 VND, really want; pottery class for two 900,000 VND, dream, with link; weekend in Da Lat, no price, dream.

1. 10 November: An spins with 500,000 VND; it lands on the scarf. An sees its title, photo and price, and claims it.
2. 12 November: Binh changes the scarf to 480,000 VND and sees no sign of the claim; An's claim shows the new price.
3. 12 November: An spins with 1,000,000 VND; the claimed scarf cannot come up. It lands on the pottery class; An does not claim it.
4. 20 November: Binh receives the scarf, marks it received with 1 photo and the note "From An, so soft", and sees the celebration.
5. Both see under 20 November Binh's entry "Received: Linen scarf. From An, so soft" with the photo; An's claim shows as received.

## Main flows

Keep wishes (owner); spin, claim, release (partner); mark received (owner). Rule breaks are refused with a reason, saving nothing.

## Acceptance criteria

- AC1 (R1, R2). Given a couple, then An cannot see or change Binh's jar, an outsider learns nothing, and an unpaired person has no jar.
- AC2 (R3, R4, R5). Given Binh saves only a title, then it saves as really want; an empty title, 101 characters or 0 VND are refused.
- AC3 (R7-R9). Given the example jar, when An spins with 500,000 VND, then candle, scarf, mug or Da Lat may come up; scarf and mug each count twice, Da Lat three times, and candle once.
- AC4 (R10). Given Binh's only open, unclaimed wish costs 450,000 VND, when An spins with 200,000 VND, then An is told nothing fits, with no hint of any price.
- AC5 (R11). Given An spun 20 times from 08:00, when An spins at 21:00, then it is refused; from 08:00 next day it works.
- AC6 (R12). Given a spin lands on the scarf, then An sees title, photo, price and link, not the priority or another wish.
- AC7 (R13, R8). Given An claimed the scarf, then it never comes up again and a second claim is refused.
- AC8 (R14, R15, R16). Given An claimed the scarf, when Binh changes its price, then Binh gets no warning and An sees 480,000 VND; once released, it can come up again.
- AC9 (R16, R23). Given An claimed the scarf, when Binh deletes it, then it is gone for good and An sees it once as no longer in the jar.
- AC10 (R17, R24). Given An spun and claimed, then Binh's jar looks as if An never had.
- AC11 (R18, R19, R22). Given the scarf, then An cannot mark it received; Binh can, not for a future day, and it leaves the jar for good, the celebration plays and An's claim shows received.
- AC12 (R20, R21). Given Binh marks it received on 20 November, then both see Binh's entry under that day, made from a wish; only Binh can change or delete it, and deleting keeps the scarf received.
- AC13 (R6). Given Binh adds a photo to the scarf, then it is saved square and kept like journal photos, and the wish never holds more than one photo.
- AC14 (R10, R1). Given Binh has no wishes, when An opens the spin card, then it reads "Binh hasn't put any wishes in the jar yet" and no spin is offered; if Binh's only wish is one An claimed, the spin is offered and An is told nothing fits; an outsider learns neither.
- AC15 (R25, R26, R27, R28). Given Binh has no wishes and An has 7, then An's Wishes tab shows her jar on the left mostly full and Binh's jar on the right empty, reading "Chưa bỏ điều ước nào" and not opening; Binh's Wishes tab shows An's jar filled, looking the same as if she had 1 or 30, and tapping it opens the spin.
- AC16 (R29, R30). Given the example jar, when Binh taps the pottery class card, then a sheet shows the full title, 900,000 VND, dream, a link button and 6 November 2026 as added day, with the card's "⋯" actions; with a long title on a small phone, the sheet stays within the screen and its content scrolls.
- AC17 (R29). Given the scarf is received on 20 November with the note "From An, so soft", when Binh taps it in the received list, then the sheet also shows 20 November and the note.
- AC18 (R31, R12, R17). Given An spun and claimed the scarf, then An's claim, Binh's Wishes tab and An's spin card look as before, and Binh's sheet shows no sign of the claim.

## Glossary

- **Wish jar** (hũ điều ước), **wish** (điều ước), **budget** (ngân sách).
- **Spin** (quay hũ): the random pick within a budget.
- **Claim** (nhận làm): the secret "I'll make it"; **release** (bỏ nhận) gives it back.
- **Received** (đã nhận): the owner got the wish.

## Out of scope

- Wishes and claims when a partner leaves; decide with leaving (see pairing).
- Export and full deletion; they come with account deletion.
- Other currencies, a celebration for the claimer, undoing received.
- Notifications about wishes, spins, claims or the jar: never sent ([notifications](notifications.md) R9); an entry made from a received wish notifies only as a journal entry.

## Open questions

None.
