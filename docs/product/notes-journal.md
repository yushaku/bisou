# Kind notes: closing, journal, alerts and data (lời nhắn nhỏ)

## Purpose

Once a kind note is delivered ([notes](notes.md)), the couple needs it to become a shared memory they can correct, to be told it arrived without its words leaking, and to be sure nobody else sees it. This capability covers the closed note as a journal entry, its notifications, and its personal data.

## Actors

- **Writer** and **recipient**: as in [notes](notes.md).
- **Partner**: either of the two.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US6 (partner): keep a closed note as a shared journal entry, so that we both remember it and can correct it. AC19, AC20, AC21, AC22, AC35, AC36
- US7 (recipient): be told once when a note arrives and reminded once if it stays unopened, so that I do not miss it while its words never leak. AC23, AC24, AC26, AC27, AC47
- US8 (partner): be sure the recipient meets only the delivered version and an outsider learns nothing, so that I can write honestly. AC28, AC29, AC30, AC34

## Business rules

Closing into the journal

- R32. When the recipient closes a note, it becomes at once a journal entry in the couple's feed, shown with both partners' names (the writer's with the time, the recipient's over the pick and the line), dated the day it was closed by the Vietnam calendar, marked as from a kind note, holding the four parts as delivered and the recipient's pick and line; it leaves the notes for both ([journal](journal.md) R26, R27).
- R33. From then the [journal](journal.md) rules apply, with the exception [journal](journal.md) R26 makes to its R10 and R11: both partners see it, and either may change its four parts under [notes](notes.md) R2 to R5, the recipient's pick and line or its day, or delete it after confirming, when it is gone for both for good.
- R34. The entry never gets photos; a changed pick or line keeps showing under the recipient's name, and the pick stays one of the three in [notes](notes.md) R27.
- R35. A note becoming a journal entry sends no notification to anyone.
- R36. Undelivered, withdrawn, waiting and opened but not closed notes never reach the journal.
- R37. Bisou never counts or lists closed notes: they appear only as journal entries, and nothing shows how many notes either partner has sent or received, beyond the waiting count in [notes](notes.md) R19.

Notifications

- R38. When a note is delivered, each device of the recipient with the partner's journal kind on gets "Sơn có một lời nhắn nhỏ" / "Sơn left you a kind note" at any hour ([notifications](notifications.md) R3, R36).
- R39. A note still unopened 3 days after it was delivered gets one reminder, "Lời nhắn nhỏ của Sơn vẫn ở đây" / "Sơn's kind note is still here", at 07:00 on the third Vietnam day after the delivery day; there is never a second reminder ([notifications](notifications.md) R35).
- R41. No notification ever contains a part, the pick or the line; following one opens the notes.
- R42. The writer gets no notification when a note is delivered, opened or closed.
- R43. A note opened or withdrawn before its message goes out is left out, and nothing is sent if none is left.

Privacy and data

- R44. Before a note is delivered, the recipient learns nothing of it: no indicator, count, notification or change anywhere in Bisou.
- R45. Before the recipient opens a note, nothing of its parts reaches the recipient in any way.
- R46. The recipient never sees an undelivered or withdrawn note, the hints the writer saw, or what the writer changed before the recipient opened it.
- R47. An outsider learns nothing of a couple's notes.
- R52. A note's parts are the writer's personal data; Bisou keeps them with when the note was first saved, when it is due, whether it was delivered and whether it was opened, only to show it to the writer, to deliver it to the recipient as these rules allow, and to show the writer its state.
- R53. The pick and the line are the recipient's personal data, kept only in the closed note's journal entry.
- R54. No outside service reads, scores or rewrites a note: hints come only from the fixed word list in [notes](notes.md) R5.
- R55. While the couple exists, Bisou keeps a note until it is deleted, withdrawn or closed; a closed note is then kept and deleted as a journal entry ([journal](journal.md) R11, R17).
- R56. The writer can read their notes at any time, change them until the recipient opens them, delete them before delivery and withdraw them until opened; the recipient sees a note only once opened; after closing, R33 and R34 apply to both partners.
- R57. Notes join export, leaving the couple and account deletion when those arrive ([pairing](pairing.md)); this spec promises nothing more until then.
- R69. Reminders due together for the same writer combine into one message with the count, "2 lời nhắn nhỏ của Sơn vẫn ở đây" / "2 kind notes from Sơn are still here".

## Main flows and exceptions

- Flow for US6: closing creates the entry at once for both partners; either may correct or delete it, and nobody is notified.
- Flow for US7: an arrival message at delivery, one reminder after 3 days unless the note was opened or withdrawn; a recipient with the partner's journal kind off gets none and still sees the inbox indicator.
- Flow for US8: nothing reaches the recipient before delivery, no part reaches them before opening, and withdrawing or deleting removes the note for good.

## Acceptance criteria

- AC19 (R32). Given the recipient closes a note, then both feeds show on the closing day an entry with both names, marked as from a kind note, with the four parts as delivered and, under the recipient's name, the pick and the line; the notes no longer show it.
- AC20 (R33, R34). Given that entry, then each partner can change the four parts, the recipient's pick, the line or the day, and can delete it after confirming, gone for both; nobody can add a photo.
- AC21 (R35). Given both have the partner's journal kind on, then neither gets a notification when the entry appears.
- AC22 (R36, R37). Given a partner has an undelivered note and withdrew another, then neither is in the journal, and nothing shows a total of notes sent or received.
- AC23 (R38). Given a note is sent now at 06:30, then the recipient gets the arrival message at 06:30; given it is sent at 15:00, then at 15:00.
- AC24 (R39). Given a delivered note stays unopened, then the recipient gets one reminder at 07:00 on the third Vietnam day after the delivery day and nothing after; given it was opened, then no reminder comes.
- AC26 (R41, R42). Given any note notification, then it shows no part, pick or line, and following it opens the notes; the writer gets nothing at delivery, opening or closing.
- AC27 (R38, R39). Given the recipient never turned notifications on or turned the partner's journal kind off, then no arrival message or reminder comes, and the inbox indicator still shows.
- AC28 (R44, R46). Given a note not yet delivered, then nothing the recipient sees differs; after delivery and a later fix, the recipient never sees the earlier wording, the hint or that it changed.
- AC29 (R45). Given a note waits, then the recipient cannot read any part, by any means in Bisou, before the ready-to-listen action.
- AC30 (R47). Given a couple's notes, then an outsider learns nothing of them.
- AC34 (R54). Given the writer types a phrase from the hint list, then the hint shows and no outside service receives the text.
- AC35 (R52, R55). Given the writer withdraws a waiting note and confirms, then it is gone for good for both and Bisou keeps nothing of it.
- AC36 (R53, R56). Given a closed note's entry, when either partner deletes it and confirms, then the four parts, the pick and the line are gone for both.
- AC47 (R69). Given two reminders for the same writer are due together, then the recipient gets one message with the count.

## Glossary

- **Note entry** (bài từ lời nhắn nhỏ): the journal entry a closed note becomes, shared by both partners.
- **Arrival message** (thông báo lời nhắn mới) and **reminder** (nhắc lời nhắn): the two notifications of [notifications](notifications.md).

## Out of scope

- A count, list or history of closed notes; notifying the writer; replies to a note.
- Export, leaving the couple and account deletion until they arrive (R57).

## Open questions

None.

Retired: R40, AC25
