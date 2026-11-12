import type { ReactElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../src/client/App";
import { api } from "../src/client/api";
import { readCache, readSeen, writeCache, writeSeen } from "../src/client/lib/cardBox";

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

it("R61: child 401 sign-out clears cached boxes and seen history before showing login", () => {
  const { values, onSignedOut } = signedIn();
  onSignedOut();
  expect(readCache("c:u", "list")).toBeNull();
  expect(readSeen("c:u", "sample")).toEqual([]);
  expect([...values]).toEqual([["bisou.locale", "vi"]]);
  expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" });
});

it("R61: an expired session on app startup clears cached boxes and seen history", async () => {
  const { values } = signedIn();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 401, error: null });
  hooks.effects[0]!();
  await vi.waitFor(() => expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" }));
  expect([...values]).toEqual([["bisou.locale", "vi"]]);
});

it("R44: a network failure on app startup keeps cached boxes and seen history", async () => {
  const { values } = signedIn();
  vi.spyOn(api, "me").mockResolvedValue({ ok: false, status: 0, error: null });
  hooks.effects[0]!();
  await vi.waitFor(() => expect(hooks.setAuth).toHaveBeenCalledWith({ status: "signedOut" }));
  expect(readCache("c:u", "list")).toEqual([]);
  expect(readSeen("c:u", "sample")).toEqual(["a"]);
  expect(values.get("bisou.locale")).toBe("vi");
});
