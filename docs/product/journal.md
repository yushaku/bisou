# Shared journal

## Purpose

A couple wants one place for their story: both partners write entries for a day, with words and a few photos, and read them together by day. It builds on [pairing](pairing.md).

## Actors

- **Partner**: a member of a couple; both have the same rights over the journal.
- **Author**: the partner who wrote a given entry.
- **Outsider**: anyone else, including a person not yet paired.

## User stories

- US1 (partner): write an entry for today or an earlier day with text, photos or both, so that our story includes what we want to remember. AC2, AC3, AC4, AC5, AC6, AC7, AC11, AC13, AC14
- US2 (partner): read both our entries together by day, so that we relive our story as one. AC5, AC8, AC15, AC16, AC17, AC18, AC19
- US3 (author): change or delete my own entry, so that the journal says what I mean. AC9, AC10
- US4 (partner): keep our entries and photos private to the two of us, so that I can write freely. AC1, AC12
- US5 (partner): look after an entry made from a closed kind note together, so that neither of us owns it alone. AC20, AC21, AC22

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
- R10. Only the author can change an entry's text, photos or day, except an entry made from a closed kind note (R26).
- R11. Only the author can delete an entry, after confirming; it disappears for both, with its photos, for good; except an entry made from a closed kind note (R26).
- R12. The feed shows both partners' entries grouped by day, most recent day first.
- R13. Within a day, the most recently written entry comes first, each with its author's display name.
- R14. Days without entries do not appear in the feed.
- R15. An entry records its origin: written by a partner, made from a closed kind note (R26), or made from a received wish ([wishes](wishes.md) R20); the same rules apply to a partner's entry and a wish entry, and R26 and R27 add to a note entry.
- R16. Each photo is kept as its chosen square only (R18), not as the original file, and its hidden location details are removed.
- R17. Bisou keeps entry texts and photos only to show them to the two partners, while the couple exists or until the author deletes the entry.
- R18. Every photo is square: the author moves and zooms it in a square frame to choose the part to keep; only that square is stored, never the rest.
- R19. A photo the author's device cannot open is refused with a clear message; the rest of the entry is kept.
- R20. After an entry is deleted, the partner's device may still show its photos for a short while, until it refreshes.
- R21. As a partner keeps reading the feed, older days keep appearing, with no extra step to see more.
- R22. An entry shows its author's name with the time it was written, its text and photos; the date and time written is not shown on an entry for an earlier day in the feed (R24).
- R23. A partner can open an entry to read it in full; a long text is cut short in the feed and opening it shows the whole text.
- R24. The full view shows the day, the author and time, the full text, the wish mark if the entry has one, the date and time written for an entry for an earlier day only, and every photo at full width, each opening a photo viewer; change and delete actions appear only to the author (R10, R11), and to both partners on an entry made from a closed kind note (R26).
- R25. Today's posts gathers every entry dated today from either partner, newest first, without change or delete actions; when no entry is dated today, or they have not loaded, it is absent.
- R26. An entry made from a closed kind note ([notes-journal](notes-journal.md) R32) belongs to both partners: either may change its four parts, the recipient's pick and "I understand..." line, or its day (R7, R8), and either may delete it after confirming, when it disappears for both for good; R10 and R11 do not apply to it. Its text follows [notes](notes.md) R2 to R5, not R4, and it has no photos and cannot get any (R5, notes-journal R34); changing or deleting it sends nothing ([notifications](notifications.md) R6).
- R27. Such a note entry and its full view show both partners' names: the writer's name with the time it was closed, and the recipient's name over the pick and the line (R22, R24).

## Main flows and exceptions

- Flow for US1: a partner picks a day, writes text, adds up to 4 photos each framed as a square, and saves; both see it at once. Exceptions: no text and no photo, text over 2000 characters, a fifth photo, or a day before 1900 or after today is refused with a reason and nothing is saved; an unreadable photo is refused and the rest is kept.
- Flow for US2: a partner reads the feed day by day, opens an entry for its full view, and sees today's posts gathered.
- Flow for US3: the author changes or deletes an entry after confirming; the partner cannot.
- Flow for US5: after a note is closed, either partner may change or delete the resulting entry.

