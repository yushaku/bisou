# ADR 0014: Persist server data on the device

Status: accepted (November 2026). Supersedes the "keep private data in memory, not persisted" part of [ADR 0013](0013-server-state-with-tanstack-query.md).

## Context
A cold start of the installed iPhone app showed a loading screen through three serial round trips (`/api/me`, then `/api/couple`, then the lazy Home chunk, then Home's own queries). The query cache lived in memory only, so every launch started empty. `index.html` had an empty `#root`, so nothing painted before JavaScript ran. A new deploy also made the first open boot twice: the new service worker took control and the page reloaded itself.

## Decision
- Persist the TanStack Query cache with `persistQueryClient` and an async persister backed by IndexedDB (`lib/deviceStore.ts`, a small hand-written get/set/delete store; no `localStorage`, no extra dependency beyond the two TanStack persist packages). One stored copy per user and couple, keyed like `ServerDataProvider` (`rq:<userId>:<coupleId|unpaired>`). Opening another scope deletes the other copies.
- Persist the last known `{user, couple}` as a boot record. A returning user renders Home from it at once, while `/api/me` and `/api/couple` revalidate in the background.
- Remove everything on sign-out, on a 401 from `/api/me` or `/api/couple` (or from any query), and when `/api/me` returns a different user than the stored one. That removes the query copy, the boot record and the existing card-box cache (`clearCardBoxCache`). A write handle taken before the wipe stops writing, so a throttled save cannot bring the data back.
- Offline (status 0) or a server error with a stored session keeps the cached Home; it does not sign out. Without a stored session, offline still shows Login.
- Cache buster: the build id (`__BISOU_BUILD__`: package version, commit and build time, set in `vite.config.ts`). A deploy discards data saved by an older build. Maximum age is 30 days. Failed queries are not persisted. The journal infinite query keeps only its first page.
- `staleTime` and refetch rules from ADR 0013 are unchanged, so restored data revalidates on mount and when the app returns to the front.
- Boot runs in parallel from `main.tsx`: the device read, `/api/me`, `/api/couple` and `import("./screens/Home")` start together. `/api/couple` is a separate request rather than embedded in `/api/me`: `/api/me` stays a small, compatible response and the two requests overlap. When a stored session exists, React mounts after the device read and the Home chunk are ready, and Home renders as a plain component instead of through `React.lazy`, which would suspend once more and hold Home back about 300 ms behind a fallback.
- `/api/me` reads the couple in the session query (a subquery), so it is one D1 round trip instead of two. The response shape is unchanged.
- `index.html` paints a static skeleton in `#root` (the app icon on the theme background), replaced by React. The loading screen mascot is loaded eagerly.
- Service worker: a new version no longer reloads a visible app. The page reloads when it is hidden, or at once if the old code asks for a lazy chunk the new deploy removed. The update check on returning to the front runs at most once an hour.

## Consequences
- Private data (journal, notes, wishes, garden answers) now stays on the phone after the app closes until sign-out. It is protected only by the device, like the existing card-box cache. A shared or lost unlocked device exposes the last viewed data. This is an accepted trade-off for an instant start.
- A deploy that changes data shapes cannot show old shapes: the first launch after it waits for the network once.
- IndexedDB can be unavailable or slow (private mode, a Safari open that hangs): the open gives up after 1.5 s and the app behaves as before, with no cache.
- Data changed on another device shows briefly stale on launch, then updates when the background request returns. Home's data is at most as old as the last foreground use.
- A pending update stays unapplied while the app stays visible, so a long session can run the previous version until it is hidden.
- The 200 kB gzip initial JavaScript budget still applies; the persist packages add about 2.9 kB gzipped.
