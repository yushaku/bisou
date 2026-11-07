# Custom events

## Purpose

A couple adds their own plans to the [upcoming events](events.md) list.

## Actors

- **Partner**: a member of a couple.
- **Outsider**: anyone else.

## Business rules

Event

- R1. A custom event has a title of 1 to 60 characters (outer spaces ignored), a date, a repeat (once or every year) and one of 8 icons: heart, plane, music, dinner, gift, cake, family, star.
- R2. The date must be real: today or later for a one-off, with no upper limit; from 1900 for a yearly event's first date. It is checked only when set or changed.
- R3. A yearly event repeats on its day and month; 29 February falls on 28 February in other years.
- R4. A couple keeps at most 100 upcoming custom events (yearly, or one-off from today); past one-offs do not count.

Sharing

- R5. Both partners see, change and delete every custom event; an outsider learns nothing.
- R6. Nothing shows who added or changed an event.
- R7. The last save wins; saving an event the other partner deleted is refused.

Showing

- R8. Custom events follow the list rules of [events](events.md) R8 to R12.
- R9. A custom event shows its title as typed and its icon; a yearly event adds its years since the first date, as anniversaries do ("Ngày gặp bố mẹ (3 năm)" / "(3 years)"; "(1 năm)" / "(1 year)" one year on), except on the first date.
- R10. On one day, custom events follow the computed ones ([events](events.md) R7), earliest added first.
- R11. A one-off event leaves the list when its day ends; Bisou keeps it for a future timeline.
- R18. "See all" ends with a group "Xa hơn" / "Later": custom events whose next date is beyond the 12 months, by date. No computed events; Home is unchanged.

Adding and changing

- R12. On Home the + opens the add event sheet ("Thêm sự kiện") directly; journal entries and wishes are added from their tabs.
- R13. Tapping a custom event opens it to change or delete.
- R14. Deleting asks first ("Xoá “Bay đi Đà Lạt”? Cả hai sẽ không thấy sự kiện này nữa."); it cannot be undone.
- R15. Computed events cannot be opened; birthdays change in Settings, as today.
- R16. Replaced by [notifications](notifications.md) R10: a custom event gets the same two reminders as other events, for devices that turned them on.

Personal data

- R17. Custom events are the couple's shared data, kept only to show them, until the couple ends or a partner deletes them.

## Running example

Today is 6 November 2026. An and Binh, together since 12 February 2023; An born 18 November 1997, Binh 3 January 1996. Binh adds "Bay đi Đà Lạt" (20 December 2026, once, plane) and "Đi Nhật" (10 April 2028, once, plane). An adds "Ngày gặp bố mẹ" (1 June 2024, every year, family).

"See all":

- 18 November 2026: An's birthday, An turns 29
- 19 November 2026: International Men's Day
- 20 December 2026: Bay đi Đà Lạt
- 3 January 2027: Binh's birthday, Binh turns 31
- 12 February 2027: 4 year anniversary
- 14 February 2027: Valentine's Day
- 8 March 2027: International Women's Day
- 1 June 2027: Ngày gặp bố mẹ (3 năm)
- 20 October 2027: Vietnamese Women's Day
- Xa hơn: 10 April 2028: Đi Nhật

Home shows the first three, in 12, 13 and 44 days. On 21 December the trip is gone; "(4 năm)" follows on 1 June 2028.

## Main flows

Add, change, delete. Rule breaks are refused with a reason ("Tên sự kiện tối đa 60 ký tự").

## Acceptance criteria

- AC1 (R5, R6). Given Binh's trip, then An can change and delete it; no author shows; an outsider sees nothing.
- AC2 (R8, R10, R18). Given the example, then Home and "See all" show exactly what it lists.
- AC3 (R1). Given 61 characters, only spaces or no icon, then it is refused; outer spaces are trimmed.
- AC4 (R2). Given 6 November 2026, then a one-off on 5 or 31 November 2026 is refused, on 6 November 2026 or 7 November 2031 saves; a yearly event on 1 June 2024 saves, on 31 December 1899 is refused.
- AC5 (R3). Given a yearly event on 29 February 2028, then in 2029 it falls on 28 February.
- AC6 (R11). Given the trip, then it shows all of 20 December; on 21 December it is gone, still kept.
- AC7 (R10). Given An adds "Xem phim", then Binh "Hẹn hò", both on 12 February 2027, then the anniversary, "Xem phim", "Hẹn hò" follow.
- AC8 (R4). Given 100 custom events, then adding one is refused.
- AC9 (R12, R13, R14). On Home, + opens the add sheet; deleting the trip asks first, then neither sees it.
- AC10 (R15). When An taps Binh's birthday, then nothing opens.
- AC11 (R7). Given An opened the trip, when Binh deletes it and An saves, then An is told it is gone.
- AC12 (R18). Given the example, then "Đi Nhật" shows only under "Xa hơn"; on 11 April 2027 it joins the 12 month list.
- AC13 (R9). Given a yearly event first dated 1 June 2027, then it shows no count that day and "(1 năm)" / "(1 year)" on 1 June 2028.
- AC14 (R4). Given 99 upcoming events and 20 past one-offs, then one more saves, the next is refused; a one-off's slot frees when its day ends.

## Glossary

- **Custom event** (sự kiện riêng), **once** (một lần), **every year** (hằng năm), **Later** (Xa hơn).

## Decided at Gate 1

- PO: R1, R5, R6, R10, R11, R15, R16; R2 without an upper limit; R12; R9 count as years since the first date ("(3 năm)" / "(3 years)"). R16 (no reminders) was later replaced by [notifications](notifications.md) R10.
- Orchestrator defaults, PO may veto: yearly past dates (R2), cap (R4), "Xa hơn" (R18).

## Out of scope

- A timeline, past one-off events; reminders are in [notifications](notifications.md).
- Leaving (see pairing); export and full deletion.

## Open questions

None.
