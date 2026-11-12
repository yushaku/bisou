# Kind notes (lời nhắn nhỏ)

## Purpose

A partner wants to tell the other something that bothers them, from a small habit to something said in anger, so both understand each other without blame. Bisou guides the words into one concrete issue, lets the writer choose when the note arrives, lets the recipient open it only when ready, and leaves the talk itself to the couple. Closing, the journal entry, notifications and data rules are in [notes-journal](notes-journal.md). It builds on the [journal](journal.md) and the [installed app](pwa.md).

## Actors

- **Writer**: the partner who wrote a given note.
- **Recipient**: the writer's partner.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (writer): write a note in four short parts about one issue, so that I say what bothers me without blame. AC1, AC2, AC3, AC4
- US2 (writer): choose when a note is delivered, so that it reaches my partner at a moment I picked. AC43, AC44, AC45, AC46
- US3 (writer): correct, withdraw or delete a note until my partner opens it, so that a mistake never costs me the talk. AC9, AC10, AC11, AC37, AC39, AC40
- US4 (recipient): see that a note waits and open it only when I am ready, so that I hear it calmly. AC12, AC13, AC14, AC15, AC16, AC32
- US5 (recipient): close a note with one short answer, so that the real conversation happens in person. AC17, AC18
- US6 (partner): rely on notes when the connection is poor, so that nothing is sent or changed later by surprise. AC31, AC32, AC33

## Business rules

Writing

- R1. A note has one writer and one recipient, the writer's partner; only a partner in a couple can write one, and there is no limit on how many are written or wait.
- R2. A note has four parts, in this order: what happened (one concrete time), I feel, because to me (the need) and I hope (one concrete, doable request).
- R3. Each part is required and holds 1 to 500 characters, outer spaces ignored, line breaks kept; a note is text only, with no photos.
- R4. A note is about one issue; the form asks for it, and Bisou does not judge whether it is.
- R5. A part holding a generalising or blaming phrase from a fixed Vietnamese and English list shows a soft hint suggesting one concrete time or "mình" wording; the hint never blocks saving or sending, and Bisou never rewrites the text.
- R6. Notes are reached from the journal area, and Bisou gets no new main area; Home shows only the inbox indicator in R19.
- R7. Notes bring no new visual style; they reuse what Bisou already looks like.
- R8. Notes never touch the garden: writing, delivering or closing one changes no card, plant, topic or freshness.

Choosing when a note is delivered

- R63. The writer chooses to send now (the default), in 8 hours, or at a custom date and time in the future in the device's time zone.
- R64. Until delivery a note is the writer's alone: the writer may read it, change its parts under R2 to R5, change its delivery, send it now or delete it.
- R65. Changing the parts keeps the chosen delivery time; choosing 8 hours again starts a new 8-hour wait from that choice, and a custom time in the past is refused.
- R66. A note chosen for later delivers by itself at its time even when Bisou is closed, within about a minute, so it may arrive slightly late.
- R67. A draft with no delivery chosen, such as one saved before delivery choices existed, is never delivered on its own and never expires; it stays private until the writer sends or schedules it.
- R68. The writer sees a note waiting for delivery with its chosen time; the recipient sees nothing of it.
- R13. Deleting a note before delivery, after confirming, removes it for good; the partner never learns it existed.

Sending, changing and withdrawing

- R14. Delivery puts the note in front of the recipient at once; until the recipient opens it, the writer may still change it under R2 to R5, and nobody else can; a change sends no notification.
- R15. Until the recipient opens it, the writer may withdraw a delivered note after confirming; it is gone for good for both, leaves the recipient's count and section, and any notification or reminder not yet sent is dropped; a notification already shown stays, and following it opens the notes without the note.
- R16. Once opened, a note can no longer be changed, withdrawn or deleted by the writer or anyone; after closing, the journal rules in notes-journal R33 apply.
- R17. The writer sees each delivered note as "Chưa mở" (not opened yet) or "Đã mở" (opened), never a date, time or number of days.
- R18. The writer sees their own undelivered and delivered notes, most recently written first; the recipient never sees the writer's list.
- R58. A change after delivery is seen by the recipient only as the latest text, once opened: no "edited" mark, no earlier version, no new notification, and the arrival message and the 3-day reminder keep their times.
- R59. If a change and the recipient opening reach Bisou together, whichever comes first wins: if the open came first, the change is refused with a clear message and the note stays as the recipient opened it; otherwise the recipient opens the changed text, never a mix of two versions.
- R60. A change made offline or when the connection drops is not applied later on its own (R51); a refused change keeps what the writer typed until they leave it.

