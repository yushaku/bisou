import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import type { Couple, User } from "../src/shared/types";
import { BUILD_ID, CACHE_MAX_AGE, devicePersistOptions, dropOtherScopes, queryCacheKey, queryScope } from "../src/client/lib/devicePersist";
import { memoryBackend, scopedStore, useDeviceBackend } from "../src/client/lib/deviceStore";
import { meOutcome, readBootCache, saveBootCache, validBootCache, wipeDeviceData } from "../src/client/lib/bootSession";
import { createServerQueryClient } from "../src/client/lib/serverQuery";

const user = (id: string): User => ({ id, email: `${id}@example.com`, displayName: id, birthDate: null, avatarId: null, locale: "vi", createdAt: 1 });
const couple = (id: string): Couple => ({ id, startDate: null, events: [], members: [] });
const options = (client: QueryClient, scope: string, store = scopedStore()) => ({ ...devicePersistOptions(store, scope), queryClient: client });
let backend = memoryBackend();

beforeEach(() => { backend = memoryBackend(); useDeviceBackend(backend); });

describe("persisted server data", () => {
  it("restores saved queries for the same scope", async () => {
    const a = createServerQueryClient();
    a.setQueryData(["wishes"], { wishes: ["w"] });
    await persistQueryClientSave(options(a, "u1:c1"));
    const b = createServerQueryClient();
    await persistQueryClientRestore(options(b, "u1:c1"));
    expect(b.getQueryData(["wishes"])).toEqual({ wishes: ["w"] });
  });

  it("discards data saved by another build (cache buster)", async () => {
    const a = createServerQueryClient();
    a.setQueryData(["wishes"], { wishes: ["w"] });
    await persistQueryClientSave({ ...options(a, "u1:c1"), buster: "older-build" });
    expect(BUILD_ID).not.toBe("older-build");
    const b = createServerQueryClient();
    await persistQueryClientRestore(options(b, "u1:c1"));
    expect(b.getQueryData(["wishes"])).toBeUndefined();
    expect(backend.data.has(queryCacheKey("u1:c1"))).toBe(false);
  });

  it("discards data older than the 30 day limit", async () => {
    const a = createServerQueryClient();
    a.setQueryData(["wishes"], { wishes: ["w"] });
    await persistQueryClientSave(options(a, "u1:c1"));
    const key = queryCacheKey("u1:c1");
    const saved = JSON.parse(backend.data.get(key)!);
    backend.data.set(key, JSON.stringify({ ...saved, timestamp: Date.now() - CACHE_MAX_AGE - 1000 }));
    const b = createServerQueryClient();
    await persistQueryClientRestore(options(b, "u1:c1"));
    expect(b.getQueryData(["wishes"])).toBeUndefined();
  });

  it("keeps only the first journal page", async () => {
    const a = createServerQueryClient();
    const page = (n: number) => ({ entries: [{ id: `e${n}` }], nextCursor: `c${n}` });
    a.setQueryData(["journal"], { pages: [page(1), page(2), page(3)], pageParams: [undefined, "c1", "c2"] });
    await persistQueryClientSave(options(a, "u1:c1"));
    const stored = JSON.parse(backend.data.get(queryCacheKey("u1:c1"))!);
    const journal = stored.clientState.queries.find((q: { queryKey: string[] }) => q.queryKey[0] === "journal");
    expect(journal.state.data.pages).toEqual([page(1)]);
    expect(journal.state.data.pageParams).toHaveLength(1);
    expect(a.getQueryData<{ pages: unknown[] }>(["journal"])!.pages).toHaveLength(3);
  });

  it("does not persist queries that failed", async () => {
    const a = createServerQueryClient();
    a.setQueryData(["boxes"], { boxes: [] });
    await a.fetchQuery({ queryKey: ["garden"], queryFn: () => Promise.reject(new Error("boom")) }).catch(() => {});
    await persistQueryClientSave(options(a, "u1:c1"));
    const keys = JSON.parse(backend.data.get(queryCacheKey("u1:c1"))!).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0]);
    expect(keys).toEqual(["boxes"]);
  });

  it("never shows one user's or couple's cache to another", async () => {
    const a = createServerQueryClient();
    a.setQueryData(["wishes"], { wishes: ["private"] });
    await persistQueryClientSave(options(a, queryScope("u1", "c1")));
    const other = createServerQueryClient();
    await persistQueryClientRestore(options(other, queryScope("u2", "c1")));
    expect(other.getQueryData(["wishes"])).toBeUndefined();
    await dropOtherScopes(scopedStore(), queryScope("u2", "c1"));
    expect([...backend.data.keys()].filter((k) => k.startsWith("rq:"))).toEqual([]);
  });

  it("keeps the current scope when dropping others", async () => {
    const store = scopedStore();
    await store.set(queryCacheKey("u1:c1"), "x");
    await store.set(queryCacheKey("u2:c1"), "y");
    await store.set("boot", "z");
    await dropOtherScopes(store, "u1:c1");
    expect([...backend.data.keys()].sort()).toEqual(["boot", "rq:u1:c1"]);
  });
});

