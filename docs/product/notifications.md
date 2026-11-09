# Notifications

## Decided at Gate 1

- PO: opt-in only, per device; two kinds: the partner's new journal entry (an entry made from a received wish counts, never revealing the wish) and event reminders the day before at 20:00 and on the day at 08:00, Vietnam time (R1 to R3, R5 to R7, R10).
- PO: nothing about spins, claims or a partner's jar (R9).
- PO: the text says who and what, never journal text; tapping opens the journal or the events list (R8, R15).
- PO: a Notifications page in Settings with one switch per kind and the device's state; a Home card inviting to turn them on, only in the installed app while undecided, closable for good on that device (R20 to R25).
- PO: quiet hours 22:00 to 07:00 Vietnam time; journal notifications from the night are held to 07:00, combined (R16, R17); garden answer notifications follow the same quiet hours rule.
- PO: garden notifications use the partner journal kind switch; no separate switch or push_subscriptions change (R3, R16-R18 cover it).
- PO: signing out stops that device (R26); personal data as R27 to R30.
- PM defaults, PO may veto: unpaired people get none (R4); no reminder of one's own birthday (R12); same-day events share one reminder (R11); no late reminders, and a changed or deleted event is reminded as it then stands (R13, R14); a held entry deleted before 07:00 is left out and held messages go to the devices on at 07:00 (R18); a newer journal notification replaces an older one still showing (R19); the Home card turns both kinds on (R24); a browser without notifications shows "not available in this browser" (R20); signing back in leaves them off (R26); texts follow the recipient's app language (R31).

## Purpose

A partner wants to know when the other wrote in the journal, answered today's card, and not to miss a birthday or an anniversary, without opening Bisou to check. It builds on the [journal](journal.md), [garden](garden.md), [upcoming events](events.md), [custom events](custom-events.md) and the [installed app](pwa.md), and keeps the [wish jar](wishes.md) secret.

## Actors

- **Partner**: a member of a couple.
- **Author**: the partner who wrote a given entry.
- **Device**: one phone or browser where a partner is signed in.

## Business rules

Opting in

- R1. Bisou sends nothing to a device until the person turns notifications on there, and asks the system for permission only when the person taps to turn them on.
- R2. Each device is turned on or off on its own; what is set on one device changes nothing on another.
- R3. There are two kinds, each with its own switch per device: partner's journal and event reminders.
- R4. Only a partner in a couple gets notifications; a person not yet paired gets none.

Partner's journal

- R5. When a partner saves a new entry, each device of the other partner with this kind on gets "Bình vừa viết nhật ký" / "Bình wrote in the journal", with the author's display name.
- R6. Every new entry counts, back-filled ones and those made from a received wish included; changing or deleting an entry sends nothing.
- R7. The author's own devices never get a notification of the author's own entry.
- R8. The message never contains entry text, photos, the entry's day or whether it came from a wish; tapping it opens the journal.
- R8a. When a partner first answers today's card, each device of the other partner with this kind on gets "Người ấy vừa trả lời thẻ hôm nay" / "Your partner answered today's card"; it never names the question, a deck or an answer, and tapping it opens Home. Changing or deleting an answer, extra play and decision answers send nothing, and the author's own devices never get it.

Wish jar secrecy

- R9. No notification ever tells anything about a wish, a spin, a claim, a release or a partner's jar ([wishes](wishes.md) R10, R17); an entry made from a received wish shows only as R5.

Event reminders

- R10. Every event in the upcoming events list (anniversaries, every 1,000th day, birthdays, the four holidays, custom events) gets two reminders by the Vietnam calendar, whatever the device's time zone: the day before at 20:00, "Ngày mai: Sinh nhật An" / "Tomorrow: An's birthday", and on the day at 08:00, "Hôm nay: Sinh nhật An" / "Today: An's birthday".
- R11. Events on the same day share one reminder that names at most 3 of them in list order ([events](events.md) R7, [custom events](custom-events.md) R10), then "và N sự kiện khác" / "and N more" ("A, B, C và 2 sự kiện khác", no comma before "và" in Vietnamese); it names fewer if the message would be too long; tapping it opens the events list (R15).
- R12. A partner gets no reminder of the partner's own birthday; the other partner does.
- R13. A reminder whose time has passed when an event is added or changed is never sent late.
- R14. An event changed or deleted before its reminder is reminded as it then stands, or not at all.
- R15. Tapping a reminder opens the full events list.

