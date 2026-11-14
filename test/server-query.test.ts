import { QueryObserver } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { createServerQueryClient, apiData, apiMutationOptions } from "../src/client/lib/serverQuery";
import { queries } from "../src/client/lib/queries";
import { deleteJournalEntry, updateJournalEntry } from "../src/client/lib/useJournal";
import type { JournalEntry } from "../src/shared/types";

afterEach(() => vi.restoreAllMocks());

it("Home and Garden share an in-flight request and reuse fresh data on tab entry", async () => {
  const client = createServerQueryClient();
  const data = { day: "2026-11-14", today: null, swapLocked: false, freshness: "fresh" as const, plants: [], levels: {
    revision: 0, initialLevelId: null, selectedLevelId: null, furthestLevelId: null, placementComplete: false, proposal: null, decisions: [],
  } };
  const request = vi.spyOn(api, "garden").mockResolvedValue({ ok: true, data });
  const [home, garden] = await Promise.all([client.fetchQuery(queries.garden), client.fetchQuery(queries.garden)]);
  expect(home).toBe(garden);
  await client.fetchQuery(queries.garden);
  expect(request).toHaveBeenCalledTimes(1);
  client.clear();
});

it("unchanged polling data keeps its reference and does not notify data-only observers", async () => {
  const client = createServerQueryClient();
  let version = 1;
  const options = { queryKey: ["poll"], queryFn: async () => ({ version }), notifyOnChangeProps: ["data" as const] };
  await client.fetchQuery(options);
  const observer = new QueryObserver(client, options);
  const changed = vi.fn();
  const unsubscribe = observer.subscribe(changed);
  const first = client.getQueryData(options.queryKey);
  await observer.refetch();
  expect(client.getQueryData(options.queryKey)).toBe(first);
  expect(changed).not.toHaveBeenCalled();
  version++;
  await observer.refetch();
  expect(changed).toHaveBeenCalledTimes(1);
  unsubscribe(); client.clear();
});

it("refresh errors keep cached data, and HTTP errors are query errors", async () => {
  const client = createServerQueryClient();
  client.setQueryData(["notes"], { fromMe: [], toMe: [] });
  vi.spyOn(api, "notes").mockResolvedValue({ ok: false, status: 401, error: null });
  await expect(client.fetchQuery({ ...queries.notes, staleTime: 0 })).rejects.toMatchObject({ status: 401 });
  expect(client.getQueryData(["notes"])).toEqual({ fromMe: [], toMe: [] });
  client.clear();
});

it("successful mutations invalidate related domains; failures leave caches intact and are not retried", async () => {
  const client = createServerQueryClient();
  client.setQueryData(["garden"], {}); client.setQueryData(["garden", "stars"], {}); client.setQueryData(["wishes"], {});
  const save = vi.fn(async () => ({ ok: true as const, data: { saved: true } }));
  const mutation = client.getMutationCache().build(client, apiMutationOptions(client, save, ["garden"]));
  await mutation.execute([]);
  expect(client.getQueryState(["garden"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["garden", "stars"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["wishes"])?.isInvalidated).toBe(false);
  const fail = vi.fn(async () => ({ ok: false as const, status: 409, error: null }));
  await expect(client.getMutationCache().build(client, apiMutationOptions(client, fail, ["wishes"])).execute([])).rejects.toMatchObject({ status: 409 });
  expect(fail).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(["wishes"])?.isInvalidated).toBe(false);
  client.clear();
});

it("a new session cannot read or receive late data from the previous session", async () => {
  const first = createServerQueryClient();
  let resolve!: (value: string) => void;
  const pending = first.fetchQuery({ queryKey: ["private"], queryFn: () => new Promise<string>(done => { resolve = done; }) });
  void pending.catch(() => {});
  first.clear();
  const second = createServerQueryClient();
  resolve("old partner data");
  await expect(pending).rejects.toBeDefined();
  expect(first.getQueryData(["private"])).toBeUndefined();
  expect(second.getQueryData(["private"])).toBeUndefined();
  second.clear();
});

it("API result conversion preserves status and server error details", async () => {
  await expect(apiData(Promise.resolve({ ok: false, status: 409, error: { error: "invalid_body" } }))).rejects.toMatchObject({ status: 409, error: { error: "invalid_body" } });
});

it("Home and Journal share cursor pages; edits and deletions update the same cached feed", async () => {
  const client = createServerQueryClient();
  const entry: JournalEntry = { id: "new", authorId: "a", date: "2026-11-14", text: "first", source: "partner", photoIds: [], createdAt: 2, updatedAt: 2 };
  const older = { ...entry, id: "old", date: "2026-11-13", createdAt: 1 };
  const request = vi.spyOn(api, "journal").mockImplementation(async cursor => ({ ok: true, data: cursor
    ? { entries: [older], nextCursor: null } : { entries: [entry], nextCursor: "cursor" } }));
  const data = await client.fetchInfiniteQuery({ ...queries.journal, pages: 2 });
  expect(request.mock.calls).toEqual([[undefined], ["cursor"]]);
  expect(data.pages).toHaveLength(2);
  await client.fetchInfiniteQuery(queries.journal);
  expect(request).toHaveBeenCalledTimes(2);
  updateJournalEntry(client, { ...older, text: "edited" });
  const edited = client.getQueryData(queries.journal.queryKey)!;
  expect(edited.pages.flatMap(page => page.entries).filter(row => row.id === "old")).toEqual([{ ...older, text: "edited" }]);
  expect(edited.pageParams).toEqual([undefined, "cursor"]);
  deleteJournalEntry(client, "new");
  expect(client.getQueryData(queries.journal.queryKey)!.pages.flatMap(page => page.entries).map(row => row.id)).toEqual(["old"]);
  client.clear();
});
