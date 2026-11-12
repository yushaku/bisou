# Custom events

## Purpose

A couple adds their own plans to the [upcoming events](events.md) list.

## Actors

- **Partner**: a member of a couple.
- **Outsider**: anyone else.

## User stories

- US1 (partner): add our own plan with a date, repeat and icon, so that it appears among our coming dates. AC3, AC4, AC5, AC8, AC13, AC14
- US2 (partner): change or delete any custom event, so that the list stays true for both of us. AC1, AC9, AC10, AC11
- US3 (partner): see custom events in their place among all events, so that one list tells us everything coming. AC2, AC6, AC7, AC12

## Business rules

Event

- R1. A custom event has a title of 1 to 60 characters (outer spaces ignored), a date, a repeat (once or every year) and one of 8 icons: heart, plane, music, dinner, gift, cake, family, star.
- R2. The date must be real: today or later for a one-off, counting today until it has ended everywhere, with no upper limit; from 1900 for a yearly event's first date. It is checked only when set or changed.
- R3. A yearly event repeats on its day and month; 29 February falls on 28 February in other years.
- R4. A couple keeps at most 100 upcoming custom events (yearly, or one-off from today); past one-offs do not count.

Sharing

- R5. Both partners see, change and delete every custom event; an outsider learns nothing.
- R6. Nothing shows who added or changed an event.
- R7. The last save wins; saving an event the other partner deleted is refused.

Showing

- R8. Custom events follow the list rules of [events](events.md) R8 to R12.
- R9. A custom event shows its title as typed and its icon; a yearly event adds its years since the first date, as anniversaries do ("(3 years)", "(1 year)" one year on), except on the first date.
- R10. On one day, custom events follow the computed ones ([events](events.md) R7), earliest added first.
- R11. A one-off event leaves the list when its day ends; Bisou keeps it for a future timeline.
- R18. The full list ends with a group "Later": custom events whose next date is beyond the 12 months, by date; it has no computed events and the glance is unchanged.

Adding and changing

- R12. A partner adds an event directly from the glance of upcoming events; journal entries and wishes are added from their own places.
- R13. A partner can open a custom event to change or delete it.
- R14. Deleting asks first and tells both will no longer see the event; it cannot be undone.
- R15. Computed events cannot be opened; birthdays change in the person's own settings.

Personal data

- R17. Custom events are the couple's shared data, kept only to show them, until the couple ends or a partner deletes them.

## Main flows and exceptions

- Flow for US1: a partner adds a title, date, repeat and icon; both see it in its place in the list. Exceptions: a title over 60 characters, only spaces, no icon, a past one-off date or the 101st upcoming event is refused with a reason and nothing is saved.
- Flow for US2: a partner opens an event, changes it or deletes it after confirming; the last save wins. Exception: saving an event the other partner deleted tells the saver it is gone.
- Flow for US3: custom events show among the 12 month list, and later ones under "Later".

## Acceptance criteria

- AC1 (R5, R6). Given B's trip, then A can change and delete it; no author shows; an outsider sees nothing.
- AC2 (R8, R10, R18). Given the couple's events and custom events, then the glance and the full list show them in date order with custom events after computed ones on the same day, and those beyond 12 months under "Later".
- AC3 (R1). Given 61 characters, only spaces or no icon, then it is refused; outer spaces are trimmed.
- AC4 (R2). Given 6 November 2026, then a one-off on 5 or 31 November 2026 is refused, on 6 November 2026 or 7 November 2031 saves; a yearly event on 1 June 2024 saves, on 31 December 1899 is refused.
- AC5 (R3). Given a yearly event on 29 February 2028, then in 2029 it falls on 28 February.
- AC6 (R11). Given a one-off on 20 December, then it shows all of that day; the next day it is gone from the list, still kept.
- AC7 (R10). Given A adds "Movie" then B "Date", both on the anniversary day, then the anniversary, "Movie", "Date" follow in that order.
- AC8 (R4). Given 100 upcoming custom events, then adding one is refused.
- AC9 (R12, R13, R14). Given a partner adds an event from the glance, then it appears; deleting an event asks first, then neither sees it.
- AC10 (R15). When A opens B's birthday in the list, then nothing opens to change.
- AC11 (R7). Given A opened an event, when B deletes it and A saves, then A is told it is gone.
- AC12 (R18). Given a one-off in 2028 seen on 6 November 2026, then it shows only under "Later"; once it falls within 12 months it joins the main list.
- AC13 (R9). Given a yearly event first dated 1 June 2027, then it shows no count that day and "(1 year)" on 1 June 2028.
- AC14 (R4). Given 99 upcoming events and 20 past one-offs, then one more saves, the next is refused; a one-off's slot frees when its day ends.

## Glossary

- **Custom event** (sự kiện riêng), **once** (một lần), **every year** (hằng năm), **Later** (Xa hơn).

## Out of scope

- A timeline, past one-off events; reminders are in [notifications](notifications.md).
- Leaving (see [pairing](pairing.md)); export and full deletion.

## Open questions

None.

Retired: R16
