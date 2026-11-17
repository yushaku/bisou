# ADR 0016: Tab switches are instant and visited tabs stay mounted

Status: Accepted (November 2026). Supersedes the "Keep tab screens mounted" rejection in [ADR 0015](0015-server-data-freshness.md); its freshness rules stay.

## Context
Returning to a tab felt slow on the phone. In the Orca browser (dev, CPU 4×, seed data, two runs of five Home returns), the cache had the data (0 fetches), but Home remounted every time and became visible in the DOM after medians of 971.5/916.8 ms. The page view transition defers navigation until after the old snapshot, then fades the new page for 360 ms. Direct navigation reduced those medians to 53.6/63.7 ms while still remounting Home.

React 19.3 ships `<Activity>`, which keeps a subtree's state and DOM while hidden and tears down its effects. The app already uses it to keep the tabs under Settings.

## Decision
- A tab switch navigates at once. No view transition, no page slide or fade, no frozen page box. The page never waits for motion.
- The tab bar has one shared pill that slides to the active tab with a CSS transform transition (`2 × --duration`), started after the commit that already shows the new page. Reduced motion makes it jump (see DESIGN.md).
- `TabScreens` keeps every tab that was visited in this mount in an `<Activity>`, visible for the active tab and hidden for the others. A tab mounts on its first visit; nothing is evicted. Settings already hides the tabs in an `<Activity>`, so they survive it. Leaving the tab screens for a sub-page (Events, Boxes, Starred, a Garden deck), signing out or changing the couple scope drops them as before; sub-pages are out of scope for now.
- Hidden tabs disconnect passive and layout effects: no timers, no IntersectionObserver, no create requests, no pull-to-refresh handler, and no query observers. For TanStack Query a hidden tab's queries are inactive, so ADR 0015 applies unchanged: foreground and push refreshes refetch cached lists, invalidated details fetch when the tab is shown again.
- Hidden tabs are `display: none`, so they leave the accessibility tree and tab order; no `inert` or `aria-hidden` is added.
- A tab still opens at the top when entered. Filters, sections, loaded journal pages and transient views (such as the Wishes spin screen) stay as the user left them, as in an iOS tab bar.

## Rejected options
- Keep the transition and only remount faster: the render is not the wait, the transition is.
- Shorter page fade with the transition kept: the snapshot wait before the update remains.
- Hidden containers (`hidden` attribute) without `Activity`: effects and query observers would keep running in hidden tabs, so hidden details would refetch at once and listeners would multiply.
- Keep all tabs mounted from launch: mounts screens the user may never open and delays the first paint.
- Keep only Home and the last used tab: less memory with a long journal, but hopping between the other tabs would rebuild them. Revisit if memory on a phone says so.
- Drop the pill motion as well: Home medians with motion 53.6/63.7 ms and without 58.6/54.4 ms overlap the run spread.

## Consequences
- Orca dev, CPU 4×, two runs of five warm returns: Home DOM-ready median 971.5/916.8 ms before, 53.6/63.7 ms after removing the transition, 35.8/44.1 ms with retained tabs and a memoized daily question. Journal finishes at 36.4/41.0 ms; zero Home remounts and fetches. Seed heap grows by at most 3.71 MB; see [measurements](../performance.md#native-tabs-17112026).
- Memory holds the DOM of up to four tabs, including a long loaded journal and its images, for as long as the tab screens stay open. The query data was already kept for the session (ADR 0015).
- Passive and layout effects reconnect on reveal. `useNow` recomputes the day and schedules from the current time. Journal re-reads the notes shortcut before paint. Draft photo and crop ownership use insertion-effect cleanup so hiding does not delete uploaded photos, cancel a pending crop or revoke previews; actual removal still disposes them.
- Page content appears immediately; [DESIGN.md](../../DESIGN.md) records the indicator motion.
- Not measured on Safari or an iPhone yet.
