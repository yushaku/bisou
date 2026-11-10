# Changelog

## [Unreleased]

### Added

- Choose a Garden starting status together, opening questions through that status: five relationship statuses and 35 new Vietnamese/English questions alongside the original 60 cards.
- Answer decision questions with text, a neutral choice or a deferred/not-applicable choice; both responses reveal only after both submit, with editing and deletion controlled by each author.
- Open a mutually chosen later stage immediately; skip irrelevant stages or stay where you are, keeping discussion questions, ordinary daily play and plants independent of progression.
- The Garden tab draws one question card a day for both of you, from 6 decks of 10 cards (Memories, Dreams, Money, When we disagree, Both families, Everyday us). Each of you answers privately, and both answers show side by side only once both of you have answered.
- Whoever answers first sees the card face down with "waiting for your partner"; the app never says who is late.
- Swap today's card while neither of you has answered it; once one of you has answered, the card stays.
- Edit or delete your own answer at any time; an answer changed after the flip shows an "edited" mark to both of you.
- Each deck is a plant in a shared garden. It grows one size on each day one of its cards is flipped and never shrinks. The garden turns dry after a few days without a daily card and wilts after about two weeks, but nothing dies. No numbers, streaks or scores.
- Tap a plant to play more cards from its deck. A card left waiting when the day turns stays in its deck until the other answers it.
- When both of you have answered today's card, both get a notification through the partner journal switch. Nothing is sent during quiet hours.

### Changed

- Put today's card first on Home with named turns and a one-time flip that stays face up; stage choices now open immediately together, with optional discussion chips, shared banners, a one-time celebration and replacement answers after deletion.

- Local `pnpm dev` now seeds one clean couple, `an@example.com` and `binh@example.com`, placed at In love with no answers, history or plants, instead of four synthetic scenario couples.
- Today's question now appears on Home instead of the Garden tab; the Garden keeps levels and plants.
- Home now shows "Bài viết hôm nay" / "Today's posts": only journal entries dated today, and no section when there are none.
- The two wish jars now sit at the top of the Wishes tab instead of on Home; my jar still opens my list and my partner's jar starts a spin.
- When one partner answers today's question, the other partner gets "Người ấy vừa trả lời thẻ hôm nay" / "Your partner answered today's card" instead of both being notified only after both answered.
- The Today's card on Home is now a soft paper note: a stitched frame, a centered question, folded notes for the two answers, and clearer writing, waiting and flip states.

## [2026-11-07]

### Added

- Opt in to notifications for each device in Settings > Notifications: get a partner's new journal entry and event reminders at 20:00 the day before and 08:00 on the event day, Vietnam time.
- Quiet hours run from 22:00 to 07:00; journal entries from the night are combined into a notification at 07:00.
- Home invites you to turn on notifications in the installed app.
- Signing out stops notifications on that device.
- Notifications never mention wishes, spins or claims, and never show journal text.
- If the browser hides its permission prompt, Settings explains how to allow notifications from the address bar.
- Tap a journal entry or a wish in My jar to read it in full in a sheet; a back-filled entry's "written on" line moved there from the card.

## [2026-11-06]

### Added

- Opening the installed app on iPhone shows the felt heart on linen, light or dark, instead of a white flash.
- In a browser tab, Home shows a small card on how to install Bisou: 3 steps on iPhone Safari, an install button on Android below the jars; closing it hides it for good on that device.
- On Android, a long press on the app icon offers Write in the journal and Spin.
- Without a connection, one offline bar shows under the top bar on every tab and loaded data stays visible.
- An unexpected error shows a friendly screen with a Reload button instead of a white page.
- Home shows your jar and your partner's jar: yours fills up as you add wishes, your partner's only shows empty or filled, and tapping it opens the spin.
- When your partner's jar holds no open wish, the jar card says so and spinning is off; it never shows how many wishes there are.
- Set, replace or remove your profile photo in Settings; only you and your partner can see it.
- Add shared one-off or yearly events from Home, edit or delete them together, and see distant plans under Later.
- The + in the tab bar adds an event on Home, an entry on Journal and a wish on Wishes.
- See the next 3 events on Home and the next 12 months under See all: anniversaries, every 1,000th day, both birthdays and four holidays.
- Add, change or remove your own birthday in Settings; your partner sees it only as an event.

### Changed

- While offline, save and delete buttons say they need a connection; nothing is saved later on its own.
- The browser bar follows the chosen theme, and the saved theme applies before the first paint.
- A person without a display name shows the start of their email, or "Người ấy" for the partner, instead of "?".
- Money fields group digits as you type (500.000) and start at 0; a wish price of 0 means no price yet.
- The top bar shows each tab's name (Our little corner, Our journal, Wishes) instead of Bisou, and the screens drop their own heading.
- The active tab's highlight fills more of its tab, and Garden no longer shows a Soon label.
- Wishes has two sections, My jar and My claims, under your partner's jar; My jar lists open and received wishes together with an icon filter (All, Wishing, Received), and the received day sits inside the card.
- Wish options open as a bottom sheet; received claims show a check badge.
- Settings groups style, light or dark, the palette for the current mode and the background in one Appearance sheet; language is a dropdown.

### Fixed

- Pasting an amount with decimals (500.000,50) keeps only the whole number, and the caret stays put when you delete at the start of a money field.
- A wait of exactly one hour before the next profile photo change reads "1 hour" instead of "60 minutes".
- Photos with an oversized color profile are refused, and profile photo uploads left unfinished for a day are cleaned up.
- On iPhone, writing in a sheet no longer pushes the form above the screen when the keyboard opens.
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