Quiet hours

- R16. From 22:00 to 07:00 Vietnam time no notification shows; event reminders already fall outside these hours.
- R17. Journal notifications from those hours are held and sent at 07:00: one entry gives the R5 message, several give one message with the count, "Bình đã viết 3 bài nhật ký" / "Bình wrote 3 journal entries".
- R18. A held entry deleted before 07:00 is left out, and nothing is sent if none is left; the message goes to the devices with this kind on at 07:00.
- R19. A new journal notification replaces an older one still showing on that device.

Settings and Home

- R20. Settings has a Notifications page ("Thông báo") showing this device's state: on, off, blocked by the system, not available until Bisou is installed (iPhone in a browser tab), or not available in this browser.
- R21. The page has one switch per kind for this device; turning a kind on where the system has not allowed it yet asks the system first.
- R22. When the system blocks notifications, the switches cannot be turned on and the page says to allow Bisou in the phone or browser settings.
- R23. Home shows a small card inviting to turn notifications on, only in the installed app, for a partner in a couple, while that device is undecided: never turned on, never refused, card never closed.
- R24. The card's button asks the system and, if allowed, turns both kinds on; if refused, the device is blocked; either way the card goes.
- R25. The card's close button hides it for good on that device.
- R26. Signing out stops all notifications on that device; after signing back in they stay off until turned on again.

Personal data

- R27. For each device turned on, Bisou keeps the push address and keys the browser gives and which kinds are on, only to send these notifications; held journal notifications are kept only until 07:00.
- R28. It keeps them until both kinds are off on that device, the person signs out there, the push service says the address is gone, or the account is deleted.
- R29. They are never shared beyond the push service of the device's browser, which delivers the messages.
- R30. A partner sees what is on for a device on its Notifications page and deletes it by turning both kinds off or signing out.
- R32. If the app's notification key ever changes, all devices are switched off, and each person turns them on again from Settings.
- R33. The push address and keys are a new kind of personal data; the PO records them in the records of processing, kept outside the repo.

Language

- R31. Every notification is in the recipient's app language, Vietnamese or English.

## Running example

An uses an iPhone with Bisou installed; Bình uses an Android phone. Together since 12 February 2023; An born 18 November 1997. Today is 7 November 2026.

1. 7 November, 09:00: An opens the installed app; Home shows the invite card. An taps it, the iPhone asks, An allows: both kinds on. Bình turns on both switches on the Notifications page.
2. 7 November, 15:00: Bình writes an entry; An gets "Bình vừa viết nhật ký" at once and tapping it opens the journal. At 15:30 Bình fixes a typo: nothing is sent.
3. 7 November, 16:00: Bình answers today's card; An gets "Người ấy vừa trả lời thẻ hôm nay" and tapping it opens Home. When An answers, Bình gets the same; An editing the answer afterwards sends nothing.
4. 7 November, 23:10: Bình writes; nothing shows. 8 November, 07:00: An gets "Bình vừa viết nhật ký".
5. 17 November, 20:00: Bình gets "Ngày mai: Sinh nhật An"; 18 November, 08:00: "Hôm nay: Sinh nhật An". An gets neither.
6. 18 November, 20:00: both get "Ngày mai: Ngày Quốc tế Nam giới"; 19 November, 08:00: "Hôm nay: Ngày Quốc tế Nam giới".
7. 20 November, 10:00: Bình marks the linen scarf received; An gets "Bình vừa viết nhật ký", nothing more.

## Main flows

Turn on from the Home card or the Notifications page, get a notification and tap it, turn a kind off, sign out. A refused or unavailable device says why on the Notifications page.

## Acceptance criteria

