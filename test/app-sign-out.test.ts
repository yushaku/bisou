import type { ReactElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../src/client/App";
import { api } from "../src/client/api";
import { readCache, readSeen, writeCache, writeSeen } from "../src/client/lib/cardBox";
import { bootCacheNow, saveBootCache, startBoot } from "../src/client/lib/bootSession";
import { memoryBackend, scopedStore, useDeviceBackend } from "../src/client/lib/deviceStore";

const hooks = vi.hoisted(() => ({ effects: [] as (() => unknown)[], setAuth: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: () => [{ status: "signedIn", user: { id: "u" }, coupleId: "c" }, hooks.setAuth],
  useEffect: (effect: () => unknown) => hooks.effects.push(effect),
  useCallback: (callback: unknown) => callback,
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

afterEach(() => { hooks.effects = []; vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

function signedIn() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  writeCache("c:u", "list", []);
  writeSeen("c:u", "sample", ["a"]);
  values.set("bisou.locale", "vi");
  const routes = App().props.children as ReactElement<{ children: ReactElement }>[];
  const main = routes.at(-1)!.props.children;
  const screen = (main.type as () => ReactElement<{ onSignedOut: () => void }>)();
  return { values, onSignedOut: screen.props.onSignedOut };
}

it("card-box R61: child 401 sign-out clears cached boxes and seen history before showing login", () => {
  const { values, onSignedOut } = signedIn();
  onSignedOut();
  expect(readCache("c:u", "list")).toBeNull();
  expect(readSeen("c:u", "sample")).toEqual([]);
  expect([...values]).toEqual([["bisou.locale", "vi"]]);
  expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" });
});

it("card-box R61: an expired session on app startup clears cached boxes and seen history", async () => {
  const { values } = signedIn();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 401, error: null });
  hooks.effects[0]!();
  await vi.waitFor(() => expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" }));
  expect([...values]).toEqual([["bisou.locale", "vi"]]);
});

it("card-box R44: a network failure on app startup keeps cached boxes and seen history", async () => {
  const { values } = signedIn();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 0, error: null });
  hooks.effects[0]!();
  await vi.waitFor(() => expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" }));
  expect(readCache("c:u", "list")).toEqual([]);
  expect(readSeen("c:u", "sample")).toEqual(["a"]);
  expect(values.get("bisou.locale")).toBe("vi");
});

async function seedDevice() {
  const backend = memoryBackend();
  useDeviceBackend(backend);
  await saveBootCache(scopedStore(), { id: "u" } as never, null);
  await backend.set("rq:u:unpaired", "{}");
  return backend;
}

it("persisted data R1: child 401 sign-out wipes the boot cache and query cache on the device", async () => {
  const { onSignedOut } = signedIn();
  const backend = await seedDevice();
  expect(backend.data.size).toBe(2);
  onSignedOut();
  await vi.waitFor(() => expect(backend.data.size).toBe(0));
});

it("persisted data R1: an expired session on app startup wipes the device cache", async () => {
  signedIn();
  const backend = await seedDevice();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 401, error: null });
  hooks.effects[0]!();
  await vi.waitFor(() => expect(backend.data.size).toBe(0));
});

it("persisted data R2: offline at startup with a cached session stays signed in and keeps the cache", async () => {
  signedIn();
  const backend = await seedDevice();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 0, error: null });
  vi.spyOn(api, "couple").mockResolvedValue({ ok: false, status: 0, error: null });
  await startBoot(() => Promise.resolve()).cache;
  expect(bootCacheNow()?.user.id).toBe("u");
  hooks.effects[0]!();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(hooks.setAuth).not.toHaveBeenCalled();
  expect(backend.data.size).toBe(2);
});
