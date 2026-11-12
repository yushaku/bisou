# Notifications

## Purpose

A partner wants to know when the other wrote in the journal, answered today's card or left a kind note, and not to miss a birthday or an anniversary, without opening Bisou to check. It builds on the [journal](journal.md), [garden](garden.md), [upcoming events](events.md), [custom events](custom-events.md), [kind notes](notes.md) and the [installed app](pwa.md), and keeps the [wish jar](wishes.md) secret.

## Actors

- **Partner**: a member of a couple.
- **Author**: the partner who wrote a given entry.
- **Device**: one phone or browser where a partner is signed in.

## User stories

- US1 (partner): choose per device which kinds of notification I get, so that I am told only what I want. AC1, AC2, AC15, AC16, AC17, AC18, AC19, AC20
- US2 (partner): be told when my partner wrote in the journal or answered today's card, so that I know without opening Bisou. AC3, AC4, AC5, AC6, AC12, AC13, AC14, AC22
- US3 (partner): be reminded the day before and on the day of an event, so that I never miss a birthday or an anniversary. AC7, AC8, AC9, AC10, AC11, AC21
- US4 (recipient of a kind note): be told when a note arrives and reminded once, so that I do not miss it. notes-journal AC23, notes-journal AC24

## Business rules

Opting in

- R1. Bisou sends nothing to a device until the person turns notifications on there, and asks the system for permission only when the person chooses to turn them on.
- R2. Each device is turned on or off on its own; what is set on one device changes nothing on another.
- R3. There are two kinds, each with its own switch per device: partner's journal and event reminders; kind notes and the garden answer use the partner's journal switch, with no third kind.
- R4. Only a partner in a couple gets notifications; a person not yet paired gets none.
- R31. Every notification is in the recipient's app language, Vietnamese or English.
- R37. Notifications are sent at any hour, with no quiet hours, and a notification still undelivered after 24 hours is dropped.

Partner's journal

- R5. When a partner saves a new entry, each device of the other partner with this kind on gets "Bình vừa viết nhật ký" / "Bình wrote in the journal", with the author's display name.
- R6. Every new entry counts, back-filled ones and those made from a received wish included; changing or deleting an entry sends nothing; the one exception is a kind note closing into the journal ([notes-journal](notes-journal.md) R32), which sends nothing (R35).
- R7. The author's own devices never get a notification of the author's own entry.
- R8. The message never contains entry text, photos, the entry's day or whether it came from a wish; following it opens the journal.
- R8a. When a partner first answers today's card, each device of the other partner with this kind on gets "Người ấy vừa trả lời thẻ hôm nay" / "Your partner answered today's card"; it never names the question, a deck or an answer, and following it opens Home; changing or deleting an answer, extra play and decision answers send nothing, and the author's own devices never get it.
- R19. A new journal notification replaces an older one still showing on that device.

Wish jar secrecy

- R9. No notification ever tells anything about a wish, a spin, a claim, a release or a partner's jar ([wishes](wishes.md) R10, R17); an entry made from a received wish shows only as R5.

Event reminders

- R10. Every event in the upcoming events list (anniversaries, every 1,000th day, birthdays, the four holidays, custom events) gets two reminders by the Vietnam calendar, whatever the device's time zone: the day before at 20:00, "Ngày mai: Sinh nhật An" / "Tomorrow: An's birthday", and on the day at 08:00, "Hôm nay: Sinh nhật An" / "Today: An's birthday".
- R11. Events on the same day share one reminder that names at most 3 of them in list order ([events](events.md) R7, [custom events](custom-events.md) R10), then "và N sự kiện khác" / "and N more"; it names fewer if the message would be too long.
- R12. A partner gets no reminder of the partner's own birthday; the other partner does.
- R13. A reminder whose time has passed when an event is added or changed is never sent late.
- R14. An event changed or deleted before its reminder is reminded as it then stands, or not at all.
- R15. Following a reminder opens the full events list.

Settings and Home

- R20. A person sees this device's state: on, off, blocked by the system, not available until Bisou is installed, or not available in this browser.
- R21. A person has one switch per kind for this device; turning a kind on where the system has not allowed it yet asks the system first.
- R22. When the system blocks notifications, the switches cannot be turned on and the person is told how to allow Bisou.
- R23. Home invites a partner in a couple to turn notifications on, only in the installed app, while that device is undecided: never turned on, never refused, invitation never closed.
- R24. Accepting the invitation asks the system and, if allowed, turns both kinds on; if refused, the device is blocked; either way the invitation goes.
- R25. Closing the invitation hides it for good on that device.
- R26. Signing out stops all notifications on that device; after signing back in they stay off until turned on again.

Kind notes

- R35. A kind note still unopened 3 days after it was delivered gets one reminder at 07:00 on the third Vietnam day after the delivery day, never a second; no note message contains note text, following one opens the notes, the writer gets nothing, a note opened or withdrawn before its message goes out is left out, a closed note becoming a journal entry sends nothing, and the writer changing a delivered note before it is opened sends nothing and neither moves the reminder nor repeats the arrival message ([notes-journal](notes-journal.md) R35, R39 to R43; [notes](notes.md) R58).
- R36. When a kind note is delivered, each device of the recipient with the partner's journal kind on gets its own arrival message, "Sơn có một lời nhắn nhỏ" / "Sơn left you a kind note", at the moment of delivery; reminders due together give one message with the count ([notes-journal](notes-journal.md) R38, R69).

Personal data

