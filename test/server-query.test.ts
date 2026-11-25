import { readFileSync } from "node:fs";
import { InfiniteQueryObserver, QueryObserver, dehydrate, hydrate, onlineManager } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import {
  createServerQueryClient,
  apiData,
  apiMutationOptions,
  refreshServerData,
  refreshForPush,
  isFailed,
} from "../src/client/lib/serverQuery";
import { queries } from "../src/client/lib/queries";
import { deleteJournalEntry, updateJournalEntry } from "../src/client/lib/useJournal";
import type { JournalEntry } from "../src/shared/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("Home and Garden share an in-flight request and reuse fresh data on tab entry", async () => {
  const client = createServerQueryClient();
  const data = {
    day: "2026-11-14",
    today: null,
    swapLocked: false,
    freshness: "fresh" as const,
    plants: [],
    levels: {
      revision: 0,
      initialLevelId: null,
      selectedLevelId: null,
      furthestLevelId: null,
      placementComplete: false,
      proposal: null,
      decisions: [],
    },
  };
  const request = vi.spyOn(api, "garden").mockResolvedValue({ ok: true, data });
  const [home, garden] = await Promise.all([client.query(queries.garden), client.query(queries.garden)]);
  expect(home).toBe(garden);
  await client.query(queries.garden);
  expect(request).toHaveBeenCalledTimes(1);
  client.clear();
});

it("unchanged polling data keeps its reference and does not notify data-only observers", async () => {
  const client = createServerQueryClient();
  let version = 1;
  const options = { queryKey: ["poll"], queryFn: async () => ({ version }), notifyOnChangeProps: ["data" as const] };
  await client.query(options);
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
  unsubscribe();
  client.clear();
});

it("refresh errors keep cached data, and HTTP errors are query errors", async () => {
  const client = createServerQueryClient();
  client.setQueryData(["notes"], { fromMe: [], toMe: [] });
  vi.spyOn(api, "notes").mockResolvedValue({ ok: false, status: 401, error: null });
  await expect(client.query({ ...queries.notes, staleTime: 0 })).rejects.toMatchObject({ status: 401 });
  expect(client.getQueryData(["notes"])).toEqual({ fromMe: [], toMe: [] });
  client.clear();
});

