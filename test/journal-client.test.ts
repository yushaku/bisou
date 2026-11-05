import { afterEach, describe, expect, it, vi } from "vitest";
import { api, photoUrl } from "../src/client/api";
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
