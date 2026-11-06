# Upcoming events

## Purpose

A couple wants to see their coming dates, so neither forgets a birthday or an anniversary. It builds on [pairing](pairing.md) and its start date. Couples add their own plans as [custom events](custom-events.md).

## Actors

- **Partner**: a member of a couple.
- **Owner**: the partner whose birthday it is.
- **Outsider**: anyone else, unpaired people included.

## Business rules

Events

- R1. Only the two partners see their events; an outsider learns nothing about them.
- R2. With a start date, every yearly anniversary and every 1,000th day is an event ("4 year anniversary", "Day 2,000"); without one, there are none. The 100 day steps stay on the Home counter only ([pairing](pairing.md)).
- R3. Each partner's birthday is an event named with their display name ("An's birthday"); without a birthday, there is none.
- R4. Four holidays always appear, named by the holiday only: Valentine's Day (14 February), International Women's Day (8 March), Vietnamese Women's Day (20 October), International Men's Day (19 November).
- R5. A 29 February start date or birthday falls on 28 February in other years.
- R6. Each birthday shows the age reached ("An turns 29").
- R7. Events on one day are ordered: anniversary, 1,000th day, birthdays by display name, holidays.

Showing

- R8. Days count by each partner's own calendar day.
- R9. Each event shows its date and "today", "tomorrow" or "in X days".
- R10. An event stays, as today, until its day ends.
- R11. Home shows the next 3 events.
- R12. "See all" shows the events of the next 12 months, today included, in date order.

Birthday

- R13. Each person enters only their own birthday: day, month and year all required.
- R14. It must be a real date (29 February only in a leap year), from 1900 and not after today.
- R15. It may be entered before pairing and shows once paired.
- R16. The owner can change or remove it at any time.
- R17. The partner sees it only as an event in the list.
- R18. Bisou keeps it only for these events, while the account exists or until the owner removes it.

## Running example

An and Binh, together since 12 February 2023. An was born 18 November 1997; Binh was born 3 January 1996. Today is 5 November 2026, day 1363. Day 1,000 was 7 November 2025 and day 2,000 is 3 August 2028, so no 1,000th day falls in the next 12 months. The full list:

- 18 November 2026: An's birthday, An turns 29
- 19 November 2026: International Men's Day
- 3 January 2027: Binh's birthday, Binh turns 31
- 12 February 2027: 4 year anniversary
- 14 February 2027: Valentine's Day
- 8 March 2027: International Women's Day
- 20 October 2027: Vietnamese Women's Day

Home shows the first three. On 18 November: An's birthday today, Men's Day tomorrow, Binh's birthday in 46 days. On 19 November: Men's Day today, Binh's birthday, 4 year anniversary.

## Main flows

Glance at Home, open the full list, set one's own birthday; a wrong birthday is refused with a reason.

## Acceptance criteria

- AC1 (R1). Given An and Binh's events, then an outsider sees none.
- AC2 (R9, R11). Given 5 November 2026, then Home shows An's birthday in 13 days, Men's Day in 14 days, Binh's birthday in 59 days.
- AC3 (R12). When a partner opens "See all" that day, then the 7 example events show in date order.
- AC4 (R10). Given 18 November 2026, then An's birthday shows today all day; on 19 November it is gone.
- AC5 (R2). Given no start date, then only birthdays and holidays appear.
- AC6 (R4). Given any couple, then 8 March shows "International Women's Day" with no name.
- AC7 (R5). Given a 29 February birthday or start date, then in 2027 it falls on 28 February.
- AC8 (R6). Given Binh was born 3 January 1996, then 3 January 2027 shows "Binh turns 31".
- AC9 (R7). Given Binh's birthday were 12 February, then on 12 February 2027 the anniversary comes first.
- AC10 (R13, R14). Given An enters 31 April 1997, 29 February 1997, a date without a year, a future date or a date in 1899, then it is refused; 29 February 1996 saves.
- AC11 (R15). Given An entered a birthday before pairing, when Binh joins, then both see it.
- AC12 (R16, R17). Given Binh's birthday, then An cannot change it; when Binh removes it, neither sees it.
- AC13 (R2). Given 1 November 2025, then "See all" shows Day 1,000 on 7 November 2025 in 6 days and no Day 1,100; Home's counter still shows its own next milestone.

## Glossary

- **Upcoming events** (sự kiện sắp tới): the list.
- **Birthday** (sinh nhật): day, month and year of birth.
- **Holiday** (ngày lễ): one of the four days in R4.

## Out of scope

- Lunar events: Tet, Valentine on 7 July lunar.
- Reminders, past events, hiding a holiday, recording gender.
- Export and full deletion come with account deletion.

## Open questions

None.