it("successful mutations invalidate related domains; failures leave caches intact and are not retried", async () => {
  const client = createServerQueryClient();
  client.setQueryData(["garden"], {});
  client.setQueryData(["garden", "stars"], {});
  client.setQueryData(["wishes"], {});
  const save = vi.fn(async () => ({ ok: true as const, data: { saved: true } }));
  const mutation = client.getMutationCache().build(client, apiMutationOptions(client, save, ["garden"]));
  await mutation.execute([]);
  expect(client.getQueryState(["garden"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["garden", "stars"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["wishes"])?.isInvalidated).toBe(false);
  const fail = vi.fn(async () => ({ ok: false as const, status: 409, error: null }));
  await expect(
    client
      .getMutationCache()
      .build(client, apiMutationOptions(client, fail, ["wishes"]))
      .execute([]),
  ).rejects.toMatchObject({ status: 409 });
  expect(fail).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(["wishes"])?.isInvalidated).toBe(false);
  client.clear();
});

it("a new session cannot read or receive late data from the previous session", async () => {
  const first = createServerQueryClient();
  let resolve!: (value: string) => void;
  const pending = first.query({
    queryKey: ["private"],
    queryFn: () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  });
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
  await expect(
    apiData(Promise.resolve({ ok: false, status: 409, error: { error: "invalid_body" } })),
  ).rejects.toMatchObject({ status: 409, error: { error: "invalid_body" } });
});

it("Home and Journal share cursor pages; edits and deletions update the same cached feed", async () => {
  const client = createServerQueryClient();
  const entry: JournalEntry = {
    id: "new",
    authorId: "a",
    date: "2026-11-14",
    text: "first",
    source: "partner",
    photoIds: [],
    createdAt: 2,
    updatedAt: 2,
  };
  const older = { ...entry, id: "old", date: "2026-11-13", createdAt: 1 };
  const request = vi.spyOn(api, "journal").mockImplementation(async (cursor) => ({
    ok: true,
    data: cursor ? { entries: [older], nextCursor: null } : { entries: [entry], nextCursor: "cursor" },
  }));
  const data = await client.infiniteQuery({ ...queries.journal, pages: 2 });
  expect(request.mock.calls).toEqual([[undefined], ["cursor"]]);
  expect(data.pages).toHaveLength(2);
  await client.infiniteQuery(queries.journal);
  expect(request).toHaveBeenCalledTimes(2);
  updateJournalEntry(client, { ...older, text: "edited" });
  const edited = client.getQueryData(queries.journal.queryKey)!;
  expect(edited.pages.flatMap((page) => page.entries).filter((row) => row.id === "old")).toEqual([
    { ...older, text: "edited" },
  ]);
  expect(edited.pageParams).toEqual([undefined, "cursor"]);
  deleteJournalEntry(client, "new");
  expect(
    client
      .getQueryData(queries.journal.queryKey)!
      .pages.flatMap((page) => page.entries)
      .map((row) => row.id),
  ).toEqual(["old"]);
  client.clear();
});

it("a tab reopened after two hours immediately reuses data without a request", async () => {
  vi.useFakeTimers();
  const client = createServerQueryClient();
  const request = vi
    .spyOn(api, "wishes")
    .mockResolvedValue({ ok: true, data: { open: [], received: [], partnerJarEmpty: true } });
  const first = new QueryObserver(client, queries.wishes);
  const leave = first.subscribe(() => {});
  await first.refetch();
  leave();
  await vi.advanceTimersByTimeAsync(2 * 60 * 60_000);
  const next = new QueryObserver(client, queries.wishes);
  const leaveAgain = next.subscribe(() => {});
  expect(next.getCurrentResult()).toMatchObject({
    status: "success",
    data: { open: [], received: [], partnerJarEmpty: true },
  });
  expect(request).toHaveBeenCalledTimes(1);
  leaveAgain();
  client.clear();
});

it("restored day-old data renders without fetching until the foreground refresh", async () => {
  const client = createServerQueryClient();
  const saved = createServerQueryClient();
  saved.setQueryData(
    ["wishes"],
    { open: [], received: [], partnerJarEmpty: true },
    { updatedAt: Date.now() - 86400_000 },
  );
  hydrate(client, dehydrate(saved));
  saved.clear();
  const request = vi
    .spyOn(api, "wishes")
    .mockResolvedValue({ ok: true, data: { open: [], received: [], partnerJarEmpty: true } });
  const observer = new QueryObserver(client, queries.wishes);
  const leave = observer.subscribe(() => {});
  expect(observer.getCurrentResult()).toMatchObject({
    status: "success",
    data: { open: [], received: [], partnerJarEmpty: true },
  });
  expect(request).not.toHaveBeenCalled();
  await refreshServerData(client);
  expect(request).toHaveBeenCalledOnce();
  leave();
  client.clear();
});

it("foreground refresh fetches inactive lists and stars but defers details until opened", async () => {
  const client = createServerQueryClient();
  const list = vi.fn(async () => "list");
  const stars = vi.fn(async () => "stars");
  const detail = vi.fn(async () => "deck");
  const push = vi.fn(async () => "push");
  await client.query({ queryKey: ["wishes"], queryFn: list });
  await client.query({ queryKey: ["garden", "stars"], queryFn: stars });
  await client.query({ queryKey: ["garden", "deck", "x"], queryFn: detail });
  await client.query({ queryKey: ["push"], queryFn: push });
  await refreshServerData(client);
  expect(list).toHaveBeenCalledTimes(2);
  expect(stars).toHaveBeenCalledTimes(2);
  expect(detail).toHaveBeenCalledOnce();
  expect(push).toHaveBeenCalledOnce();
  expect(client.getQueryState(["garden", "deck", "x"])?.isInvalidated).toBe(true);
  const observer = new QueryObserver(client, { queryKey: ["garden", "deck", "x"], queryFn: detail });
  const leave = observer.subscribe(() => {});
  await vi.waitFor(() => expect(detail).toHaveBeenCalledTimes(2));
  const control = new QueryObserver(client, { queryKey: ["push"], queryFn: push });
  const leaveControl = control.subscribe(() => {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(push).toHaveBeenCalledOnce();
  leaveControl();
  leave();
  client.clear();
});

it("a successful mutation refreshes an inactive query when its tab next opens", async () => {
  const client = createServerQueryClient();
  const request = vi
    .spyOn(api, "wishes")
    .mockResolvedValue({ ok: true, data: { open: [], received: [], partnerJarEmpty: true } });
  await client.query(queries.wishes);
  const healthy = vi.fn(async () => "healthy");
  const controlOptions = { queryKey: ["notes"], queryFn: healthy };
  await client.query(controlOptions);
  await client
    .getMutationCache()
    .build(
      client,
      apiMutationOptions(client, async () => ({ ok: true, data: {} }), ["wishes"]),
    )
    .execute([]);
  const observer = new QueryObserver(client, queries.wishes);
  const leave = observer.subscribe(() => {});
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  const control = new QueryObserver(client, controlOptions);
  const leaveControl = control.subscribe(() => {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(healthy).toHaveBeenCalledOnce();
  leaveControl();
  leave();
  client.clear();
});

it("Garden has no polling schedule", async () => {
  vi.useFakeTimers();
  const client = createServerQueryClient();
  const gardenQueries = [
    ...Object.values(queries).filter((value) => typeof value !== "function"),
    queries.gardenDeck("x"),
    queries.gardenStage("in_love"),
    queries.gardenDecisions("in_love"),
  ];
  expect(gardenQueries.every((value) => !("refetchInterval" in value))).toBe(true);
  const request = vi.spyOn(api, "garden").mockResolvedValue({
    ok: true,
    data: {
      day: "2026-11-14",
      today: null,
      swapLocked: false,
      freshness: "fresh",
      plants: [],
      levels: {
        revision: 0,
        initialLevelId: null,
        selectedLevelId: null,
        furthestLevelId: null,
        placementComplete: false,
        proposal: null,
        decisions: [],
      },
    },
  });
  const observer = new QueryObserver(client, queries.garden);
  const leave = observer.subscribe(() => {});
  await observer.refetch({ cancelRefetch: false });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledOnce();
  leave();
  client.clear();
});

it("reconnect retries only errored queries and leaves successful data alone", async () => {
  const client = createServerQueryClient();
  client.mount();
  const good = vi.fn(async () => "good");
  const bad = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("recovered");
  const successful = new QueryObserver(client, { queryKey: ["good"], queryFn: good });
  const failed = new QueryObserver(client, { queryKey: ["bad"], queryFn: bad });
  const leaveGood = successful.subscribe(() => {});
  const leaveBad = failed.subscribe(() => {});
  await Promise.all([successful.refetch(), failed.refetch()]);
  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await vi.waitFor(() => expect(failed.getCurrentResult().data).toBe("recovered"));
  expect(good).toHaveBeenCalledOnce();
  expect(bad).toHaveBeenCalledTimes(2);
  leaveGood();
  leaveBad();
  client.unmount();
  client.clear();
});

it("journal pushes refresh only their related roots, including inactive data", async () => {
  const client = createServerQueryClient();
  const requests = Object.fromEntries(
    ["journal", "wishes", "claims", "garden", "notes"].map((root) => [root, vi.fn(async () => root)]),
  );
  for (const [root, queryFn] of Object.entries(requests)) await client.query({ queryKey: [root], queryFn });
  await refreshForPush(client, "journal");
  expect(
    Object.fromEntries(Object.entries(requests).map(([root, request]) => [root, request.mock.calls.length])),
  ).toEqual({ journal: 2, wishes: 2, claims: 2, garden: 1, notes: 1 });
  for (const tag of ["events", "x", "__proto__"]) await refreshForPush(client, tag);
  expect(Object.values(requests).map((request) => request.mock.calls.length)).toEqual([2, 2, 2, 1, 1]);
  client.clear();
});

it("garden pushes refresh every garden detail and stars; notes pushes refresh only notes", async () => {
  const client = createServerQueryClient();
  const keys = [
    ["garden"],
    ["garden", "stars"],
    ["garden", "stage", "in_love"],
    ["garden", "decisions", "in_love"],
    ["garden", "deck", "x"],
    ["notes"],
    ["boxes"],
  ];
  const requests = keys.map(() => vi.fn(async () => "data"));
  for (const [index, queryKey] of keys.entries()) await client.query({ queryKey, queryFn: requests[index]! });
  await refreshForPush(client, "garden");
  expect(requests.map((request) => request.mock.calls.length)).toEqual([2, 2, 2, 2, 2, 1, 1]);
  await refreshForPush(client, "notes");
  expect(requests.map((request) => request.mock.calls.length)).toEqual([2, 2, 2, 2, 2, 2, 1]);
  client.clear();
});

it("launch and push can refresh restored queries before any screen registers their fetch functions", async () => {
  const saved = createServerQueryClient();
  saved.setQueryData(["wishes"], { open: [], received: [], partnerJarEmpty: true });
  saved.setQueryData(["journal"], { pages: [{ entries: [], nextCursor: null }], pageParams: [undefined] });
  saved.setQueryData(["garden", "deck", "x"], { cached: true });
  const client = createServerQueryClient();
  hydrate(client, dehydrate(saved));
  saved.clear();
  const wishes = vi
    .spyOn(api, "wishes")
    .mockResolvedValue({ ok: true, data: { open: [], received: [], partnerJarEmpty: false } });
  const journal = vi.spyOn(api, "journal").mockResolvedValue({ ok: true, data: { entries: [], nextCursor: null } });
  const deck = vi.spyOn(api, "gardenDeck").mockResolvedValue({ ok: false, status: 503, error: null });
  await refreshServerData(client);
  expect(wishes).toHaveBeenCalledOnce();
  expect(journal).toHaveBeenCalledOnce();
  expect(client.getQueryData(["journal"])).toEqual({
    pages: [{ entries: [], nextCursor: null }],
    pageParams: [undefined],
  });
  await refreshForPush(client, "garden");
  expect(deck).toHaveBeenCalledWith("x");
  client.clear();
});

it("foreground refresh refetches observed details while leaving closed details invalidated", async () => {
  const client = createServerQueryClient();
  const open = vi.fn(async () => "open");
  const closed = vi.fn(async () => "closed");
  const openOptions = { queryKey: ["garden", "deck", "open"], queryFn: open };
  await client.query(openOptions);
  await client.query({ queryKey: ["boxes", "closed"], queryFn: closed });
  const observer = new QueryObserver(client, openOptions);
  const leave = observer.subscribe(() => {});
  await refreshServerData(client);
  expect(open).toHaveBeenCalledTimes(2);
  expect(closed).toHaveBeenCalledOnce();
  expect(client.getQueryState(["boxes", "closed"])?.isInvalidated).toBe(true);
  leave();
  client.clear();
});

it("overlapping push and foreground refreshes join each running list request", async () => {
  const client = createServerQueryClient();
  let refreshing = false;
  let finish!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const requests = ["journal", "wishes", "claims", "notes"].map((root) => ({
    root,
    request: vi.fn(async () => (refreshing ? pending : "cached")),
  }));
  for (const { root, request } of requests) await client.query({ queryKey: [root], queryFn: request });
  refreshing = true;
  const refreshes = [refreshForPush(client, "journal"), refreshServerData(client)];
  await vi.dynamicImportSettled();
  finish("fresh");
  await Promise.all(refreshes);
  expect(requests.map(({ request }) => request.mock.calls.length)).toEqual([2, 2, 2, 2]);
  client.clear();
});

it("overlapping foreground refreshes also join an observed detail request", async () => {
  const client = createServerQueryClient();
  let finish!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const request = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockImplementation(() => pending);
  const options = { queryKey: ["boxes", "open"], queryFn: request };
  await client.query(options);
  const observer = new QueryObserver(client, options);
  const leave = observer.subscribe(() => {});
  const refreshes = [refreshServerData(client), refreshServerData(client)];
  await vi.dynamicImportSettled();
  finish("fresh");
  await Promise.all(refreshes);
  expect(request).toHaveBeenCalledTimes(2);
  leave();
  client.clear();
});

it("reopening a list retries its failed background refresh once while healthy data stays cached", async () => {
  const client = createServerQueryClient();
  const request = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue("recovered");
  const healthy = vi.fn(async () => "healthy");
  const options = { queryKey: ["wishes"], queryFn: request };
  const control = { queryKey: ["push"], queryFn: healthy };
  await client.query(options);
  await client.query(control);
  await refreshServerData(client);
  expect(client.getQueryState(["wishes"])).toMatchObject({ status: "error", data: "cached" });
  const observer = new QueryObserver(client, options);
  const healthyObserver = new QueryObserver(client, control);
  const leave = observer.subscribe(() => {});
  const leaveHealthy = healthyObserver.subscribe(() => {});
  await vi.waitFor(() => expect(observer.getCurrentResult()).toMatchObject({ status: "success", data: "recovered" }));
  expect(request).toHaveBeenCalledTimes(3);
  expect(healthy).toHaveBeenCalledOnce();
  leave();
  leaveHealthy();
  client.clear();
});

it("every content push tag emitted by the Worker refreshes a cached query root", async () => {
  const source = readFileSync(new URL("../src/worker/lib/notify.ts", import.meta.url), "utf8");
  const tags = new Set([...source.matchAll(/tag:\s*["']([^"']+)["']/g)].map((match) => match[1]!));
  tags.delete("events");
  tags.delete("bisou");
  expect(tags.size).toBeGreaterThan(0);
  const client = createServerQueryClient();
  const requests = ["journal", "wishes", "claims", "garden", "notes", "boxes"].map((root) => ({
    root,
    request: vi.fn(async () => "cached"),
  }));
  for (const { root, request } of requests) await client.query({ queryKey: [root], queryFn: request });
  for (const tag of tags) {
    for (const { request } of requests) request.mockClear();
    await refreshForPush(client, tag);
    expect(
      requests.some(({ request }) => request.mock.calls.length > 0),
      `unmapped Worker tag: ${tag}`,
    ).toBe(true);
  }
  client.clear();
});

it("a partner push starts a new request after an older foreground fetch is already in flight", async () => {
  const client = createServerQueryClient();
  let completeOld!: (value: string) => void;
  const oldResponse = new Promise<string>((resolve) => {
    completeOld = resolve;
  });
  const request = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockImplementationOnce(() => oldResponse)
    .mockResolvedValueOnce("after push");
  await client.query({ queryKey: ["notes"], queryFn: request });
  const foreground = refreshServerData(client);
  await vi.dynamicImportSettled();
  expect(request).toHaveBeenCalledTimes(2);
  const push = refreshForPush(client, "notes");
  await vi.dynamicImportSettled();
  const callsAfterPush = request.mock.calls.length;
  completeOld("before push");
  await Promise.all([foreground, push]);
  expect(callsAfterPush).toBe(3);
  expect(client.getQueryData(["notes"])).toBe("after push");
  client.clear();
});

it("a push refresh does not cancel a running journal load-more", async () => {
  const client = createServerQueryClient();
  let finish!: (value: { entries: []; nextCursor: null }) => void;
  const queryFn = vi.fn(async ({ pageParam }: { pageParam: string | undefined }) =>
    pageParam
      ? new Promise<{ entries: []; nextCursor: null }>((resolve) => {
          finish = resolve;
        })
      : { entries: [] as [], nextCursor: "c2" as unknown as null },
  );
  const options = {
    queryKey: ["journal"],
    queryFn,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor ?? undefined,
  };
  const observer = new InfiniteQueryObserver(client, options);
  const leave = observer.subscribe(() => {});
  await observer.refetch();
  void observer.fetchNextPage();
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  const push = refreshForPush(client, "journal");
  await vi.dynamicImportSettled();
  finish({ entries: [], nextCursor: null });
  await push;
  expect(queryFn).toHaveBeenCalledTimes(2);
  expect(client.getQueryData<{ pages: unknown[] }>(["journal"])?.pages).toHaveLength(2);
  leave();
  client.clear();
});

it.each(["foreground", "push"])(
  "a %s refresh trims the journal only after success while it is unobserved",
  async (source) => {
    const client = createServerQueryClient();
    const page = (nextCursor: string | null) => ({ entries: [], nextCursor });
    const key = queries.journal.queryKey;
    const cached = { pages: [page("c2"), page("c3"), page(null)], pageParams: [undefined, "c2", "c3"] };
    client.setQueryData(key, cached);
    const refresh = () => (source === "foreground" ? refreshServerData(client) : refreshForPush(client, "journal"));
    const journal = vi
      .spyOn(api, "journal")
      .mockResolvedValueOnce({ ok: false, status: 0, error: null })
      .mockImplementation(async (cursor) => ({
        ok: true,
        data: page(cursor === "c2" ? "c3" : cursor === "c3" ? null : "c2"),
      }));
    await refresh();
    expect(journal.mock.calls).toEqual([[undefined]]);
    expect(client.getQueryState(key)).toMatchObject({ status: "error", data: cached });

    let finish!: (result: Awaited<ReturnType<typeof api.journal>>) => void;
    journal.mockClear().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = refresh();
    await vi.waitFor(() => expect(journal.mock.calls).toEqual([[undefined]]));
    const observer = new InfiniteQueryObserver(client, queries.journal);
    const leave = observer.subscribe(() => {});
    expect(observer.getCurrentResult().data).toEqual(cached);
    finish({ ok: true, data: page("c2") });
    await pending;
    expect(client.getQueryData(key)).toEqual(cached);

    journal.mockClear();
    await refresh();
    expect(journal.mock.calls).toEqual([[undefined], ["c2"], ["c3"]]);
    expect(client.getQueryData(key)).toEqual(cached);

    leave();
    journal.mockClear();
    await refresh();
    expect(journal.mock.calls).toEqual([[undefined]]);
    expect(client.getQueryData(key)).toEqual({ pages: [page("c2")], pageParams: [undefined] });
    client.clear();
  },
);

it("restored garden queries with an unknown level id are not refetched", async () => {
  const client = createServerQueryClient();
  client.setQueryData(["garden", "stage", "in_love"], { cached: true });
  client.setQueryData(["garden", "stage", "bogus"], { cached: true });
  client.setQueryData(["garden", "decisions", "bogus"], { cached: true });
  const stage = vi.spyOn(api, "gardenStage").mockResolvedValue({ ok: false, status: 503, error: null });
  const decisions = vi.spyOn(api, "gardenStageDecisions").mockResolvedValue({ ok: false, status: 503, error: null });
  await refreshForPush(client, "garden");
  expect(stage.mock.calls).toEqual([["in_love"]]);
  expect(decisions).not.toHaveBeenCalled();
  for (const part of ["stage", "decisions"]) {
    expect(client.getQueryState(["garden", part, "bogus"])).toMatchObject({
      status: "success",
      fetchStatus: "idle",
      error: null,
      data: { cached: true },
    });
  }
  client.clear();
});

it("a query counts as failed only while it is not refetching", () => {
  expect(isFailed({ isError: true, isFetching: false })).toBe(true);
  expect(isFailed({ isError: true, isFetching: true })).toBe(false);
  expect(isFailed({ isError: false, isFetching: false })).toBe(false);
});

it("journal-comments AC4: a journal push refreshes both the feed count and an open entry's comments", async () => {
  const writer = createServerQueryClient();
  const reader = createServerQueryClient();
  const entry: JournalEntry = {
    id: "shared",
    authorId: "an",
    source: "partner",
    date: "2026-11-20",
    createdAt: 1,
    updatedAt: 1,
    photoIds: [],
    text: "Story",
    commentCount: 0,
  };
  const comment = { id: "new", authorId: "an", authorName: "An", text: "Reply", createdAt: 2 };
  const feed = vi.spyOn(api, "journal").mockResolvedValue({ ok: true, data: { entries: [entry], nextCursor: null } });
  const list = vi.spyOn(api, "journalComments").mockResolvedValue({ ok: true, data: { comments: [] } });
  await writer.infiniteQuery(queries.journal);
  await writer.query(queries.journalComments(entry.id));
  hydrate(reader, dehydrate(writer));
  const open = new QueryObserver(reader, queries.journalComments(entry.id));
  const close = open.subscribe(() => {});
  await open.refetch();
  feed.mockResolvedValue({ ok: true, data: { entries: [{ ...entry, commentCount: 1 }], nextCursor: null } });
  list.mockResolvedValue({ ok: true, data: { comments: [comment] } });
  await refreshForPush(reader, "journal");
  expect(reader.getQueryData(queries.journal.queryKey)?.pages[0]?.entries[0]?.commentCount).toBe(1);
  expect(open.getCurrentResult().data?.comments).toEqual([comment]);
  close();
  writer.clear();
  reader.clear();
});

it.each(["mutation", "push"] as const)(
  "journal-comments AC4: a %s supersedes a pending first comment read",
  async (trigger) => {
    const client = createServerQueryClient();
    const comment = { id: "new", authorId: "an", authorName: "An", text: "Reply", createdAt: 2 };
    type CommentResponse = Awaited<ReturnType<typeof api.journalComments>>;
    let finishFirst!: (value: CommentResponse) => void;
    const first = new Promise<CommentResponse>((resolve) => {
      finishFirst = resolve;
    });
    const read = vi
      .spyOn(api, "journalComments")
      .mockReturnValueOnce(first)
      .mockResolvedValue({ ok: true, data: { comments: [comment] } });
    const options = queries.journalComments("shared");
    const observer = new QueryObserver(client, options);
    const close = observer.subscribe(() => {});
    expect(read).toHaveBeenCalledTimes(1);
    const mutation = client.getMutationCache().build(
      client,
      apiMutationOptions(client, async () => ({ ok: true as const, data: { comment } }), ["journal"]),
    );
    const refetch = vi.spyOn(client, "refetchQueries");
    const refresh = trigger === "push" ? refreshForPush(client, "journal") : mutation.execute([]);
    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());
    finishFirst({ ok: true, data: { comments: [] } });
    await refresh;
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.comments).toEqual([comment]));
    expect(read).toHaveBeenCalledTimes(2);
    close();
    client.clear();
  },
);

it("journal-comments AC4: a fresh thread is reused on reopen and an inactive push defers its read", async () => {
  const client = createServerQueryClient();
  const read = vi.spyOn(api, "journalComments").mockResolvedValue({ ok: true, data: { comments: [] } });
  const options = queries.journalComments("shared");
  await client.query(options);
  const observer = new QueryObserver(client, options);
  const close = observer.subscribe(() => {});
  expect(read).toHaveBeenCalledTimes(1);
  close();
  await refreshForPush(client, "journal");
  expect(read).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(options.queryKey)?.isInvalidated).toBe(true);
  const closeAgain = observer.subscribe(() => {});
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  closeAgain();
  client.clear();
});

it.each(["mutation", "push"] as const)(
  "journal-comments AC4: a journal %s supersedes a pending first feed response",
  async (trigger) => {
    const client = createServerQueryClient();
    const entry: JournalEntry = {
      id: "shared",
      authorId: "an",
      source: "partner",
      date: "2026-11-20",
      createdAt: 1,
      updatedAt: 1,
      photoIds: [],
      text: "Story",
      commentCount: 0,
    };
    type FeedResponse = Awaited<ReturnType<typeof api.journal>>;
    let finishFirst!: (value: FeedResponse) => void;
    const first = new Promise<FeedResponse>((resolve) => {
      finishFirst = resolve;
    });
    const read = vi
      .spyOn(api, "journal")
      .mockReturnValueOnce(first)
      .mockResolvedValue({ ok: true, data: { entries: [{ ...entry, commentCount: 1 }], nextCursor: null } });
    const observer = new InfiniteQueryObserver(client, queries.journal);
    const close = observer.subscribe(() => {});
    expect(read).toHaveBeenCalledTimes(1);
    const mutation = client.getMutationCache().build(
      client,
      apiMutationOptions(client, async () => ({ ok: true as const, data: {} }), ["journal"]),
    );
    const refetch = vi.spyOn(client, "refetchQueries");
    const refresh = trigger === "push" ? refreshForPush(client, "journal") : mutation.execute([]);
    try {
      await vi.waitFor(() => expect(refetch).toHaveBeenCalled());
      finishFirst({ ok: true, data: { entries: [entry], nextCursor: null } });
      await refresh;
      await vi.waitFor(() => expect(observer.getCurrentResult().data?.pages[0]?.entries[0]?.commentCount).toBe(1));
      expect(read).toHaveBeenCalledTimes(2);
    } finally {
      close();
      client.clear();
    }
  },
);

it("shared wishes: a restored list refetches on foreground and on a journal push", async () => {
  const client = createServerQueryClient();
  const request = vi.spyOn(api, "sharedWishes").mockResolvedValue({ ok: true, data: { open: [], done: [] } });
  // Persisted data has no fetch function until the screen mounts; the list registry supplies it.
  client.setQueryData(queries.sharedWishes.queryKey, { open: [], done: [] });
  await refreshServerData(client);
  expect(request).toHaveBeenCalledOnce();
  await refreshForPush(client, "journal");
  expect(request).toHaveBeenCalledTimes(2);
  client.clear();
});
