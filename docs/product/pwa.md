# Installed app

## Purpose

A couple opens Bisou from the home screen many times a day. It should open, look and fail like an app, not a web page. It covers every part of Bisou; visuals follow [DESIGN.md](../../DESIGN.md).

## Actors

- **Partner**: a member of a couple, or anyone signed in.
- **Installed app**: Bisou opened from its home screen icon.
- **Browser tab**: Bisou opened in a browser, not installed.

## User stories

- US1 (partner): open Bisou from the home screen without a white flash and with the theme I chose, so that it feels like an app. AC1, AC2, AC3
- US2 (partner): be shown how to install Bisou when I use it in a browser, so that I can put it on my home screen. AC4, AC5, AC6, AC7
- US3 (partner): keep reading what I already loaded when the connection drops, so that a bad signal does not lose my place. AC9, AC10, AC11
- US4 (partner): get new versions and recover from errors without fuss, so that the app never leaves me on a broken page. AC8, AC12

## Business rules

Opening

- R1. Opening the installed app shows the felt heart logo on the linen background, light or dark following the device's mode, never a white flash, on devices that support a splash.
- R2. The status bar and the browser bar take the colour of the theme the person chose.
- R3. Where the device supports app shortcuts, a long press on the icon offers two: write in the journal and spin.

Install guide

- R4. A small install card shows only in a browser tab, never in the installed app, and only when a way to install exists (R5, R6).
- R5. Where the browser has no install prompt of its own, the card shows the steps to add Bisou to the home screen by hand.
- R6. Where the browser offers its own install prompt, the card shows an install action that opens it; when the browser offers none, there is no such action.
- R7. A close action hides the card for good on that device.

Updates

- R8. When a new version takes over, the app reloads itself at once, with no prompt; an unsaved draft can be lost.

Offline

- R9. Without a connection, one offline notice shows on every tab and stays while offline: a title, a line saying loaded data is still here, a retry that reloads once the connection is back, and a close action; a newer notice can temporarily replace it, and it goes away when the connection returns.
- R10. Data already loaded keeps showing while offline.
- R11. While offline, save actions say plainly that they need a connection; nothing is saved later on its own.

Errors

- R12. An unexpected failure shows a friendly message with a way to reload, never a blank page.

## Main flows and exceptions

- Flow for US2: a partner opens Bisou in a browser, follows the install card, then opens it from the icon.
- Flow for US3: a partner loses signal, keeps reading what is loaded, and sees the offline notice. Exception: saving is refused with a message that a connection is needed, and nothing is queued.
- Flow for US4: a new version is deployed and the app reloads itself; an unexpected failure shows the friendly message.

## Acceptance criteria

- AC1 (R1). Given the device is in dark mode, when A opens the installed app, then the dark linen splash with the felt heart shows and no white frame appears; in light mode the splash is light.
- AC2 (R2). Given A chose a light theme, then the status bar and browser bar match it; when A switches theme, they follow.
- AC3 (R3). Given B installed Bisou on a device that supports shortcuts, when B long presses the icon, then "write in the journal" and "spin" show; the first opens the journal composer, the second the wish jar spin.
- AC4 (R4, R5). Given A opens Bisou in a browser with no install prompt of its own, then the install card shows the steps to add it by hand; other tabs do not show it.
- AC5 (R4, R6). Given B opens Bisou in a browser that offers install, when B uses the install action, then the browser's own prompt opens; if the browser offers none, no action shows.
- AC6 (R7). Given A closes the card, when A reloads or comes back days later on that device, then it stays hidden; on another device it shows again.
- AC7 (R4). Given A opens the installed app, then the card never shows.
- AC8 (R8). Given B has the app open and a new version is deployed, when it takes over, then the app reloads at once without asking.
- AC9 (R9). Given A loses signal, then one offline notice shows on every tab alike; when signal returns, it goes away.
- AC10 (R10). Given A loaded data before losing signal, then it still shows offline.
- AC11 (R11). Given A is offline, when A tries to save a journal entry or a wish, then the save action says it needs a connection and nothing is sent later on its own.
- AC12 (R12). Given the app fails unexpectedly, then B sees a friendly message with a way to reload, and using it reloads the app.

## Glossary

- **Installed app** (ứng dụng đã cài): Bisou added to the home screen.
- **Install card** (thẻ hướng dẫn cài): the card in R4 to R7.
- **Offline notice** (thông báo ngoại tuyến): the notice in R9.

## Out of scope

- Push notifications are in [notifications](notifications.md).
- Offline writes and a queue of pending saves.
- An update prompt before reloading.

## Open questions

None.

Retired: none
