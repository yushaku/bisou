import { QueryClient, focusManager, mutationOptions, useIsRestoring, useMutation, useQuery, useQueryClient, type Query, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useCallback, useEffect, useState, type ReactNode, type SetStateAction } from "react";
import type { ApiResult } from "../api";
import { devicePersistOptions, dropOtherScopes } from "./devicePersist";
import { scopedStore } from "./deviceStore";

export class ApiQueryError extends Error {
  constructor(readonly status: number, readonly error: Extract<ApiResult<unknown>, { ok: false }>["error"]) {
    super(error?.error ?? `HTTP ${status}`);
  }
}

export async function apiData<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const result = await request;
  if (!result.ok) throw new ApiQueryError(result.status, result.error);
  return result.data;
}

export function createServerQueryClient() {
  // A 30-day GC timer exceeds the platform limit; provider unmount clears the session.
  return new QueryClient({ defaultOptions: {
    queries: { staleTime: Infinity, gcTime: Infinity, retry: false, networkMode: "always", refetchOnWindowFocus: false, refetchOnMount: query => query.state.status === "error" ? "always" : true, refetchOnReconnect: query => query.state.status === "error" },
    mutations: { retry: false, networkMode: "always" },
  } });
}

const SERVER_ROOTS = ["journal", "wishes", "claims", "notes", "boxes", "garden"];

async function refetchCachedQueries(client: QueryClient, predicate: (query: Query) => boolean, cancelRefetch: boolean) {
  // Persisted queries have data, but no fetch functions until their screens mount.
  const { queries: { journal, gardenDeck, gardenStage, gardenDecisions, box, ...lists } } = await import("./queries");
  await Promise.all(client.getQueryCache().findAll({ predicate }).filter(query => !query.isDisabled()).map(async query => {
    if (!query.options.queryFn) {
      const [root, part, id] = query.queryKey;
      if (root === "journal") {
        await client.fetchInfiniteQuery({ ...journal, staleTime: 0 }).catch(() => {});
        return;
      }
      const options = root === "boxes" && typeof part === "string" ? box(part)
        : root === "garden" && typeof id === "string" ? part === "deck" ? gardenDeck(id)
          : part === "stage" ? gardenStage(id as Parameters<typeof gardenStage>[0])
          : part === "decisions" ? gardenDecisions(id as Parameters<typeof gardenDecisions>[0]) : undefined
        : Object.values(lists).find(option => option.queryKey.length === query.queryKey.length && option.queryKey.every((value, index) => value === query.queryKey[index]));
      if (options) {
        await client.fetchQuery<unknown, Error, unknown, string[]>({ queryKey: options.queryKey, queryFn: options.queryFn, staleTime: 0 }).catch(() => {});
        return;
      }
    }
    await client.refetchQueries({ queryKey: query.queryKey, exact: true, type: "all" }, { cancelRefetch });
  }));
}

export async function refreshServerData(client: QueryClient) {
  const isList = (key: QueryKey) => key.length === 1 || (key.length === 2 && key[0] === "garden" && key[1] === "stars");
  await Promise.all([
    refetchCachedQueries(client, query => SERVER_ROOTS.some(root => root === query.queryKey[0]) && isList(query.queryKey), false),
    client.invalidateQueries({ predicate: query => SERVER_ROOTS.some(root => root === query.queryKey[0]) && !isList(query.queryKey), refetchType: "active" }, { cancelRefetch: false }),
  ]);
}

const PUSH_QUERY_ROOTS = new Map<string, string[]>([
  ["journal", ["journal", "wishes", "claims"]],
  ["garden", ["garden"]],
  ["notes", ["notes"]],
]);

export async function refreshForPush(client: QueryClient, tag: string) {
  const roots = PUSH_QUERY_ROOTS.get(tag);
  if (roots) await refetchCachedQueries(client, query => roots.some(root => root === query.queryKey[0]), true);
}

function RestoreGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useIsRestoring() ? fallback : children;
}

/*
 * A new provider owns each user/couple session, including requests still in flight at sign-out.
 * `scope` (user and couple ids) also names the copy saved on the device (ADR 0014): it is restored
 * before the children render, saved as the cache changes, and wiped on sign-out.
 */
export function ServerDataProvider({ scope, fallback, children }: { scope: string; fallback: ReactNode; children: ReactNode }) {
  const [client] = useState(createServerQueryClient);
  const [store] = useState(scopedStore);
  const [persistOptions] = useState(() => devicePersistOptions(store, scope));
  useEffect(() => { void dropOtherScopes(store, scope); }, [store, scope]);
  useEffect(() => () => client.clear(), [client]);
  useEffect(() => focusManager.subscribe(focused => { if (focused) void refreshServerData(client); }), [client]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.type === "bisou:push" && typeof event.data.tag === "string") void refreshForPush(client, event.data.tag);
    };
    navigator.serviceWorker.addEventListener("message", receive);
    return () => navigator.serviceWorker.removeEventListener("message", receive);
  }, [client]);
  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions} onSuccess={() => {
      // A refresh that failed last session is saved with its error; show the data and refetch it instead.
      for (const query of client.getQueryCache().getAll()) {
        if (query.state.status === "error" && query.state.data !== undefined) query.setState({ status: "success", error: null, isInvalidated: true });
      }
      void refreshServerData(client);
    }}>
      <RestoreGate fallback={fallback}>{children}</RestoreGate>
    </PersistQueryClientProvider>
  );
}

export function useQuerySignOut(error: Error | null, onSignedOut: () => void) {
  useEffect(() => { if (error instanceof ApiQueryError && error.status === 401) onSignedOut(); }, [error, onSignedOut]);
}

export function useServerQuery<T, K extends QueryKey>(options: UseQueryOptions<T, Error, T, K>, onSignedOut: () => void) {
  const client = useQueryClient();
  const query = useQuery(options);
  useQuerySignOut(query.error, onSignedOut);
  const refresh = useCallback(async () => { await query.refetch({ cancelRefetch: false }); }, [query.refetch]);
  const setData = useCallback((value: SetStateAction<T | null>) => {
    void client.cancelQueries({ queryKey: options.queryKey, exact: true });
    client.setQueryData<T>(options.queryKey, old => {
      const next = typeof value === "function" ? (value as (old: T | null) => T | null)(old ?? null) : value;
      return next ?? undefined;
    });
  }, [client, options.queryKey]);
  return { data: query.data ?? null, failed: query.isError, error: query.error, refresh, setData };
}

export function apiMutationOptions<A extends unknown[], T>(client: QueryClient, run: (...args: A) => Promise<ApiResult<T>>, roots: string[]) {
  return mutationOptions({
    mutationFn: (args: A) => apiData(run(...args)),
    onSuccess: () => { for (const root of roots) void client.invalidateQueries({ queryKey: [root] }); },
  });
}

export function useApiMutation<A extends unknown[], T>(run: (...args: A) => Promise<ApiResult<T>>, roots: string[]) {
  const client = useQueryClient();
  const mutation = useMutation(apiMutationOptions(client, run, roots));
  return async (...args: A): Promise<ApiResult<T>> => {
    try { return { ok: true, data: await mutation.mutateAsync(args) }; }
    catch (error) {
      if (error instanceof ApiQueryError) return { ok: false, status: error.status, error: error.error };
      throw error;
    }
  };
}
