import { afterEach, describe, expect, it, vi } from "vitest";
import { readCreateRequest, readShortcutRequest, captureShortcut, tabMove } from "../src/client/lib/navigation";

describe("creation requests carried by browser history", () => {
  it.each(["journal", "wishes", "event", "notes"] as const)("AC9 R12: opens the requested %s editor", (create) => {
    expect(readCreateRequest({ create })).toBe(create);
  });

  it.each([null, undefined, "journal", {}, { from: "/journal" }, { create: "garden" }, { create: true }])(
    "ignores ordinary navigation or invalid state %j", (state) => {
      expect(readCreateRequest(state)).toBeNull();
    },
  );
});

describe("subpage and tab history", () => {
  it.each([
    ["/settings", "/journal", "/journal", undefined, "back"],
    ["/settings", "/journal", "/journal", "journal", "back"],
    ["/settings", "/journal", "/wishes", undefined, "replace"],
    ["/settings", "/journal", "/wishes", "wishes", "replace"],
    ["/events", "/", "/", undefined, "back"],
    ["/journal", undefined, "/journal", undefined, "scroll"],
    ["/journal", undefined, "/journal", "journal", "replace"],
    ["/journal", undefined, "/wishes", undefined, "push"],
    ["/settings", undefined, "/", undefined, "replace"],
    ["/settings/appearance", undefined, "/", undefined, "replace"],
    ["/settings/appearance", "/settings", "/journal", undefined, "replace"],
    ["/events", undefined, "/", undefined, "replace"],
  ] as const)("%s from %s to %s (create %s) uses %s", (location, from, path, create, move) => {
    expect(tabMove(location, from, path, create)).toBe(move);
  });
});

afterEach(() => vi.unstubAllGlobals());
it.each([
  ["/journal", "?compose=1", "journal"], ["/wishes", "?spin=1", "spin"],
  ["/journal", "?compose=0", null], ["/", "?compose=1", null],
  ["/wishes", "?compose=1", null], ["/journal", "?spin=1", null],
])("reads shortcut %s%s", (path, search, expected) => {
  expect(readShortcutRequest(path, search)).toBe(expected);
});
it("carries a cold-start shortcut into the existing create request and consumes its query", () => {
  const replaceState = vi.fn();
  vi.stubGlobal("location", new URL("https://bisou.test/wishes?spin=1&keep=yes#jar"));
  vi.stubGlobal("history", { state: null, replaceState });
  captureShortcut();
  expect(replaceState).toHaveBeenCalledWith({ create: "spin", shortcut: true }, "", "/wishes?keep=yes#jar");
});
