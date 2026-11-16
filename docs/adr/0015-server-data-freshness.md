# ADR 0015: Server data refreshes on foreground, own changes and partner pushes, not on tab switch

Status: accepted (November 2026). Supersedes the freshness rules of [ADR 0013](0013-server-state-with-tanstack-query.md) (tab-entry reuse windows, Garden polling, refetch on reconnect) and the "restored data revalidates on mount" point of [ADR 0014](0014-persist-server-data-on-device.md). TanStack Query and the persisted cache stay.

## Context
Tab screens unmount on every switch. With `staleTime` 15 to 60 s and `refetchOnMount`, every return to a tab after that window fetched again; Home polled `/api/garden` every 15 s. `gcTime` (30 min) was far below the 30 day persist `maxAge`, so a tab not opened for 30 minutes, in memory or after a restore, lost its data and showed the skeleton again; TanStack Query says `gcTime` should be at least `maxAge`.

## Decision
- Cached data never goes stale by time: `staleTime: Infinity` (not `"static"`, which ignores invalidation), `gcTime: Infinity` (30 days overflows the `setTimeout` limit and would collect at once; the device copy stays bounded by `maxAge`), no `refetchInterval`. A screen renders cached data at once and fetches on mount only when it has no data or its query was invalidated. The skeleton shows only when there is no data at all.
- Foreground refresh: when the page becomes visible, and once after the device cache is restored at launch, refetch every cached tab list (journal, wishes, claims, notes, garden, garden stars, boxes) and invalidate the details (garden stage, decisions and deck, box detail): those on screen refetch now, hidden ones when next opened. Foreground and launch refreshes join a running fetch instead of cancelling it.
- Failures: a query whose background refresh failed keeps its data, also in the device copy, and refetches once when next observed; at launch such restored data shows as normal cached data (no error alert) and the launch refresh fetches it; reconnecting refetches only failed queries. The push config (`["push"]`, VAPID key) is not saved to the device.
- Own changes: a successful mutation invalidates its query roots, as today; a scheduled note still refreshes notes when its delivery time passes.
- Partner pushes: the service worker's `push` handler posts `{ type: "bisou:push", tag }` to every open window; the app maps the existing payload tag to query roots and refetches them: `journal` → journal, wishes, claims (a received wish writes a journal entry); `garden` → garden (and everything under it); `notes` → notes; `events` and unknown tags → nothing. A push restarts a fetch already in flight for its roots, since that request may predate the partner's change. No server or payload change.

## Rejected options
- Keep tab screens mounted (Activity or hidden): keeps memory and effects alive in four screens; the cache already holds the data.
- `refetchOnMount: false`: would also skip refetching invalidated queries, losing push and mutation refreshes.
- `gcTime` = persist `maxAge`: overflows `setTimeout`.
- Polling or realtime for partner changes: out of scope for this change; pushes and foreground cover them.

## Consequences
- Partner changes without a push (stage proposals, wish edits, a box unlock, partners with push off) appear at the next foreground, not within 15 s while the app stays open; a Garden left open over midnight shows yesterday's card until the next foreground.
- Each foreground costs about 7 requests (measured: the couple and one per cached tab list, plus details on screen; the journal fetches its loaded pages in sequence). No throttle for now. The first Garden visit after a foreground fetches its 2 hidden details (stage, decisions); that is the deferred refresh, not a revisit refetch.
- Data stays in memory for the whole session; sign-out, a 401 and a different user still remove it as ADR 0014 says.
