# ADR 0013: Share server data through TanStack Query

Status: accepted (November 2026). Partly superseded by [ADR 0014](0014-persist-server-data-on-device.md): server data is now persisted on the device. Its freshness rules (reuse windows on tab entry, Garden polling, refetch on reconnect) are superseded by [ADR 0015](0015-server-data-freshness.md).

## Context
Home, Garden and Journal fetched overlapping data into separate component state. `TabMemory` cached some lists and pending requests, while each component implemented its own refresh listeners. Returning to Garden discarded its data, and an unchanged poll response still replaced component state.

## Decision
- Use TanStack Query v5 for Garden, journal pages, wishes, notes, claims and card boxes. Keep HTTP endpoints and `ApiResult` in `api.ts`; `queries.ts` defines query keys and fetching, while the shared adapter converts failed results into query errors.
- Give each user/couple session its own QueryClient and clear it on unmount. Keep private data in memory. Preserve the existing device cache for offline card boxes and clear it through the existing sign-out flow.
- Reuse fresh data on tab entry for 30 seconds by default, 15 seconds for Garden and 60 seconds for boxes. Refetch on returning to the foreground, reconnecting, or explicit refresh. Garden polls every 15 seconds while visible. Do not automatically retry writes or failed queries.
- Successful mutations invalidate the affected query domains. Journal saves and deletions also update its shared infinite-query pages immediately; Home reads those same pages. Keep JSON structural sharing enabled to retain unchanged data references.
- Keep scroll positions, focus targets, filters and section choices in `TabMemory`. Authentication bootstrap, couple membership and device push registration retain their existing lifecycle; they establish or depend on the server-data session.

## Consequences
- QueryClient replaces the manual list cache, request coalescing and most refresh effects. Polling can complete without notifying a component when its consumed data and error state are unchanged.
- Cached lists can be briefly stale while the app is open; mutations, foreground refresh and Garden polling update them. Query cache is not persisted across reloads.
- Infinite journal refreshes fetch the loaded pages sequentially to keep cursors consistent. A long loaded feed costs more requests on foreground refresh.
- The dependency increases initial compressed JavaScript by about 10.5 kB; the existing 200 kB build budget still applies. Component state and parent renders can still require separate profiling.
