# Profile photo

## Purpose

Partners want to see a face, not a letter, wherever Bisou shows who is who. Each person sets, replaces or removes their own photo. It builds on [pairing](pairing.md) and follows the [journal](journal.md) photo rules.

## Actors

- **Person**: a signed in person, paired or not, owner of their photo.
- **Partner**: the other member of the couple.
- **Outsider**: anyone else.

## Business rules

- R1. Only the person can set, replace or remove their own photo.
- R2. The photo is set in Settings (Cài đặt), from the picture at the top or the "Ảnh đại diện" row under Account.
- R3. The person picks a photo from the phone, frames it in a circle, and saves; the square around the circle is kept.
- R4. Only JPEG, PNG or HEIC photos are accepted.
- R5. A photo over 20 MB is refused before framing.
- R6. Only the framed square is kept, one copy of 512 pixels a side, without location or camera details.
- R7. Replacing the photo deletes the old one for good.
- R8. "Gỡ ảnh" deletes the photo for good.
- R9. Without a photo, the first letter of the display name shows.
- R10. The photo shows wherever a person's picture shows: Home for both partners, the days counter, Settings, and journal entries as the author.
- R11. Before pairing only the person sees the photo; once paired, the partner too; an outsider never.
- R12. The photo is stored as privately as journal photos.
- R13. The partner sees a change the next time their app opens or comes back to the front.
- R14. A refused or failed save, such as a lost connection, leaves the current photo or letter in place, with a clear message.
- R15. Bisou keeps the photo only to show it to the person and partner, until it is replaced or removed, or the account ends.

## Running example

An and Binh are a couple; without photos An sees "B" and Binh sees "A".

1. 6 November 2026: in Settings An taps the "A", picks a HEIC photo from the iPhone, frames the face and saves. It shows at once for An.
2. Binh's app still shows "A"; Binh switches away and back, and An's photo shows.
3. 7 November: An replaces it with a beach photo; the first one is gone for good.
4. 8 November: Binh taps "Gỡ ảnh" on Binh's own photo; "B" shows again.

Exceptions, where nothing changes:

- A PDF: "Không mở được tệp này. Hãy chọn ảnh JPEG, PNG hoặc HEIC."
- A 25 MB photo: "Ảnh quá lớn, tối đa 20 MB."
- Connection drops while saving: "Chưa lưu được ảnh. Thử lại nhé." The beach photo stays.

## Acceptance criteria

- AC1 (R1). Given a couple, when Binh tries to change An's photo, then it is refused.
- AC2 (R2, R3). Given An has no photo, when An taps the top picture or "Ảnh đại diện", picks, frames and saves, then the photo shows.
- AC3 (R4, R14). Given An picks a PDF, then it is refused with a clear message.
- AC4 (R5). Given a 25 MB photo, then it is refused before framing; 19 MB can be framed.
- AC5 (R6). Given a wide photo with a location, when An saves a framed part, then only that 512 pixel square is kept, without location or camera details.
- AC6 (R7). Given An replaces the photo, then nobody can see the old one again.
- AC7 (R8, R9). Given Binh has a photo, when Binh taps "Gỡ ảnh", then it is deleted and "B" shows.
- AC8 (R10). Given An has a photo, then both see it on Home, the days counter and An's journal entries, and An sees it in Settings.
- AC9 (R11, R12). Given unpaired Chi sets a photo, then only Chi sees it; an outsider never sees An's or Binh's.
- AC10 (R13). Given Binh's app shows "A", when An sets a photo and Binh brings the app back, then An's photo shows.
- AC11 (R14). Given An has the beach photo, when the connection drops while saving another, then the beach photo stays for both.
- AC12 (R15). Given An removes the photo, then Bisou no longer keeps it.

## Glossary

- **Profile photo** (ảnh đại diện): a person's own picture.
- **Remove photo** (gỡ ảnh): delete it and go back to the letter.
- **Letter**: first letter of the display name.

## Decided at Gate 1

- Where and how: R2, R3, R8.
- Where it shows: R10.
- Who sees it and storage: R11, R12.
- Replace, formats, size, details removed, partner refresh: R4, R6, R7, R13.
- Size limit before framing: R5, 20 MB, an Orchestrator default the PO may veto; the journal states no limit for a picked photo.

## Out of scope

- Setting the partner's photo, a couple photo, photo history, filters, taking a photo inside Bisou.
- Updating the partner's phone while the app stays in front.

## Open questions

None.
