# Changelog

## [Unreleased]

### Added

- Add shared one-off or yearly events from Home, edit or delete them together, and see distant plans under Later.

- Keep a private wish jar with optional photos, spin your partner's jar within a budget, and secretly claim a wish.
- Mark a wish received to keep a shared journal memory with a note and up to four photos.
- Open the shared journal from Home: entries grouped by day, newest first, with older days loading as you scroll.
- Write up to 2000 characters and add up to 4 photos per entry, each cropped to a square by the author before upload.
- Edit or permanently delete your own entries and their photos; both partners can read them.
- Store journal photos in private R2; deployment requires the bucket binding and CI token permissions described in [README](README.md#deploy).

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

## [2026-11-05]

### Changed

- App updates load without reinstalling or manually restarting the app.

### Added

- Pair with your partner using an invite code or link.
- See your days together and the next milestone from your shared start date.
- Bisou visual design with peach and cocoa themes.
- Sign in with an emailed 6 digit code.
