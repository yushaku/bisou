import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { JournalEntry, JournalPage } from "../../shared/types";
import { addPage, removeEntry, upsertEntry } from "./journalFeed";
import { queries } from "./queries";
import { isFailed, useQuerySignOut } from "./serverQuery";

export function updateJournalEntry(client: QueryClient, entry: JournalEntry) {
  void client.cancelQueries({ queryKey: ["journal"] });
  client.setQueryData<InfiniteData<JournalPage>>(queries.journal.queryKey, old => old ? {
    ...old, pages: old.pages.map((page, i) => i === 0 ? upsertEntry(page, entry) : removeEntry(page, entry.id)),
  } : { pages: [{ entries: [entry], nextCursor: null }], pageParams: [undefined] });
}

export function deleteJournalEntry(client: QueryClient, id: string) {
  void client.cancelQueries({ queryKey: ["journal"] });
  client.setQueryData<InfiniteData<JournalPage>>(queries.journal.queryKey, old => old && {
    ...old, pages: old.pages.map(page => removeEntry(page, id)),
  });
}

export function useJournal(onSignedOut: () => void) {
  const client = useQueryClient();
  const query = useInfiniteQuery(queries.journal);
  useQuerySignOut(query.error, onSignedOut);
  const feed = useMemo(() => query.data ? query.data.pages.reduce(addPage) : null, [query.data]);
  const refresh = useCallback(async () => { await query.refetch({ cancelRefetch: false }); }, [query.refetch]);
  const loadMore = useCallback(async () => {
    if (query.hasNextPage && !query.isFetching) await query.fetchNextPage({ cancelRefetch: false });
  }, [query.hasNextPage, query.isFetching, query.fetchNextPage]);
  return { feed, refresh, loadMore, failed: isFailed(query), moreFailed: query.isFetchNextPageError, loadingMore: query.isFetchingNextPage,
    saveEntry: (entry: JournalEntry) => updateJournalEntry(client, entry), removeEntry: (id: string) => deleteJournalEntry(client, id) };
}
