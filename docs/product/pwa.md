# Installed app

## Decided at Gate 1

- Splash: the felt heart logo on the linen background, light or dark, instead of a white flash.
- Install guide: a small card on Home in a browser tab only; 3 steps on iPhone Safari, the browser's own prompt on Android; closing it hides it for good on that device.
- New deploy: unchanged; the app reloads itself at once. The PO accepts that an unsaved draft can be lost.
- Offline: one offline toast for every tab; loaded data stays visible; saving needs a connection, nothing is queued.
- Errors: a friendly screen with a Reload button instead of a white page.
- Status bar: follows the chosen theme.
- Android shortcuts: Write in the journal, Spin.
- Out: offline writes, update prompt; push notifications are in [notifications](notifications.md).

## Purpose

A couple opens Bisou from the home screen many times a day. It should open, look and fail like an app, not a web page. It covers every screen; visuals follow [DESIGN.md](../../DESIGN.md).

## Actors

- **Partner**: a member of a couple, or anyone signed in.
- **Installed app**: Bisou opened from its home screen icon.
- **Browser tab**: Bisou opened in a browser, not installed.

## Business rules

Opening

- R1. Opening the installed app on iPhone shows the felt heart logo on the linen background, light or dark following the phone's mode, never a white flash.
- R2. The iPhone status bar and the browser bar take the colour of the theme the person chose.
- R3. On Android, a long press on the icon offers two shortcuts: Write in the journal and Spin.

Install guide

- R4. Home shows a small install card only in a browser tab; the installed app never shows it.
- R5. On iPhone Safari the card shows 3 steps: Share, Add to Home Screen, Add.
- R6. On Android the card shows an install button that opens the browser's own install prompt, only when the browser offers one.
- R7. A close button hides the card for good on that device.

Updates

- R8. When a new version takes over, the app reloads itself at once, with no prompt; an unsaved draft can be lost.

Offline

- R9. Without a connection, one offline toast shows at the top of every tab and stays while offline: a title, a line saying loaded data is still here, Retry (reloads once the connection is back) and close; a newer toast can temporarily replace it, and it goes away when the connection returns.
- R10. Home and Wishes keep showing data already loaded.
- R11. While offline, save buttons say plainly that they need a connection; nothing is saved later on its own.

Errors

- R12. An unexpected screen error shows a friendly screen with a Reload button, never a white page.

## Running example

An uses an iPhone in dark mode with a light Bisou theme; Binh uses Android. Both first open Bisou in a browser tab, then install it.

## Main flows

Open Bisou in a tab, follow the card to install, open from the icon, use it on a train without signal, get a new version.

## Acceptance criteria

- AC1 (R1). Given An's iPhone is in dark mode, when An opens the installed app, then the dark linen splash with the felt heart shows and no white frame appears; in light mode the splash is light.
- AC2 (R2). Given An chose a light theme, then the status bar and browser bar match it; when An switches theme, they follow.
- AC3 (R3). Given Binh installed Bisou, when Binh long presses the icon, then Write in the journal and Spin show; Write in the journal opens the journal composer, Spin opens the wish jar spin.
- AC4 (R4, R5). Given An opens Bisou in Safari, then Home shows the card with Share, Add to Home Screen, Add; other tabs do not show it.
- AC5 (R4, R6). Given Binh opens Bisou in Chrome and Chrome offers install, when Binh taps the button, then Chrome's own install prompt opens; if Chrome offers none, no button shows.
- AC6 (R7). Given An closes the card, when An reloads or comes back days later in Safari on that iPhone, then it stays hidden; on another device it shows again.
- AC7 (R4). Given An opens the installed app, then the card never shows.
- AC8 (R8). Given Binh has the app open and a new version is deployed, when it takes over, then the app reloads at once without asking.
- AC9 (R9). Given An loses signal, then one offline toast shows on Home, Journal and Wishes alike; when signal returns, it goes away.
- AC10 (R10). Given An loaded Home and Wishes before losing signal, then both still show their data offline.
- AC11 (R11). Given An is offline, when An tries to save a journal entry or a wish, then the save button says it needs a connection and nothing is sent later on its own.
- AC12 (R12). Given a screen fails unexpectedly, then Binh sees a friendly screen with a Reload button; tapping it reloads the app.

## Glossary

- **Installed app** (ứng dụng đã cài): Bisou added to the home screen.
- **Install card** (thẻ hướng dẫn cài): the card in R4 to R7.
- **Offline toast** (thông báo ngoại tuyến): the toast in R9.

## Out of scope

- Push notifications are in [notifications](notifications.md).
- Offline writes and a queue of pending saves.
- An update prompt before reloading.

## Open questions

None.