## Acceptance criteria

- AC1 (R1, R2). Given A and B are a couple, then an outsider cannot see or add to their journal, and an unpaired person has none.
- AC2 (R3). Given A adds no text and no photo, when saving, then it is refused.
- AC3 (R3, R5). Given B adds 4 photos and no text, then it saves; a fifth photo is refused.
- AC4 (R4). Given text of 2001 characters, then it is refused; 2000 save.
- AC5 (R6, R13). Given B wrote at 12:30 and 22:00 on one day, then both show under that day, the 22:00 entry above the 12:30 one, each with B's name.
- AC6 (R7, R14). Given B dates an entry long before today, then it saves and shows after the more recent days with no empty days between.
- AC7 (R7, R8). Given it is a given day everywhere, when A picks the next day or a day before 1900, then it is refused.
- AC8 (R9, R12). Given A saves an entry, when B opens the feed, then it is already there, most recent day first.
- AC9 (R10). Given A wrote an entry, when A fixes a typo, then both see it; when B tries to change it, then it is refused.
- AC10 (R11, R20). Given A deletes an entry with 2 photos and confirms, then the entry and its photos are gone for both, on B's device once it refreshes.
- AC11 (R15). Given a partner writes an entry, then it is recorded as written by a partner.
- AC12 (R16, R17). Given B adds a photo with a location, then the kept photo has no location and only A and B see it.
- AC13 (R16, R18). Given B frames part of a wide photo as a square, when saving, then both see only that square; the rest is not kept.
- AC14 (R19). Given B picks a photo the device cannot open, then it is refused with a clear message and the entry's text and other photos stay.
- AC15 (R12, R21). Given many days of entries, when A keeps reading down the feed, then older days keep appearing down to the oldest, with no extra step.
- AC16 (R22, R24). Given B wrote an entry for an earlier day, then the feed shows B's name and time written without the date written, and the full view shows the date and time it was written.
- AC17 (R23, R24). Given A opens an entry with 2 photos, then the full view shows the day, A's name and time, the full text and both photos at full width, each opening the viewer; change and delete actions show for A and not for B.
- AC18 (R23). Given B's entry text is cut short in the feed, when A opens it, then the whole text shows.
- AC19 (R25). Given entries dated yesterday and today, then today's posts shows only today's, newest first, with no change or delete actions; when the last one is deleted, today's posts is absent until another entry is dated today.
- AC20 (R10, R11, R15, R26). Given an entry made from A's note that B closed, then A and B can each change its parts, the pick, the line or the day, and each can delete it after confirming, gone for both; given a normal entry by A, then B can do neither.
- AC21 (R26). Given that entry, when either partner tries to add a photo, then it is refused.
- AC22 (R17, R24, R27). Given that entry, then it and its full view show both names, and change and delete actions are offered to both.

## Glossary

- **Journal** (nhật ký chung): all entries of a couple.
- **Entry** (bài nhật ký): one note by one partner for one day.
- **Day of an entry** (ngày của bài): the day it is about, not when it was typed.
- **Feed** (dòng nhật ký): both partners' entries grouped by day.
- **Back-fill** (ghi bù): writing for a past day.
- **Note entry** (bài từ lời nhắn nhỏ): an entry made from a closed kind note, shared by both partners (R26).
- **Today's posts** (bài viết hôm nay): the entries dated today.

## Out of scope

- Milestones and timeline.
- Reactions, comments, drafts, search, videos; notifying the partner of a new entry is in [notifications](notifications.md).
- Kind notes before they are closed ([notes-journal](notes-journal.md) R32 to R34).
- Undoing a delete, such as a recovery bin; export and full deletion come with account deletion (see [pairing](pairing.md)).
- The journal when a partner leaves the couple; decide it with leaving, which pairing also leaves out.

## Open questions

None.

Retired: none
