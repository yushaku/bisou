# Pairing and days together

## Purpose

Bisou is private to exactly two partners. Their two accounts must first become one couple; then both want to see how long they have been together and the next milestone. One partner usually invites the other, often hours apart.

## Actors

- **Partner**: a signed in person; either may invite (inviter) or join (invitee), and once paired both have the same rights.
- **Outsider**: any other signed in person.

## User stories

- US1 (inviter): invite my partner with a code or link that stays valid for a day, so that we can become a couple even when we are hours apart. AC3, AC6
- US2 (invitee): join my partner's couple with their code or link, so that our two accounts become one couple. AC1, AC4, AC5, AC7, AC8, AC9
- US3 (partner): set the day we started and see our days together and next milestone, so that we celebrate what matters. AC10, AC11, AC12, AC13, AC14
- US4 (person): choose my display name and keep my email and couple private from others, so that my partner knows who I am and nobody else learns anything. AC2, AC15

## Business rules

- R1. A person belongs to at most one couple, and a couple has at most two people.
- R2. Once paired, neither partner can leave, unpair or join another couple.
- R3. Only its members can see a couple; an outsider learns nothing about it.
- R4. Right after the first sign in, before anything else (pairing included), a person must choose a display name of 1 to 40 characters (outer spaces ignored); they can change it at any time but never clear it.
- R5. The partner sees the display name, never the email.
- R6. An invite code has 6 characters from letters and digits that cannot be confused (no 0, O, 1, I, L).
- R7. Case, spaces and dashes in a typed code do not matter.
- R8. A code is valid for 24 hours from when it is made, and never after.
- R9. A code works for one join only.
- R10. The inviter cannot cancel a code and gets a new one only after it has expired.
- R11. The invite can be shared as a link that carries the code.
- R12. A person cannot join with their own code.
- R13. A person waiting on their own code may join the partner's code instead; their own code then stops working.
- R14. At most 10 wrong join attempts per person in any rolling hour; beyond that every attempt is refused, even the right code, until the oldest wrong attempt is an hour old. An own code or input not shaped like a code does not count.
- R15. Either partner may set the start date, also while still waiting for the other, and change it at any time; the latest change wins for both.
- R16. The start date cannot be after today in the earliest time zone, nor before 1 January 1900.
- R17. The start date is day 1 of the days together.
- R18. The next milestone is the next multiple of 100 days or the next yearly anniversary, whichever comes first; on the same day, the anniversary is shown.
- R19. A milestone that falls today is announced as today; the next day, the following one is shown.
- R20. For a 29 February start date, the anniversary falls on 28 February in other years.
- R21. Bisou keeps only the email (to sign in), the display name (so the partner knows who they are with), the optional birthday ([events](events.md)) and the optional profile photo ([avatar](avatar.md)), for as long as the account exists.

## Main flows and exceptions

- Flow for US1: a new person chooses a name, gets a code and shares it as a link or text. If nobody uses it within 24 hours, a new code is offered; until then no new code is given.
- Flow for US2: the invitee signs in, chooses a name, enters the code or opens the link, and both see they are a couple. Exceptions: an expired, used, own or malformed code is refused with a reason; after 10 wrong attempts in an hour every attempt is refused until the wait ends; a person already in a couple cannot join.
- Flow for US3: either partner sets or changes the start date, also while waiting; both then see the days together and the next milestone. Exception: a date after today in the earliest time zone or before 1900 is refused.

## Acceptance criteria

- AC1 (R1, R2). Given A and B are a couple, when either joins another code, then it is refused and nothing changes.
- AC2 (R4). Given a new person, when the name is empty or over 40 characters, then they cannot continue; later A can rename but not clear it.
- AC3 (R6, R8). Given A makes a code at 20:00 on a day, then it has 6 characters without look-alikes and works until just before 20:00 the next day.
- AC4 (R7, R11). Given code R3XHWD, when B types "r3x-hwd" or opens the link, then the join succeeds.
- AC5 (R9, R1). Given B joined with a code, when a third person enters it, then it is refused.
- AC6 (R10). Given A's code is valid, when A asks for a new one, then it is refused; once expired, a new code is given and the old one is refused.
- AC7 (R12). Given A made a code, when A enters it, then A is told it is their own code and it is not counted.
- AC8 (R13). Given both made codes, when B joins A's code, then they are a couple and B's code works for nobody.
- AC9 (R14). Given B made 10 wrong attempts from 08:00, when B enters the right code at 08:15, then it is refused with a 45 minute wait; just after 09:00 it succeeds; others are not affected.
- AC10 (R15). Given waiting A set 14 February 2023, when B joins and sets 12 February 2023, then both see 12 February 2023.
- AC11 (R16). Given today is 5 November 2026 everywhere, when a partner picks 6 November 2026 or 31 December 1899, then it is refused.
- AC12 (R17, R18). Given a start date of 12 February 2023 and today 5 November 2026, then the counter shows 1363 days and the next milestone is day 1400 on 12 December 2026, 37 days left.
- AC13 (R18, R19). Given the same start date and today 12 February 2026, then the milestone is announced as today, the 3 year anniversary.
- AC14 (R20). Given start date 29 February 2024 and today 20 February 2025, then the next milestone is the 1 year anniversary on 28 February 2025.
- AC15 (R3, R5). Given A and B are a couple, then an outsider sees no couple, and B sees A's name, not A's email.

## Glossary

- **Couple** (đôi): the two paired partners.
- **Invite code** (mã ghép đôi) and **invite link** (lời mời): what one partner sends the other.
- **Your partner** (người ấy): how Bisou names the other person.
- **Start date** (ngày bắt đầu yêu): the first day together.
- **Days together** (ngày bên nhau): start date to today, both included.
- **Milestone** (cột mốc): every 100th day, or a yearly anniversary (kỷ niệm).

## Out of scope

- Leaving or dissolving a couple: required before the app opens to anyone beyond the two partners.
- Deleting an account or exporting its data: required before anyone beyond the two partners uses the app.
- More than two members; switching partner; cancelling an invite.
- Past milestones; reminders for anniversaries and every 1,000th day are in [notifications](notifications.md), other milestone reminders are out.
- Profile photos are covered in [avatar](avatar.md).

## Open questions

None.

Retired: none
