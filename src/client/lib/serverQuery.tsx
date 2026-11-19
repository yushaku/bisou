import { isRecord, noop } from "../../shared/guards";
import { ApiQueryError } from "./apiQueryError";
import {
  QueryClient,
  focusManager,
  mutationOptions,
  useIsRestoring,
  useMutation,
  useQuery,
  useQueryClient,
  type Query,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useCallback, useEffect, useState, type ReactNode, type SetStateAction } from "react";
import type { ApiResult } from "../api";
import { LEVEL_IDS, type RelationshipLevel } from "../../shared/garden";
import { devicePersistOptions, dropOtherScopes } from "./devicePersist";
import { scopedStore } from "./deviceStore";

export async function apiData<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const result = await request;
  if (!result.ok) throw new ApiQueryError(result.status, result.error);
  return result.data;
}

/** A query shows its failed state only once its retry has finished, so a refetch does not flash the error. */
export const isFailed = (query: { isError: boolean; isFetching: boolean }) => query.isError && !query.isFetching;

// Restored or partial cache entries may lack `pages`, whatever the type says.
const journalPages = (client: QueryClient, queryKey: QueryKey) => {
  const cached: { pages?: unknown[] } | undefined = client.getQueryData(queryKey);
  return cached?.pages;
};

const levelId = (id: unknown): RelationshipLevel | undefined => LEVEL_IDS.find((level) => level === id);

export function createServerQueryClient() {
  // A 30-day GC timer exceeds the platform limit; provider unmount clears the session.
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        networkMode: "always",
        refetchOnWindowFocus: false,
        refetchOnMount: (query) => (query.state.status === "error" ? "always" : true),
        refetchOnReconnect: (query) => query.state.status === "error",
      },
      mutations: { retry: false, networkMode: "always" },
    },
  });
}

const SERVER_ROOTS = ["journal", "wishes", "claims", "notes", "boxes", "garden"];

async function refetchCachedQueries(client: QueryClient, predicate: (query: Query) => boolean, cancelRefetch: boolean) {
  // Persisted queries have data, but no fetch functions until their screens mount.
  const {
    queries: { journal, gardenDeck, gardenStage, gardenDecisions, box, ...lists },
  } = await import("./queries");
  await Promise.all(
    client
      .getQueryCache()
      .findAll({ predicate })
      .filter((query) => !query.isDisabled())
      .map(async (query) => {
        const [root, part, id] = query.queryKey;
        if (
          root === "journal" &&
          query.queryKey.length === 1 &&
          !query.getObserversCount() &&
          query.state.fetchStatus === "idle" &&
          (journalPages(client, journal.queryKey)?.length ?? 0) > 1
        ) {
          // Stop after the first page if the Journal is still closed when it arrives.
          await client
            .infiniteQuery({
              ...journal,
              staleTime: 0,
              getNextPageParam: (...args: Parameters<typeof journal.getNextPageParam>) =>
                query.getObserversCount() ? journal.getNextPageParam(...args) : undefined,
            })
            .catch(noop);
          return;
        }
        if (!query.options.queryFn) {
          if (root === "journal") {
            await client.infiniteQuery({ ...journal, staleTime: 0 }).catch(noop);
            return;
          }
          const level = levelId(id);
          if (root === "garden" && (part === "stage" || part === "decisions") && !level) return;
          const options =
            root === "boxes" && typeof part === "string"
              ? box(part)
              : root === "garden" && typeof id === "string"
                ? part === "deck"
                  ? gardenDeck(id)
                  : part === "stage" && level
                    ? gardenStage(level)
                    : part === "decisions" && level
                      ? gardenDecisions(level)
                      : undefined
                : Object.values(lists).find(
                    (option) =>
                      option.queryKey.length === query.queryKey.length &&
                      option.queryKey.every((value, index) => value === query.queryKey[index]),
                  );
          if (options) {
            await client
              .query<unknown, Error, unknown, unknown, string[]>({
                queryKey: options.queryKey,
                queryFn: options.queryFn,
                staleTime: 0,
              })
              .catch(noop);
            return;
          }
        }
        // Never cancel a journal load-more: the user is waiting for that page.
        const loadingMore =
          query.state.fetchStatus === "fetching" &&
          Boolean(query.state.fetchMeta && "fetchMore" in (query.state.fetchMeta as object));
        await client.refetchQueries(
          { queryKey: query.queryKey, exact: true, type: "all" },
          { cancelRefetch: cancelRefetch && !loadingMore },
        );
      }),
  );
}