describe("boot cache", () => {
  it("round-trips the session and primes its query cache for the first render", async () => {
    const store = scopedStore();
    await saveBootCache(store, user("u1"), couple("c1"));
    await store.set(queryCacheKey("u1:c1"), "blob");
    const cache = await readBootCache(scopedStore());
    expect(cache?.user.id).toBe("u1");
    expect(cache?.couple?.id).toBe("c1");
    backend.data.delete(queryCacheKey("u1:c1"));
    expect(await scopedStore().get(queryCacheKey("u1:c1"))).toBe("blob");
  });

  it("discards a boot cache from another build, too old, or malformed", async () => {
    const now = Date.now();
    const good = { v: BUILD_ID, savedAt: now, user: user("u1"), couple: null };
    expect(validBootCache(good, now)).not.toBeNull();
    expect(validBootCache({ ...good, v: "older-build" }, now)).toBeNull();
    expect(validBootCache({ ...good, savedAt: now - CACHE_MAX_AGE - 1 }, now)).toBeNull();
    expect(validBootCache({ ...good, user: {} }, now)).toBeNull();
    expect(validBootCache({ ...good, couple: { id: "c" } }, now)).toBeNull();
    backend.data.set("boot", JSON.stringify({ ...good, v: "older-build" }));
    expect(await readBootCache(scopedStore())).toBeNull();
    expect(backend.data.has("boot")).toBe(false);
  });
});

describe("wiping the device", () => {
  it("removes the boot cache, the query cache and card box data", async () => {
    const values = new Map<string, string>([["bisou.cardBox.v1:c:u:list", "[]"], ["bisou.locale", "vi"]]);
    const storage = { get length() { return values.size; }, key: (i: number) => [...values.keys()][i] ?? null, getItem: (k: string) => values.get(k) ?? null, setItem: () => {}, removeItem: (k: string) => values.delete(k) };
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    try {
      const store = scopedStore();
      await saveBootCache(store, user("u1"), couple("c1"));
      await store.set(queryCacheKey("u1:c1"), "blob");
      await wipeDeviceData();
      expect(backend.data.size).toBe(0);
      expect([...values.keys()]).toEqual(["bisou.locale"]);
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original); else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  it("stops a signed-out session from writing its data back", async () => {
    const client = createServerQueryClient();
    client.setQueryData(["wishes"], { wishes: ["w"] });
    const store = scopedStore();
    await wipeDeviceData();
    await persistQueryClientSave(options(client, "u1:c1", store));
    await saveBootCache(store, user("u1"), null);
    expect(backend.data.size).toBe(0);
  });
});

describe("boot outcome from /api/me", () => {
  const cached = { v: BUILD_ID, savedAt: Date.now(), user: user("u1"), couple: couple("c1") };
  const fail = (status: number) => ({ ok: false as const, status, error: null });

  it("401 signs out and wipes, with or without a cache", () => {
    expect(meOutcome(fail(401), cached)).toEqual({ kind: "signedOut", wipe: true });
    expect(meOutcome(fail(401), null)).toEqual({ kind: "signedOut", wipe: true });
  });

  it("offline (status 0) with a cache stays on the cached Home", () => {
    expect(meOutcome(fail(0), cached)).toEqual({ kind: "keepCached" });
  });

  it("a server error with a cache also stays on the cached Home", () => {
    expect(meOutcome(fail(500), cached)).toEqual({ kind: "keepCached" });
  });

  it("offline without a cache shows login and wipes nothing", () => {
    expect(meOutcome(fail(0), null)).toEqual({ kind: "signedOut", wipe: false });
  });

  it("the same user keeps the cache; a different user wipes it", () => {
    const me = (id: string) => ({ ok: true as const, data: { user: user(id), coupleId: "c1" } });
    expect(meOutcome(me("u1"), cached)).toMatchObject({ kind: "signedIn", wipe: false });
    expect(meOutcome(me("u2"), cached)).toMatchObject({ kind: "signedIn", wipe: true });
    expect(meOutcome(me("u2"), null)).toMatchObject({ kind: "signedIn", wipe: false });
  });
});
