# Mascot

## Purpose

Empty, waiting, error and celebration moments in Bisou can feel cold. A mascot, a friendly girl or boy, adds warmth without adding words or work, and each person picks the one they like.

## Actors

- **Partner**: a signed-in person, who picks a mascot for their own device.

## User stories

- US1 (partner): pick the mascot I like, so that Bisou feels like mine. AC1, AC2
- US2 (partner): see the mascot in empty, waiting, error and celebration moments, so that those moments feel warm while the text still tells me what to do. AC3, AC4

## Business rules

- R1. The mascot choice belongs to the device: it survives signing out, another device keeps its own choice, a missing or unknown choice means the girl, and if the choice cannot be kept it holds for the current session only.
- R2. A person picks the girl or the boy from a compact labelled choice in Vietnamese and English, and the choice shows at once everywhere a mascot is visible.
- R3. The illustration shows in shared empty states, in load failures and in full-view initial waiting; waits that show only placeholder rows keep their current look.
- R4. The celebration illustration shows at celebration moments, including when the next hundred-day multiple or anniversary is today on Home and after a successful gift unlock of a paid card box ([card-box-unlock](card-box-unlock.md) R80); a failed or pending unlock does not celebrate.
- R5. An illustration is decoration only: it carries no text and never replaces the text or actions that carry the meaning.
- R7. A mascot has one illustration for each of four situations: empty, waiting, error and celebration; every mascot has all four.

## Main flows and exceptions

- Flow for US1: the person opens the settings, picks a mascot and sees every visible illustration change at once; with no choice yet they see the girl.
- Flow for US2: an empty list, a failed load or a first load shows the illustration with its usual text and action; milestone days and the gift unlock show the celebration illustration.

## Acceptance criteria

- AC1 (R1, R2). Given a fresh device or an unknown stored choice, then the girl shows; when the person picks the boy, then it shows at once, survives signing out on that device, and another device keeps its own choice.
- AC2 (R2). Given the settings, then the choice is labelled in the person's language and picking one changes the visible illustrations at once, with no connection needed.
- AC3 (R3, R5, R7). Given every mascot, then each has all four situations; given an empty, waiting or failed state, then the illustration shows alongside the same text and actions as without it.
- AC4 (R4). Given a hundred-day or anniversary day, then Home shows the celebration illustration, and the adjacent ordinary days do not; given a successful gift unlock, then it celebrates, and a failed one does not.

## Glossary

- **Mascot** (linh vật): the girl or the boy; **situation** (tình huống): empty, waiting, error or celebration.

## Out of scope

- Mascots chosen for the couple or shared between devices; animated or talking mascots; more mascots than the girl and the boy.

## Open questions

None.

Retired: R6, AC5
