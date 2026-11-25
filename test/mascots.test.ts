import { afterEach, expect, it, vi } from "vitest";
import { readMascot, setMascot } from "../src/client/lib/mascots";
import { clearCardBoxCache } from "../src/client/lib/cardBox";

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { location: { href: "http://localhost/settings" } }));
  return values;
}
afterEach(() => {
  storage();
  setMascot("girl");
  vi.unstubAllGlobals();
});
it("defaults to the girl and tolerates unknown or unavailable device storage", () => {
  const values = storage();
  expect(readMascot().id).toBe("girl");
  values.set("bisou.mascot", "unknown");
  expect(readMascot().id).toBe("girl");
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("blocked");
    },
  });
  expect(readMascot().id).toBe("girl");
});
it("keeps the choice on this device across sign out, with a fresh device using the default", () => {
  storage();
  setMascot("boy");
  clearCardBoxCache();
  expect(readMascot().id).toBe("boy");
  storage();
  expect(readMascot().id).toBe("girl");
});

it("applies a session choice even when storage can be read but writes are blocked", () => {
  storage();
  vi.stubGlobal("localStorage", {
    getItem: () => "girl",
    setItem() {
      throw new Error("quota");
    },
  });
  setMascot("boy");
  expect(readMascot().id).toBe("boy");
});
