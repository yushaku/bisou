# Shared journal

## Purpose

A couple wants one place for their story: both partners write entries for a day, with words and a few photos, and read them together by day. It builds on [pairing](pairing.md).

## Actors

- **Partner**: a member of a couple; both have the same rights over the journal.
- **Author**: the partner who wrote a given entry.
- **Outsider**: anyone else, including a person not yet paired.

## Business rules

- R1. Only the two partners can write in or read their couple's journal; an outsider learns nothing about it.
- R2. A person not yet paired has no journal.
- R3. An entry has one author, one day, and text, photos or both, never neither.
- R4. Entry text is at most 2000 characters, outer spaces ignored.
- R5. An entry has at most 4 photos, each square (R18).
- R6. A partner may write any number of entries for the same day.
- R7. An entry's day is today unless the author picks an earlier day, from 1 January 1900, also before the start date.
- R8. An entry's day cannot be after today in the earliest time zone.
- R9. A saved entry is visible to both partners at once; there are no drafts.
- R10. Only the author can change an entry's text, photos or day.
- R11. Only the author can delete an entry, after confirming; it disappears for both, with its photos, for good.
- R12. The feed shows both partners' entries grouped by day, most recent day first.
- R13. Within a day, the most recently written entry comes first, each with its author's display name.
- R14. Days without entries do not appear in the feed.
- R15. An entry records its origin: written by a partner, or, in a later version, made from a completed wish; the same rules apply to both.
- R16. Each photo is kept as its chosen square only (R18), at a size good for a phone, not as the original file, and its hidden location details are removed.
- R17. Bisou keeps entry texts and photos only to show them to the two partners, while the couple exists or until the author deletes the entry.
- R18. Every photo is square: the author moves and zooms it in a square frame to choose the part to keep; only that square is stored, never the rest.
- R19. A photo the author's device cannot open is refused with a clear message; the rest of the entry is kept.
- R20. After an entry is deleted, the partner's phone may still show its photos for a short while, until it refreshes.
- R21. As a partner keeps going down the feed, older days keep appearing, with nothing to press to see more.

## Running example

An and Binh, together since 12 February 2023, paired on 5 November 2026.

1. 5 November 2026, 21:00: An writes "Our first evening on Bisou, bun cha at the corner shop" with 2 photos. Binh sees it at once under 5 November.
2. 6 November, 12:30: Binh writes "Lunch break call, you sounded tired", no photo.
3. 6 November, 22:00: Binh writes "Rain on the way home" with 1 wide photo, framing the square to keep.
4. 6 November, 22:10: Binh back-fills 12 February 2023, "Our first date at West Lake", with 4 photos, each framed as a square; a fifth is refused.
5. 7 November: An fixes a typo in the 5 November entry; Binh can read it but not change or delete it. An's entry dated 8 November is refused.

On 7 November both see: 6 November (Binh 22:00, Binh 12:30), 5 November (An), 12 February 2023 (Binh).

## Main flows

Write (text, photos, a day), read the feed, change or delete one's own entry. Anything breaking a rule is refused with a reason and nothing is saved.

## Acceptance criteria

- AC1 (R1, R2). Given An and Binh are a couple, then an outsider cannot see or add to their journal, and an unpaired person has none.
- AC2 (R3). Given An adds no text and no photo, when saving, then it is refused.
- AC3 (R3, R5). Given Binh adds 4 photos and no text, then it saves; a fifth photo is refused.
- AC4 (R4). Given text of 2001 characters, then it is refused; 2000 save.
- AC5 (R6, R13). Given Binh wrote at 12:30 and 22:00 on 6 November, then both show under 6 November, the 22:00 entry above the 12:30 one, named "Binh".
- AC6 (R7, R14). Given today is 6 November 2026, when Binh dates an entry 12 February 2023, then it saves and shows after 5 November with no empty days between.
- AC7 (R7, R8). Given today is 7 November 2026 everywhere, when An picks 8 November 2026 or 31 December 1899, then it is refused.
- AC8 (R9, R12). Given An saves an entry, when Binh opens the feed, then it is already there, most recent day first.
- AC9 (R10). Given An wrote the 5 November entry, when An fixes a typo, then both see it; when Binh tries, then it is refused.
- AC10 (R11, R20). Given An deletes the 5 November entry and confirms, then it and its 2 photos are gone for both, on Binh's phone once it refreshes.
- AC11 (R15). Given a partner writes an entry, then it is recorded as written by a partner.
- AC12 (R16, R17). Given Binh adds a photo with a location, then the kept photo has no location and only An and Binh see it.
- AC13 (R16, R18). Given Binh frames part of a wide photo as a square, when saving, then both see only that square; the rest is not kept.
- AC14 (R19). Given Binh picks a photo the device cannot open, then it is refused with a clear message and the entry's text and other photos stay.
- AC15 (R12, R21). Given many days of entries, when An keeps going down the feed, then older days keep appearing down to 12 February 2023 without pressing anything.

## Glossary

- **Journal** (nhật ký chung): all entries of a couple.
- **Entry** (bài nhật ký): one note by one partner for one day.
- **Day of an entry** (ngày của bài): the day it is about, not when it was typed.
- **Feed** (dòng nhật ký): both partners' entries grouped by day.
- **Back-fill** (ghi bù): writing for a past day.

## Out of scope

- Milestones and timeline; wishes and entries made from them.
- Reactions, comments, drafts, later reveal, notifications, search, videos.
- Undoing a delete, such as a recovery bin; export and full deletion come with account deletion (see pairing).
- The journal when a partner leaves the couple; decide it with leaving, which pairing also leaves out.

## Open questions

None.
