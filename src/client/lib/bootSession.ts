import type { ApiResult } from "../api";
import { api } from "../api";
import type { Couple, CoupleResponse, MeResponse, User } from "../../shared/types";
import { clearCardBoxCache } from "./cardBox";
import { BUILD_ID, CACHE_MAX_AGE, queryCacheKey, queryScope } from "./devicePersist";
import { primeDeviceValue, scopedStore, wipeDeviceStore, type ScopedStore } from "./deviceStore";

/* The last known session, saved on the device so a returning user sees Home before the network answers. */
export interface BootCache {
  v: string;
  savedAt: number;
  user: User;
  couple: Couple | null;
}

const BOOT_KEY = "boot";

export function validBootCache(value: unknown, now = Date.now()): BootCache | null {
  const c = value as Partial<BootCache> | null;
  if (!c || typeof c !== "object" || c.v !== BUILD_ID) return null;
  if (typeof c.savedAt !== "number" || now - c.savedAt > CACHE_MAX_AGE || c.savedAt > now + 60_000) return null;
  if (!c.user || typeof c.user.id !== "string") return null;
  if (c.couple !== null && !(c.couple && typeof c.couple.id === "string" && Array.isArray(c.couple.members)))
    return null;
  return c as BootCache;
}

export async function readBootCache(store: ScopedStore = scopedStore(), now = Date.now()): Promise<BootCache | null> {
  try {
    const raw = await store.get(BOOT_KEY);
    if (!raw) return null;
    const cache = validBootCache(JSON.parse(raw), now);
    if (!cache) {
      await store.del(BOOT_KEY);
      return null;
    }
    // Read the query cache of this user and couple now, so React can restore it without waiting again.
    const key = queryCacheKey(queryScope(cache.user.id, cache.couple?.id ?? null));
    const queries = await store.get(key);
    if (queries) primeDeviceValue(key, queries);
    return cache;
  } catch {
    return null;
  }
}

export async function saveBootCache(
  store: ScopedStore,
  user: User,
  couple: Couple | null,
  now = Date.now(),
): Promise<void> {
  const cache: BootCache = { v: BUILD_ID, savedAt: now, user, couple };
  try {
    await store.set(BOOT_KEY, JSON.stringify(cache));
  } catch {
    /* The next boot just waits for the network. */
  }
}

/** Sign-out, an expired session or a different user: remove every copy of private data on this device. */
export async function wipeDeviceData(): Promise<void> {
  clearCardBoxCache();
  await wipeDeviceStore();
}

export type MeOutcome =
  | { kind: "signedIn"; user: User; coupleId: string | null; wipe: boolean }
  | { kind: "keepCached" }
  | { kind: "signedOut"; wipe: boolean };

/*
 * What to do when /api/me answers at boot. A cached Home survives being offline (status 0) or a
 * server error; only a 401 or a different user removes it.
 */
export function meOutcome(res: ApiResult<MeResponse>, cached: BootCache | null): MeOutcome {
  if (res.ok)
    return {
      kind: "signedIn",
      user: res.data.user,
      coupleId: res.data.coupleId,
      wipe: Boolean(cached && cached.user.id !== res.data.user.id),
    };
  if (res.status === 401) return { kind: "signedOut", wipe: true };
  if (cached) return { kind: "keepCached" };
  return { kind: "signedOut", wipe: res.status !== 0 };
}

export interface Boot {
  cache: Promise<BootCache | null>;
  me: Promise<ApiResult<MeResponse>>;
  couple: Promise<ApiResult<CoupleResponse>>;
}

let boot: Boot | undefined;
let bootCache: BootCache | null = null;

/** The cache read at boot, available synchronously once main.tsx has waited for it. */
export const bootCacheNow = () => bootCache;

/*
 * Starts everything the first screen needs at once: the device cache, /api/me, /api/couple and the
 * Home chunk. Before this, each step waited for the previous one. Idempotent.
 */
export function startBoot(loadHome: () => Promise<unknown>): Boot {
  if (!boot) {
    const cache = readBootCache().then((value) => (bootCache = value));
    boot = { cache, me: api.me(), couple: api.couple() };
    void loadHome().catch(() => {});
  }
  return boot;
}

export const getBoot = () => boot;