- AC1 (R1, R23, R24). Given An's installed app is undecided, then Home shows the card; when An taps it and allows, then both kinds are on and the card is gone.
- AC2 (R1). Given Bình never turned notifications on, then Bình's phone gets nothing, and the system never asked.
- AC3 (R5, R8). Given step 2, then An gets "Bình vừa viết nhật ký" with no entry text or photo; tapping it opens the journal.
- AC4 (R6). Given Bình fixes a typo or deletes an entry, then nothing is sent; given Bình back-fills 12 February 2023, then An is notified.
- AC5 (R7). Given Bình is also signed in with notifications on in a laptop browser, when Bình writes on the phone, then neither of Bình's devices is notified.
- AC6 (R9). Given Bình spins An's jar and claims a wish, or releases it, then An gets nothing; when Bình marks a wish received (step 6), then An's message reads only "Bình vừa viết nhật ký".
- AC7 (R10, R12). Given An's birthday on 18 November, then Bình gets "Ngày mai: Sinh nhật An" on 17 November at 20:00 and "Hôm nay: Sinh nhật An" on 18 November at 08:00; An gets neither.
- AC8 (R10). Given the start date 12 February 2023, then on 11 February 2027 at 20:00 both get "Ngày mai: Kỷ niệm 4 năm", and on 12 February at 08:00 "Hôm nay: Kỷ niệm 4 năm".
- AC9 (R11). Given "Xem phim" added for 12 February 2027, then the 20:00 reminder on 11 February names the anniversary first, then "Xem phim", in one message; given five events on one day, then the reminder names the first three in list order and ends "và 2 sự kiện khác" / "and 2 more", and tapping it opens the events list.
- AC10 (R13). Given An adds "Bay đi Đà Lạt" on 19 December at 21:00 for 20 December, then no day-before reminder comes; on 20 December at 08:00 both get "Hôm nay: Bay đi Đà Lạt".
- AC11 (R14). Given Bình deletes "Bay đi Đà Lạt" on 19 December at 10:00, then no reminder for it comes.
- AC12 (R16, R17). Given Bình writes at 21:59, then An gets it at once; given Bình writes at 22:00, 23:10 and 06:59, then An gets one message at 07:00: "Bình đã viết 3 bài nhật ký".
- AC13 (R18). Given Bình writes at 23:10 and deletes it at 23:30, then nothing is sent at 07:00.
- AC14 (R19). Given Bình writes at 15:00 and 15:05 and An has not opened the first, then An's phone shows one notification.
- AC15 (R2, R3, R21). Given Bình also turned both kinds on in a laptop browser, when Bình turns event reminders off on the laptop, then the phone still gets both kinds and the laptop gets journal ones only.
- AC16 (R20, R22). Given An opens Bisou in Safari, not installed, then the page says notifications are not available until Bisou is installed; given Bình refused the system prompt, then it shows blocked, the switches cannot be turned on, and it says how to allow Bisou.
- AC17 (R23, R25). Given An closes the card, when An reopens the app days later, then it stays hidden; Bisou in a browser tab never shows it.
- AC18 (R26, R28). Given An signs out on the iPhone, then the iPhone gets nothing more and Bisou no longer keeps its address; when An signs back in, the page shows off.
- AC19 (R4). Given a person not yet paired, then no notification is ever sent and Home shows no card.
- AC20 (R27, R28, R29, R30). Given Bình turns both kinds off on the phone, then Bisou no longer keeps the phone's address or settings; while on, they go to no one but the phone's push service.
- AC21 (R10, R31). Given Bình was born 3 January 1996 and An's app language is English, then An gets "Tomorrow: Bình's birthday" on 2 January 2027 at 20:00.
- AC22 (R8a). Given Bình answers today's card at 16:00, then An's devices with this kind on get "Người ấy vừa trả lời thẻ hôm nay" and no other device does; tapping it opens Home; when An answers, Bình gets it; when Bình edits or deletes the answer or plays an extra card, nothing is sent.

## Glossary

- **Notification** (thông báo): a message shown by the phone or browser outside Bisou.
- **Partner's journal** (nhật ký của người ấy): the kind in R5.
- **Event reminder** (nhắc sự kiện): the kind in R10.
- **Quiet hours** (giờ yên tĩnh): 22:00 to 07:00 Vietnam time.
- **Undecided** (chưa chọn): a device never turned on, never refused, card never closed.

## Out of scope

- Notifications for a light tap, avatar or start date changes; they will reuse this framework later.
- Email instead of a notification, choosing other times or quiet hours, reminders more than one day ahead.
- Notifications when a partner leaves the couple; decide with leaving (see pairing).
- Export and full deletion; they come with account deletion.

## Open questions

None.
