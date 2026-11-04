# ADR 0003: PWA instead of a native app

Status: accepted (November 2026)

## Context
Two users, one may use an iPhone and the other Android. The app is personal, iterates fast, and has no budget for store fees or review cycles.

## Decision
Ship one React + Vite PWA, installable from the browser on both platforms ("Add to Home Screen"). The service worker caches only the app shell; all data comes from `/api`. No push notifications in the MVP.

## Consequences
- One codebase, instant updates on deploy (`registerType: autoUpdate`).
- iOS limits: standalone mode has its own cookie jar and storage that iOS may evict, push needs extra setup, install is a manual Share menu step.
- No offline editing; the app needs a network for data.
- Camera and photo picking work through `<input type="file">`; HEIC handling relies on the browser.

## Alternatives rejected
- Native iOS (Swift): needs App Store or TestFlight distribution (paid developer account, review, build expiry), and the partner may use Android.
- React Native / Flutter: still needs store distribution and two build pipelines for a two person app.
- Plain website without install: no home screen icon or full screen app feel, which is the point of a daily ritual.