export async function refreshServerData(client: QueryClient) {
  const isList = (key: QueryKey) => key.length === 1 || (key.length === 2 && key[0] === "garden" && key[1] === "stars");
  await Promise.all([
    refetchCachedQueries(
      client,
      (query) => SERVER_ROOTS.some((root) => root === query.queryKey[0]) && isList(query.queryKey),
      false,
    ),
    client.invalidateQueries(
      {
        predicate: (query) => SERVER_ROOTS.some((root) => root === query.queryKey[0]) && !isList(query.queryKey),
        refetchType: "active",
      },
      { cancelRefetch: false },
    ),
  ]);
}

const PUSH_QUERY_ROOTS = new Map<string, string[]>([
  ["journal", ["journal", "wishes", "claims"]],
  ["garden", ["garden"]],
  ["notes", ["notes"]],
]);

export async function refreshForPush(client: QueryClient, tag: string) {
  const roots = PUSH_QUERY_ROOTS.get(tag);
  if (roots) await refetchCachedQueries(client, (query) => roots.some((root) => root === query.queryKey[0]), true);
}

function RestoreGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useIsRestoring() ? fallback : children;
}

/*
 * A new provider owns each user/couple session, including requests still in flight at sign-out.
 * `scope` (user and couple ids) also names the copy saved on the device (ADR 0014): it is restored
 * before the children render, saved as the cache changes, and wiped on sign-out.
 */
export function ServerDataProvider({
  scope,
  fallback,
  children,
}: {
  scope: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const [client] = useState(createServerQueryClient);
  const [store] = useState(scopedStore);
  const [persistOptions] = useState(() => devicePersistOptions(store, scope));
  useEffect(() => {
    void dropOtherScopes(store, scope);
  }, [store, scope]);
  useEffect(() => () => client.clear(), [client]);
  useEffect(
    () =>
      focusManager.subscribe((focused) => {
        if (focused) void refreshServerData(client);
      }),
    [client],
  );
  useEffect(() => {
    // Not every browser exposes service workers, whatever the DOM types say.
    const worker: Partial<Navigator> = typeof navigator === "undefined" ? {} : navigator;
    if (!worker.serviceWorker) return;
    const receive = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (isRecord(data) && data.type === "bisou:push" && typeof data.tag === "string")
        void refreshForPush(client, data.tag);
    };
    navigator.serviceWorker.addEventListener("message", receive);
    return () => navigator.serviceWorker.removeEventListener("message", receive);
  }, [client]);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      onSuccess={() => {
        // A refresh that failed last session is saved with its error; show the data and refetch it instead.
        for (const query of client.getQueryCache().getAll()) {
          if (query.state.status === "error" && query.state.data !== undefined)
            query.setState({ status: "success", error: null, isInvalidated: true });
        }
        void refreshServerData(client);
      }}
    >
      <RestoreGate fallback={fallback}>{children}</RestoreGate>
    </PersistQueryClientProvider>
  );
}

export function useQuerySignOut(error: Error | null, onSignedOut: () => void) {
  useEffect(() => {
    if (error instanceof ApiQueryError && error.status === 401) onSignedOut();
  }, [error, onSignedOut]);
}

export function useServerQuery<T, K extends QueryKey>(
  options: UseQueryOptions<T, Error, T, K>,
  onSignedOut: () => void,
) {
  const client = useQueryClient();
  const query = useQuery(options);
  const { refetch } = query;
  useQuerySignOut(query.error, onSignedOut);
  const refresh = useCallback(async () => {
    await refetch({ cancelRefetch: false });
  }, [refetch]);
  const setData = useCallback(
    (value: SetStateAction<T | null>) => {
      void client.cancelQueries({ queryKey: options.queryKey, exact: true });
      client.setQueryData<T>(options.queryKey, (old) => {
        const next = typeof value === "function" ? (value as (old: T | null) => T | null)(old ?? null) : value;
        return next ?? undefined;
      });
    },
    [client, options.queryKey],
  );
  return {
    data: query.data ?? null,
    failed: isFailed(query),
    error: isFailed(query) ? query.error : null,
    refresh,
    setData,
  };
}

export function apiMutationOptions<A extends unknown[], T>(
  client: QueryClient,
  run: (...args: A) => Promise<ApiResult<T>>,
  roots: string[],
) {
  return mutationOptions({
    mutationFn: (args: A) => apiData(run(...args)),
    onSuccess: () => {
      for (const root of roots) void client.invalidateQueries({ queryKey: [root] });
    },
  });
}

export function useApiMutation<A extends unknown[], T>(run: (...args: A) => Promise<ApiResult<T>>, roots: string[]) {
  const client = useQueryClient();
  const mutation = useMutation(apiMutationOptions(client, run, roots));
  return async (...args: A): Promise<ApiResult<T>> => {
    try {
      return { ok: true, data: await mutation.mutateAsync(args) };
    } catch (error) {
      if (error instanceof ApiQueryError) return { ok: false, status: error.status, error: error.error };
      throw error;
    }
  };
}
