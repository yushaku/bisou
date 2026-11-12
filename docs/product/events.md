# Upcoming events

## Purpose

A couple wants to see their coming dates, so neither forgets a birthday or an anniversary. It builds on [pairing](pairing.md) and its start date. Couples add their own plans as [custom events](custom-events.md).

## Actors

- **Partner**: a member of a couple.
- **Owner**: the partner whose birthday it is.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): see our next dates at a glance and the whole next year in order, so that neither of us forgets a birthday, anniversary or holiday. AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC13
- US2 (partner): enter, change and remove my own birthday, so that my partner sees it as an event without my sharing it any other way. AC10, AC11, AC12

## Business rules

Events

- R1. Only the two partners see their events; an outsider learns nothing about them.
- R2. With a start date, every yearly anniversary and every 1,000th day is an event ("4 year anniversary", "Day 2,000"); without one, there are none. The 100 day steps stay on the days counter only ([pairing](pairing.md)).
- R3. Each partner's birthday is an event named with their display name ("An's birthday"); without a birthday, there is none.
- R4. Four holidays always appear, named by the holiday only: Valentine's Day (14 February), International Women's Day (8 March), Vietnamese Women's Day (20 October), International Men's Day (19 November).
- R5. A 29 February start date or birthday falls on 28 February in other years.
- R6. Each birthday shows the age reached ("An turns 29").
- R7. Events on one day are ordered: anniversary, 1,000th day, birthdays by display name, holidays.

Showing

- R8. Days count by each partner's own calendar day.
- R9. Each event shows its date and "today", "tomorrow" or "in X days".
- R10. An event stays, as today, until its day ends.
- R11. The next 3 events are shown first, at a glance.
- R12. The full list shows the events of the next 12 months, today included, in date order.

Birthday

- R13. Each person enters only their own birthday: day, month and year all required.
- R14. It must be a real date (29 February only in a leap year), from 1900 and not after today.
- R15. It may be entered before pairing and shows once paired.
- R16. The owner can change or remove it at any time.
- R17. The partner sees it only as an event in the list.
- R18. Bisou keeps it only for these events, while the account exists or until the owner removes it.

## Main flows and exceptions

- Flow for US1: a partner glances at the next 3 events, then opens the full list of the next 12 months.
- Flow for US2: a person enters or removes their own birthday. Exception: an impossible date, a date without a year, a future date or a date before 1900 is refused with a reason.

## Acceptance criteria

- AC1 (R1). Given A and B's events, then an outsider sees none.
- AC2 (R9, R11). Given today is 5 November 2026 and the events are A's birthday on 18 November, International Men's Day on 19 November and B's birthday on 3 January, then the glance shows them in 13, 14 and 59 days.
- AC3 (R12). Given that day, when a partner opens the full list, then the events of the next 12 months show in date order, here 7 events.
- AC4 (R10). Given 18 November 2026, then A's birthday shows as today all day; on 19 November it is gone.
- AC5 (R2). Given no start date, then only birthdays and holidays appear.
- AC6 (R4). Given any couple, then 8 March shows "International Women's Day" with no name.
- AC7 (R5). Given a 29 February birthday or start date, then in 2027 it falls on 28 February.
- AC8 (R6). Given B was born 3 January 1996, then 3 January 2027 shows "B turns 31".
- AC9 (R7). Given B's birthday is on the anniversary day, then the anniversary comes first.
- AC10 (R13, R14). Given A enters 31 April 1997, 29 February 1997, a date without a year, a future date or a date in 1899, then it is refused; 29 February 1996 saves.
- AC11 (R15). Given A entered a birthday before pairing, when B joins, then both see it.
- AC12 (R16, R17). Given B's birthday, then A cannot change it; when B removes it, neither sees it.
- AC13 (R2). Given 1 November 2025 and a 1,000th day on 7 November 2025, then the full list shows that day in 6 days and no 1,100th day; the days counter still shows its own next milestone.

## Glossary

- **Upcoming events** (sự kiện sắp tới): the list.
- **Birthday** (sinh nhật): day, month and year of birth.
- **Holiday** (ngày lễ): one of the four days in R4.

## Out of scope

- Lunar events: Tet, Valentine on 7 July lunar.
- Past events, hiding a holiday, recording gender; reminders are in [notifications](notifications.md).
- Export and full deletion come with account deletion.

## Open questions

None.

Retired: none
