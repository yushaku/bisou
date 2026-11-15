import { QueryClient, mutationOptions, useIsRestoring, useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
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
  return new QueryClient({ defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 30 * 60_000, retry: false, networkMode: "always", refetchOnWindowFocus: "always", refetchOnReconnect: "always" },
    mutations: { retry: false, networkMode: "always" },
  } });
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
  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
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
