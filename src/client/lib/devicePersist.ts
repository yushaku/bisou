import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import type { ScopedStore } from "./deviceStore";

declare const __BISOU_BUILD__: string | undefined;

/** Changes with every build (vite.config.ts), so a deploy discards data saved by an older one. */
export const BUILD_ID = typeof __BISOU_BUILD__ === "string" ? __BISOU_BUILD__ : "dev";
export const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const QUERY_PREFIX = "rq:";

/** Same identity as the ServerDataProvider key: one stored cache per user and couple. */
export function queryScope(userId: string, coupleId: string | null | undefined): string {
  return `${userId}:${coupleId ?? "unpaired"}`;
}
export const queryCacheKey = (scope: string) => `${QUERY_PREFIX}${scope}`;

/** Infinite queries (the journal) keep only their first page on the device. */
function firstPageOnly(data: unknown): unknown {
  const d = data as { pages?: unknown; pageParams?: unknown } | null;
  if (d && Array.isArray(d.pages) && Array.isArray(d.pageParams)) {
    return { ...d, pages: d.pages.slice(0, 1), pageParams: d.pageParams.slice(0, 1) };
  }
  return data;
}

function shouldPersistQuery(query: Query): boolean {
  return query.queryKey[0] !== "push" && query.state.data !== undefined;
}

export function devicePersistOptions(
  store: ScopedStore,
  scope: string,
): Omit<PersistQueryClientOptions, "queryClient"> {
  const key = queryCacheKey(scope);
  return {
    persister: createAsyncStoragePersister({
      key,
      throttleTime: 1000,
      storage: {
        getItem: async (k) => (await store.get(k)) ?? null,
        setItem: (k, value) => store.set(k, value),
        removeItem: (k) => store.del(k),
      },
    }),
    maxAge: CACHE_MAX_AGE,
    buster: BUILD_ID,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, serializeData: firstPageOnly },
  };
}

/** Another user or couple signed in on this device earlier: never keep their data. */
export async function dropOtherScopes(store: ScopedStore, scope: string): Promise<void> {
  const keep = queryCacheKey(scope);
  for (const key of await store.keys()) if (key.startsWith(QUERY_PREFIX) && key !== keep) await store.del(key);
}
