import { afterEach, vi } from "vitest";
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { SetStateAction } from "react";
import type { ApiResult } from "../src/client/api";
import { ApiQueryError } from "../src/client/lib/apiQueryError";

// Component tests render on the server or drive React hooks manually. Cache semantics are
// exercised with real QueryClient/QueryObserver instances in server-query.test.ts.
vi.mock("@tanstack/react-query", async (original) => {
  const actual = await original<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => testQueryClient,
    useQuery: (options: UseQueryOptions) => actual.useQuery(options, testQueryClient),
  };
});

vi.mock("../src/client/lib/serverQuery", async (original) => {
  const actual = await original<typeof import("../src/client/lib/serverQuery")>();
  const { useEffect, useCallback } = await import("react");
  return {
    ...actual,
    useServerQuery: <T, K extends QueryKey>(options: UseQueryOptions<T, Error, T, K>, onSignedOut: () => void) => {
      const state = testQueryClient.getQueryState(options.queryKey);
      const data =
        testQueryClient.getQueryData<T>(options.queryKey) ??
        (typeof options.initialData === "function"
          ? (options.initialData as () => T | undefined)()
          : options.initialData) ??
        (state?.status === "error"
          ? undefined
          : typeof options.placeholderData === "function"
            ? (options.placeholderData as () => T | undefined)()
            : options.placeholderData) ??
        null;
      const refresh = useCallback(async () => {
        try {
          await testQueryClient.query({ ...options, staleTime: 0 });
        } catch (error) {
          if (error instanceof ApiQueryError && error.status === 401) onSignedOut();
        }
      }, [options.queryKey, onSignedOut]);
      useEffect(() => {
        if (options.enabled !== false) void testQueryClient.query(options).catch(() => {});
      }, [options.queryKey]);
      return {
        data,
        failed: state?.status === "error",
        error: state?.error ?? null,
        refresh,
        setData: (value: SetStateAction<T | null>) =>
          testQueryClient.setQueryData<T>(
            options.queryKey,
            (old) =>
              (typeof value === "function" ? (value as (old: T | null) => T | null)(old ?? null) : value) ?? undefined,
          ),
      };
    },
    useApiMutation:
      <A extends unknown[], T>(run: (...args: A) => Promise<ApiResult<T>>, roots: string[]) =>
      async (...args: A): Promise<ApiResult<T>> => {
        try {
          return {
            ok: true,
            data: await testQueryClient
              .getMutationCache()
              .build(testQueryClient, actual.apiMutationOptions(testQueryClient, run, roots))
              .execute(args),
          };
        } catch (error) {
          if (error instanceof ApiQueryError) return { ok: false, status: error.status, error: error.error };
          throw error;
        }
      },
  };
});

vi.mock("../src/client/lib/useJournal", async (original) => {
  const actual = await original<typeof import("../src/client/lib/useJournal")>();
  const { queries } = await import("../src/client/lib/queries");
  const { useEffect } = await import("react");
  const { addPage } = await import("../src/client/lib/journalFeed");
  return {
    ...actual,
    useJournal: () => {
      const data = testQueryClient.getQueryData(queries.journal.queryKey);
      useEffect(() => {
        void testQueryClient.infiniteQuery(queries.journal).catch(() => {});
      }, []);
      return {
        feed: data?.pages.reduce(addPage) ?? null,
        refresh: async () => {
          await testQueryClient.infiniteQuery({ ...queries.journal, staleTime: 0 });
        },
        loadMore: async () => {},
        failed: false,
        moreFailed: false,
        loadingMore: false,
        saveEntry: (entry: Parameters<typeof actual.updateJournalEntry>[1]) =>
          actual.updateJournalEntry(testQueryClient, entry),
        removeEntry: (id: string) => actual.deleteJournalEntry(testQueryClient, id),
      };
    },
  };
});

import { testQueryClient } from "./query-fixture";
afterEach(() => testQueryClient.clear());