What the recipient sees before opening

- R19. While at least one delivered note waits unopened for a partner, that partner's Home shows an inbox indicator with the count of unopened notes and a lively mailbox cue, leading to the notes; with none waiting there is no indicator.
- R20. When the person asks for reduced motion, the mailbox cue stays still and nothing else changes.
- R21. Notes a partner delivered never count on that partner's own Home.
- R22. A waiting note shows the recipient only that it comes from the partner, with the "Mình sẵn sàng nghe" (I'm ready to listen) action: no part, label, date or length.
- R23. The recipient sees waiting notes first, oldest delivered first, then opened notes not yet closed, oldest opened first.

Opening and closing

- R24. The recipient sees a note's parts only after the ready-to-listen action on it; a note never opens by itself and has no deadline.
- R25. A note is opened once: from then it leaves the count, and the writer sees "Đã mở".
- R26. An opened note shows the recipient the writer's display name and the four parts, and the recipient can read it again until closing it.
- R27. The recipient closes a note by picking exactly one of three answers (I understand, I'll try; I'd like to talk in person; I see it differently, let's talk) and may add one line after "Mình hiểu là..." (what I understand is...), up to 500 characters.
- R28. There is no deadline to close; an opened note stays among the recipient's notes until closed.
- R29. Closing is final as an act: the note cannot be reopened or closed again; the pick and the line afterwards change only as part of the journal entry (notes-journal R33).
- R30. Bisou has no reply, thread, reaction or comment on a note beyond the pick and the line; the couple talks in person, as for the garden ([garden](garden.md) R16).
- R31. The writer sees the pick and the line in the closed note's journal entry.

Empty states and offline

- R48. The notes have two groups, "Gửi cho mình" (to me: waiting and opened notes) and "Mình đã viết" (I wrote: undelivered, not opened and opened notes); an empty group is left out; with both empty the person is told there are no notes yet and offered to write to the partner by name.
- R49. The invitation to write says a note suits things that are hard to say, and that a serious problem is better talked about directly.
- R50. Without a connection, the notes and the inbox indicator keep showing what was loaded, with the offline notice.
- R51. Saving, changing, scheduling, withdrawing, deleting, opening and closing a note need a connection; offline, the action says so and nothing happens later on its own.

## Main flows and exceptions

- Flow for US1: the writer fills the four parts; a hint may appear under a part and never stops saving; an empty or too long part is refused.
- Flow for US2: the writer picks now, in 8 hours or a custom time; now delivers at once, the others wait; a later change of delivery on a waiting note is allowed until delivery.
- Flow for US3: after delivery the writer fixes a typo with no new message to the recipient; once the recipient opens it, changing, withdrawing and deleting stop.
- Flow for US4: the recipient sees an indicator with a count, opens a note on purpose and can read it again; offline, opening says it needs a connection and the note stays unopened.
- Flow for US5: the recipient picks one answer, may add a line and closes; nothing can be replied in Bisou; the note then continues as in [notes-journal](notes-journal.md).
- Flow for US6: with no notes yet the person is invited to write; offline, every action that changes a note says it needs a connection and does nothing later.

## Acceptance criteria

- AC1 (R1). Given two partners in a couple, when one writes a note, then its recipient is the other with no other choice; a person not yet paired has no notes.
- AC2 (R2, R3). Given a part is empty or only spaces, or holds 501 characters, then saving is refused; four parts of 1 to 500 characters save, and no photo can be added.
- AC3 (R5). Given a part holds a blaming or generalising phrase from the list, then a soft hint shows; when the writer saves without changing it, the note saves exactly as typed.
- AC4 (R6, R8). Given a person uses Bisou, then no new main area exists, notes are reached from the journal area, and the garden looks the same before and after a note is written, delivered and closed.
- AC9 (R14, R17). Given a note was delivered, then the writer sees "Chưa mở" with no date or days and can still change it until the recipient opens it.
- AC10 (R15). Given the writer withdraws a delivered, unopened note and confirms, then the recipient's Home and notes show nothing of it and no reminder comes.
- AC11 (R16). Given the recipient opened the note, then the writer can no longer change, withdraw or delete it.
- AC12 (R19, R21). Given a delivered note waits, then the recipient's Home shows the indicator with 1 and the mailbox cue, and the writer's Home shows none; given a second note is delivered, then the count is 2.
- AC13 (R20). Given the recipient's device asks for reduced motion, then the mailbox cue stays still and the count still shows.
- AC14 (R22). Given a note waits, then the recipient sees only that a note from the partner waits and the ready-to-listen action, nothing of its parts, length or day.
- AC15 (R24). Given a note waits, then its parts stay hidden until the recipient takes the ready-to-listen action; given they never do, then weeks later it still waits.
- AC16 (R25, R26). Given the recipient opens the note, then the indicator count drops, the writer sees "Đã mở", and the recipient can read it again before closing it.
- AC17 (R27). Given the recipient tries to close without a pick, then it is refused; one pick without a line closes; a line of 501 characters is refused.
- AC18 (R29, R30). Given a note is closed, then it cannot be reopened or closed again, and neither partner can reply to it in Bisou.
- AC31 (R48, R49). Given no notes, then the person sees that there are none, the invitation and an offer to write to the partner by name.
- AC32 (R50, R51). Given the recipient is offline with a note waiting, when they try to open it, then they are told it needs a connection, the note stays unopened and the writer still sees "Chưa mở".
- AC33 (R51). Given the writer is offline, when they send or schedule a note, then they are told it needs a connection, nothing is sent, and nothing is sent later on its own.
- AC37 (R14, R58). Given a delivered note, when the writer fixes a typo before it is opened, then it saves, the writer still sees "Chưa mở", the recipient gets nothing new and no "edited" mark, and later reads the fixed text.
- AC39 (R59). Given a change and the recipient opening reach Bisou together and the open came first, then the change is refused with the clear message and the recipient's opened text is unchanged; given the change came first, then the recipient opens the changed text.
- AC40 (R60). Given the writer is offline, when they save a change, then they are told it needs a connection and the change is not made later on its own.
- AC43 (R63). Given a new note, then the writer can pick send now (the default), in 8 hours or a custom future time; send now delivers at once, and a custom time in the past is refused.
- AC44 (R64, R65). Given a note waiting for delivery, then the writer can change its parts without moving its time, change its time, or send it now; choosing 8 hours again counts 8 hours from that choice.
- AC45 (R66, R68). Given a note due at 06:30 and Bisou closed, then it reaches the recipient at about 06:30, the recipient saw nothing before, and the writer saw "scheduled" with the time until then.
- AC46 (R13, R67). Given a draft with no delivery chosen, then it is not delivered on its own however long it waits; given the writer deletes a draft or a note waiting for delivery and confirms, then it is gone for good and the recipient never learns it existed.

## Glossary

- **Kind note** (lời nhắn nhỏ): four short parts from one partner to the other about one issue; the area holding them is "Lời nhắn nhỏ".
- **Writer** (người viết) and **recipient** (người nhận).
- **Home** (trang chủ): the first view after signing in; **journal** (nhật ký): the couple's shared feed.
- **Delivery** (gửi): the moment the note reaches the recipient: now, 8 hours after the choice, or a custom time.
- **Draft** (bản nháp): a note with no delivery chosen.
- **Not opened yet** (chưa mở), **opened** (đã mở), **closed** (đã khép lại).
- **Withdraw** (rút lại): the writer taking back a delivered note before it is opened.
- **Pick** (lựa chọn khép lại): one of the three answers in R27.
- **Inbox indicator** (hộp thư): what Home shows while notes wait (R19).

## Out of scope

- Time capsule letters, a weight label such as "chuyện nhỏ", a compliments step, any link with the garden.
- Replies, threads, reactions or comments on a note; photos, voice or video; Bisou rewriting a note.
- Notes to oneself or to both partners; a list, history or count of closed notes.
- Export, leaving the couple and account deletion (notes-journal R57).

## Open questions

None.

Retired: R9, R10, R11, R12, R61, R62, AC5, AC6, AC7, AC8, AC38, AC41, AC42
