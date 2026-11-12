# Profile photo

## Purpose

Partners want to see a face, not a letter, wherever Bisou shows who is who. Each person sets, replaces or removes their own photo. It builds on [pairing](pairing.md) and follows the [journal](journal.md) photo rules.

## Actors

- **Person**: a signed in person, paired or not, owner of their photo.
- **Partner**: the other member of the couple.
- **Outsider**: anyone else.

## User stories

- US1 (person): set, replace or remove my own photo, so that my partner sees me and not a letter. AC2, AC3, AC4, AC5, AC6, AC7, AC11
- US2 (partner): see my partner's photo wherever Bisou shows who is who, so that I recognise us at a glance. AC8, AC10
- US3 (person): keep my photo private to me and my partner and only as long as I want it, so that I stay in control. AC1, AC9, AC12

## Business rules

- R1. Only the person can set, replace or remove their own photo.
- R2. The photo is set from the person's own account settings.
- R3. The person picks a photo from the device, frames it in a circle, and saves; the square around the circle is kept.
- R4. Only JPEG, PNG or HEIC photos are accepted.
- R5. A photo over 20 MB is refused before framing.
- R6. Only the framed square is kept, one copy of 512 pixels a side, without location or camera details.
- R7. Replacing the photo deletes the old one for good.
- R8. Removing the photo deletes it for good.
- R9. Without a photo, the first letter of the display name shows.
- R10. The photo shows wherever a person's picture shows: the overview for both partners, the days counter, own settings, and journal entries as the author.
- R11. Before pairing only the person sees the photo; once paired, the partner too; an outsider never.
- R12. The photo is stored as privately as journal photos.
- R13. The partner sees a change the next time their app opens or comes back to the front.
- R14. A refused or failed save, such as a lost connection, leaves the current photo or letter in place, with a clear message.
- R15. Bisou keeps the photo only to show it to the person and partner, until it is replaced or removed, or the account ends.

## Main flows and exceptions

- Flow for US1: the person picks a photo, frames it in a circle and saves; it shows at once for them. Replacing deletes the old one; removing brings back the letter. Exceptions where nothing changes: a file that is not JPEG, PNG or HEIC, a photo over 20 MB, or a failed save is refused with a clear message and the current photo stays.
- Flow for US2: the partner's app shows the new photo the next time it opens or returns to the front.

## Acceptance criteria

- AC1 (R1). Given a couple, when B tries to change A's photo, then it is refused.
- AC2 (R2, R3). Given A has no photo, when A picks one from account settings, frames it and saves, then the photo shows.
- AC3 (R4, R14). Given A picks a PDF, then it is refused with a clear message.
- AC4 (R5). Given a 25 MB photo, then it is refused before framing; 19 MB can be framed.
- AC5 (R6). Given a wide photo with a location, when A saves a framed part, then only that 512 pixel square is kept, without location or camera details.
- AC6 (R7). Given A replaces the photo, then nobody can see the old one again.
- AC7 (R8, R9). Given B has a photo, when B removes it, then it is deleted and B's initial letter shows.
- AC8 (R10). Given A has a photo, then both see it in the overview, the days counter and A's journal entries, and A sees it in account settings.
- AC9 (R11, R12). Given an unpaired person sets a photo, then only that person sees it; an outsider never sees A's or B's.
- AC10 (R13). Given B's app shows A's letter, when A sets a photo and B brings the app back to the front, then A's photo shows.
- AC11 (R14). Given A has a photo, when the connection drops while saving another, then the current photo stays for both.
- AC12 (R15). Given A removes the photo, then Bisou no longer keeps it.

## Glossary

- **Profile photo** (ảnh đại diện): a person's own picture.
- **Remove photo** (gỡ ảnh): delete it and go back to the letter.
- **Letter**: first letter of the display name.

## Out of scope

- Setting the partner's photo, a couple photo, photo history, filters, taking a photo inside Bisou.
- Updating the partner's device while the app stays in front.

## Open questions

None.

Retired: none
