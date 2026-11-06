import { describe, expect, it } from "vitest";
import { readCreateRequest, tabMove } from "../src/client/lib/navigation";

describe("creation requests carried by browser history", () => {
  it.each(["journal", "wishes", "event"] as const)("AC9 R12: opens the requested %s editor", (create) => {
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
    ["/events", undefined, "/", undefined, "replace"],
  ] as const)("%s from %s to %s (create %s) uses %s", (location, from, path, create, move) => {
    expect(tabMove(location, from, path, create)).toBe(move);
  });
});
