/*
 * Tiny key/value store on the device (IndexedDB) for the persisted server data and the boot
 * record (ADR 0014). Every failure degrades to "nothing stored": the app still works online.
 */
export interface KeyValueBackend {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

const DB_NAME = "bisou-device";
const STORE = "kv";
// Safari can leave indexedDB.open pending forever; never let that block the first paint.
const OPEN_TIMEOUT_MS = 1500;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function indexedDbBackend(factory: () => IDBFactory | undefined = () => globalThis.indexedDB): KeyValueBackend {
  let opened: Promise<IDBDatabase | null> | undefined;
  const open = () => opened ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const idb = factory();
      if (!idb) return resolve(null);
      const timer = setTimeout(() => resolve(null), OPEN_TIMEOUT_MS);
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => { clearTimeout(timer); resolve(req.result); };
      req.onerror = () => { clearTimeout(timer); resolve(null); };
      req.onblocked = () => { clearTimeout(timer); resolve(null); };
    } catch { resolve(null); }
  });
  async function run<T>(mode: IDBTransactionMode, fallback: T, work: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
    try {
      const db = await open();
      if (!db) return fallback;
      const tx = db.transaction(STORE, mode);
      const done = transactionDone(tx);
      const result = await work(tx.objectStore(STORE));
      await done;
      return result;
    } catch { return fallback; }
  }
  return {
    get: (key) => run("readonly", undefined, async (s) => { const v = await request(s.get(key)); return typeof v === "string" ? v : undefined; }),
    set: (key, value) => run("readwrite", undefined, (s) => { s.put(value, key); }),
    del: (key) => run("readwrite", undefined, (s) => { s.delete(key); }),
    keys: () => run("readonly", [] as string[], async (s) => (await request(s.getAllKeys())).filter((k): k is string => typeof k === "string")),
    clear: () => run("readwrite", undefined, (s) => { s.clear(); }),
  };
}

export function memoryBackend(): KeyValueBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => { data.set(key, value); },
    del: async (key) => { data.delete(key); },
    keys: async () => [...data.keys()],
    clear: async () => { data.clear(); },
  };
}

let backend: KeyValueBackend = indexedDbBackend();
// Values read ahead of React (boot) so the first render does not wait for IndexedDB again.
const primed = new Map<string, string>();
let generation = 0;

/** Tests only: swap the storage backend. */
export function useDeviceBackend(next: KeyValueBackend): void {
  backend = next;
  primed.clear();
  generation++;
}

export interface ScopedStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * A handle whose writes stop working once the device data is wiped. A throttled or in-flight
 * save from a signed-out session therefore cannot write the old user's data back.
 */
export function scopedStore(): ScopedStore {
  const mine = generation;
  const live = () => mine === generation;
  return {
    get: async (key) => {
      const ahead = primed.get(key);
      if (ahead !== undefined) { primed.delete(key); return live() ? ahead : undefined; }
      return live() ? backend.get(key) : undefined;
    },
    set: async (key, value) => { if (live()) await backend.set(key, value); },
    del: async (key) => { if (live()) await backend.del(key); },
    keys: async () => (live() ? backend.keys() : []),
  };
}

export function primeDeviceValue(key: string, value: string): void {
  primed.set(key, value);
}

/** Sign-out, 401 or a different user: remove everything stored on this device by this module. */
export async function wipeDeviceStore(): Promise<void> {
  generation++;
  primed.clear();
  await backend.clear();
}