- R27. For each device turned on, Bisou keeps the details needed to reach it and which kinds are on, only to send these notifications; a notification waiting to be sent (its text and which device it is for) is kept at most 24 hours.
- R28. It keeps them until both kinds are off on that device, the person signs out there, the device can no longer be reached, or the account is deleted.
- R29. They are never shared beyond the delivery service of the device's browser, which delivers the messages.
- R30. A partner sees what is on for a device and deletes it by turning both kinds off or signing out.
- R32. If Bisou's ability to reach devices is ever reset, all devices are switched off, and each person turns them on again.
- R33. Reaching details are a new kind of personal data; the PO records them in the records of processing, kept outside the repo.

## Main flows and exceptions

- Flow for US1: turn on from the Home invitation or from the settings, get a notification and follow it, turn a kind off, sign out; a refused or unavailable device says why.
- Flow for US2: the other partner writes or answers; each device with the kind on gets one message that opens the journal or Home.
- Flow for US3: an event inside the window gets a day-before and a same-day reminder; an event added too late gets only the reminder still ahead.
- Flow for US4: delivery sends the arrival message, an unopened note sends one reminder after 3 days; see [notes-journal](notes-journal.md).

## Acceptance criteria

- AC1 (R1, R23, R24). Given an installed app is undecided, then Home shows the invitation; when the person accepts and allows, then both kinds are on and the invitation is gone.
- AC2 (R1). Given a partner never turned notifications on, then their device gets nothing and the system was never asked.
- AC3 (R5, R8). Given the other partner writes an entry, then the message has no entry text or photo and following it opens the journal.
- AC4 (R6). Given the author fixes a typo or deletes an entry, then nothing is sent; given an entry back-filled to an old date, then the other partner is notified.
- AC5 (R7). Given the author is also signed in with notifications on on another device, when the author writes, then neither of the author's devices is notified.
- AC6 (R9). Given a partner spins the other's jar and claims a wish, or releases it, then the other gets nothing; when a wish is marked received, then the message reads only as an entry message.
- AC7 (R10, R12). Given a birthday on 18 November, then the other partner gets "Ngày mai: Sinh nhật An" on 17 November at 20:00 and "Hôm nay: Sinh nhật An" on 18 November at 08:00; the birthday's owner gets neither.
- AC8 (R10). Given a start date of 12 February 2023, then on 11 February 2027 at 20:00 both get "Ngày mai: Kỷ niệm 4 năm", and on 12 February at 08:00 "Hôm nay: Kỷ niệm 4 năm".
- AC9 (R11). Given a custom event on an anniversary day, then one message names the anniversary first, then the custom event; given five events on one day, then it names the first three in list order and ends "và 2 sự kiện khác" / "and 2 more", and following it opens the events list.
- AC10 (R13). Given an event added at 21:00 the evening before it, then no day-before reminder comes and both get the same-day reminder at 08:00.
- AC11 (R14). Given an event deleted before its reminder, then no reminder for it comes.
- AC12 (R5, R37). Given entries written at 21:59, 22:00, 23:10 and 06:59, then the other partner gets each at once, whatever the hour, and nothing more at 07:00.
- AC13 (R5, R6). Given an entry written and deleted twenty minutes later, then the other partner already got the message and nothing more is sent.
- AC14 (R19). Given two entries written minutes apart and the first not yet seen, then the other partner's device shows one notification.
- AC15 (R2, R3, R21). Given a partner turned both kinds on in two devices, when they turn event reminders off on one, then the other still gets both kinds and the first gets journal ones only.
- AC16 (R20, R22). Given Bisou is not installed where installing is required, then notifications are shown as not available until installed; given the system prompt was refused, then the device shows blocked, the switches cannot be turned on, and the person is told how to allow Bisou.
- AC17 (R23, R25). Given a person closes the invitation, when they reopen the app days later, then it stays hidden; in a browser where Bisou is not installed it never shows.
- AC18 (R26, R28). Given a partner signs out on a device, then it gets nothing more and Bisou no longer keeps its reaching details; when they sign back in, it shows off.
- AC19 (R4). Given a person not yet paired, then no notification is ever sent and Home shows no invitation.
- AC20 (R27, R28, R29, R30). Given a partner turns both kinds off on a device, then Bisou no longer keeps its reaching details or settings; while on, they go to no one but the device's delivery service.
- AC21 (R10, R31). Given a birthday on 3 January and the recipient's app language English, then they get "Tomorrow: Bình's birthday" on 2 January at 20:00.
- AC22 (R8a). Given a partner answers today's card, then the other partner's devices with this kind on get "Người ấy vừa trả lời thẻ hôm nay" and no other device does; following it opens Home; when the second partner answers, the first gets it; editing or deleting the answer or playing an extra card sends nothing.

## Glossary

- **Notification** (thông báo): a message shown by the phone or browser outside Bisou.
- **Partner's journal** (nhật ký của người ấy): the kind in R5.
- **Event reminder** (nhắc sự kiện): the kind in R10.
- **Undecided** (chưa chọn): a device never turned on, never refused, invitation never closed.

## Out of scope

- Notifications for a light tap, avatar or start date changes; they will reuse this framework later.
- Email instead of a notification, choosing other times, quiet hours, reminders more than one day ahead.
- Notifications when a partner leaves the couple; decide with leaving (see [pairing](pairing.md)).
- Export and full deletion; they come with account deletion.

## Open questions

None.

Retired: R34, AC23, AC24
