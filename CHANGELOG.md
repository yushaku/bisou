# Changelog

## [Unreleased]

### Added

- Home shows your jar and your partner's jar: yours fills up as you add wishes, your partner's only shows empty or filled, and tapping it opens the spin.

### Changed

- Money fields group digits as you type (500.000) and start at 0; a wish price of 0 means no price yet.

## [2026-11-06]

### Added

- When your partner's jar holds no open wish, the jar card says so and spinning is off; it never shows how many wishes there are.
- Set, replace or remove your profile photo in Settings; only you and your partner can see it.
- Add shared one-off or yearly events from Home, edit or delete them together, and see distant plans under Later.
- The + in the tab bar adds an event on Home, an entry on Journal and a wish on Wishes.
- See the next 3 events on Home and the next 12 months under See all: anniversaries, every 1,000th day, both birthdays and four holidays.
- Add, change or remove your own birthday in Settings; your partner sees it only as an event.

### Changed

- The top bar shows each tab's name (Our little corner, Our journal, Wishes) instead of Bisou, and the screens drop their own heading.
- The active tab's highlight fills more of its tab, and Garden no longer shows a Soon label.
- Wishes has two sections, My jar and My claims, under your partner's jar; My jar lists open and received wishes together with an icon filter (All, Wishing, Received), and the received day sits inside the card.
- Wish options open as a bottom sheet; received claims show a check badge.
- Settings groups style, light or dark, the palette for the current mode and the background in one Appearance sheet; language is a dropdown.

### Fixed

- Appearance opens as its own page; on iPhone the tall sheet closed on a tap instead of applying the choice.
- Back from Appearance returns to Settings with focus on the Appearance row.
- Screen readers announce the panel each Wishes tab controls.
- Deleting a wish moves focus to the confirm button.
- Event JSON requests are limited to 16 KB.
- Event and wish titles refuse control characters, text direction overrides and titles made only of invisible characters.
- Switching sections in Wishes shows the loaded lists at once instead of a loading state.
- Profile JSON requests are limited to 16 KB.

## [2026-11-05]

### Added

- Keep a private wish jar with optional photos, spin your partner's jar within a budget, and secretly claim a wish.
- Mark a wish received to keep a shared journal memory with a note and up to four photos.
- Open the shared journal from Home: entries grouped by day, newest first, with older days loading as you scroll.
- Write up to 2000 characters and add up to 4 photos per entry, each cropped to a square by the author before upload.
- Edit or permanently delete your own entries and their photos; both partners can read them.
- Store journal photos in private R2; deployment requires the bucket binding and CI token permissions described in [README](README.md#deploy).
- Pair with your partner using an invite code or link.
- See your days together and the next milestone from your shared start date.
- Bisou visual design with peach and cocoa themes.
- Sign in with an emailed 6 digit code.

### Fixed

- Save received-wish memories in the language shown in the app, and refuse new claims when a wish's price has been removed.
- Keep a deleted-wish notice until the claimer has seen it, expire unread notices after 30 days, and remove received claims silently when their wish is deleted.
- Show a loading state for received wishes and a full-width square photo in spin results.
- Remove private JPEG metadata and refuse metadata between scans or appended images; journal JSON requests are limited to 16 KB.
- A partner's browser may show a deleted photo from its cache for up to one day, then stops once it refreshes.

### Changed

- Restore each tab's scroll position and loaded journal pages while switching tabs.
- Swipe horizontally through photos in the viewer.
- Show journal text before its photos.
- Display names can be changed but can no longer be cleared.
- A name is required before pairing.
- App updates load without reinstalling or manually restarting the app.
