import { afterEach, describe, expect, it, vi } from "vitest";
import { api, photoUrl } from "../src/client/api";
import { addPage, groupByDay, refreshFirstPage, removeEntry, upsertEntry } from "../src/client/lib/journalFeed";
import type { EntryInput, JournalEntry } from "../src/shared/types";

// Client data layer only: fetch is mocked, no Worker involved.

function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "e1",
    authorId: "an",
    date: "2026-11-05",
    text: "Our first evening on Bisou",
    source: "partner",
    photoIds: [],
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async (_path: string, _init?: RequestInit) => Response.json(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("journal api client", () => {
  it("AC8 (R12): reads the first page without a cursor and the next page with it", async () => {
    const fn = mockFetch(200, { entries: [entry()], nextCursor: "abc+/=" });
    const first = await api.journal();
    expect(fn.mock.calls[0]?.[0]).toBe("/api/journal");
    expect(fn.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(first).toEqual({ ok: true, data: { entries: [entry()], nextCursor: "abc+/=" } });

    await api.journal("abc+/=");
    expect(fn.mock.calls[1]?.[0]).toBe("/api/journal?cursor=abc%2B%2F%3D");
  });

  it("AC2 (R3): createEntry posts the input and surfaces the error code", async () => {
    const input: EntryInput = { date: "2026-11-06", text: "", photoIds: [] };
    const fn = mockFetch(400, { error: "entry_empty" });
    const res = await api.createEntry(input);
    expect(fn.mock.calls[0]?.[0]).toBe("/api/journal");
    expect(fn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fn.mock.calls[0]?.[1]?.body))).toEqual(input);
    expect(res).toEqual({ ok: false, status: 400, error: { error: "entry_empty" } });
  });

  it("AC9 (R10): updateEntry puts a full replace to the entry path", async () => {
    const input: EntryInput = { date: "2026-11-05", text: "fixed typo", photoIds: ["p1"] };
    const fn = mockFetch(200, { entry: entry({ text: "fixed typo", photoIds: ["p1"] }) });
    const res = await api.updateEntry("e/1", input);
    expect(fn.mock.calls[0]?.[0]).toBe("/api/journal/e%2F1");
    expect(fn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(JSON.parse(String(fn.mock.calls[0]?.[1]?.body))).toEqual(input);
    expect(res.ok && res.data.entry.text).toBe("fixed typo");
  });

  it("AC10 (R11): deleteEntry sends DELETE and maps not_author", async () => {
    const fn = mockFetch(403, { error: "not_author" });
    const res = await api.deleteEntry("e1");
    expect(fn.mock.calls[0]?.[0]).toBe("/api/journal/e1");
    expect(fn.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(res).toEqual({ ok: false, status: 403, error: { error: "not_author" } });
  });

  it("returns status 0 when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await api.journal()).toEqual({ ok: false, status: 0, error: null });
  });

  it("AC13 (R18): photoUrl points at one of the two square renditions", () => {
    expect(photoUrl("p1", "thumb")).toBe("/api/photos/p1/thumb");
    expect(photoUrl("p1", "full")).toBe("/api/photos/p1/full");
  });
});

const ids = (list: JournalEntry[]) => list.map((e) => e.id);

describe("journal feed state", () => {
  // Running example: on 7 November both see 6 Nov (Binh 22:00, Binh 12:30), 5 Nov (An), 12 Feb 2023 (Binh).
  const lunch = entry({ id: "lunch", authorId: "binh", date: "2026-11-06", createdAt: 1_000 });
  const rain = entry({ id: "rain", authorId: "binh", date: "2026-11-06", createdAt: 2_000 });
  const first = entry({ id: "first", authorId: "an", date: "2026-11-05", createdAt: 500 });
  const lake = entry({ id: "lake", authorId: "binh", date: "2023-02-12", createdAt: 3_000 });

  it("AC5 (R13): within a day the most recently written entry comes first", () => {
    const state = addPage({ entries: [], nextCursor: "c" }, { entries: [lunch, rain], nextCursor: null });
    expect(ids(state.entries)).toEqual(["rain", "lunch"]);
  });

  it("AC6 (R7, R14): a back-filled day sorts after newer days and empty days never appear", () => {
    const state = addPage({ entries: [], nextCursor: "c" }, { entries: [lake, first, lunch, rain], nextCursor: null });
    expect(groupByDay(state.entries).map((g) => [g.date, ids(g.entries)])).toEqual([
      ["2026-11-06", ["rain", "lunch"]],
      ["2026-11-05", ["first"]],
      ["2023-02-12", ["lake"]],
    ]);
  });

  it("ties on day and time fall back to id, newest first", () => {
    const a = entry({ id: "a", createdAt: 5 });
    const b = entry({ id: "b", createdAt: 5 });
    expect(ids(addPage({ entries: [a], nextCursor: null }, { entries: [b], nextCursor: null }).entries)).toEqual(["b", "a"]);
  });

  it("AC15 (R12, R21): a day split across pages merges into one group with no duplicates or gaps", () => {
    const page1 = addPage({ entries: [], nextCursor: "c" }, { entries: [rain], nextCursor: "c1" });
    // The server repeats nothing, but a refresh or a local insert may already hold an entry of the next page.
    const page2 = addPage(page1, { entries: [rain, lunch, first], nextCursor: "c2" });
    expect(ids(page2.entries)).toEqual(["rain", "lunch", "first"]);
    expect(page2.nextCursor).toBe("c2");
    expect(groupByDay(page2.entries)[0]?.entries).toHaveLength(2);
    const end = addPage(page2, { entries: [lake], nextCursor: null });
    expect(ids(end.entries)).toEqual(["rain", "lunch", "first", "lake"]);
    expect(end.nextCursor).toBeNull();
  });

  it("AC8 (R9): a newly saved entry goes to the top without refetching, and an edit replaces it", () => {
    const loaded = { entries: [lunch, first], nextCursor: "c1" };
    const saved = upsertEntry(loaded, rain);
    expect(ids(saved.entries)).toEqual(["rain", "lunch", "first"]);
    expect(saved.nextCursor).toBe("c1");
    const moved = upsertEntry(saved, { ...rain, date: "2023-02-12" });
    expect(ids(moved.entries)).toEqual(["lunch", "first", "rain"]);
  });

  it("AC8, AC10 (R9, R20): a refresh of page 1 adds the partner's new entry, drops a deleted one and keeps older pages", () => {
    const loaded = { entries: [rain, lunch, first, lake], nextCursor: "deep" };
    // Partner deleted lunch and wrote fresh; page 1 now ends at first.
    const fresh = entry({ id: "fresh", date: "2026-11-07", createdAt: 4_000 });
    const next = refreshFirstPage(loaded, { entries: [fresh, rain, first], nextCursor: "c-first" });
    expect(ids(next.entries)).toEqual(["fresh", "rain", "first", "lake"]);
    expect(next.nextCursor).toBe("deep");
  });

  it("AC10 (R11): a deleted entry leaves the feed and its day goes when it was the last one", () => {
    const loaded = { entries: [rain, lunch, first, lake], nextCursor: "deep" };
    const gone = removeEntry(loaded, "first");
    expect(ids(gone.entries)).toEqual(["rain", "lunch", "lake"]);
    expect(gone.nextCursor).toBe("deep");
    expect(groupByDay(gone.entries).map((g) => g.date)).toEqual(["2026-11-06", "2023-02-12"]);
    expect(groupByDay(removeEntry(gone, "rain").entries)[0]?.entries.map((e) => e.id)).toEqual(["lunch"]);
  });

  it("AC9 (R10): an edit that moves the day keeps the entry once, under its new day, in written order", () => {
    const loaded = { entries: [rain, lunch, first], nextCursor: null };
    const moved = upsertEntry(loaded, { ...first, date: "2026-11-06", updatedAt: 9_000 });
    expect(groupByDay(moved.entries).map((g) => [g.date, ids(g.entries)])).toEqual([["2026-11-06", ["rain", "lunch", "first"]]]);
  });

  it("a refresh that returns the whole journal replaces everything", () => {
    const loaded = { entries: [rain, lunch, first], nextCursor: null };
    const next = refreshFirstPage(loaded, { entries: [rain, first], nextCursor: null });
    expect(ids(next.entries)).toEqual(["rain", "first"]);
    expect(next.nextCursor).toBeNull();
  });

  it("a refresh after reaching the end keeps the end", () => {
    const loaded = { entries: [rain, lunch, first, lake], nextCursor: null };
    const fresh = entry({ id: "fresh", date: "2026-11-07", createdAt: 4_000 });
    const next = refreshFirstPage(loaded, { entries: [fresh, rain], nextCursor: "c-rain" });
    expect(ids(next.entries)).toEqual(["fresh", "rain", "lunch", "first", "lake"]);
    expect(next.nextCursor).toBeNull();
  });
});
