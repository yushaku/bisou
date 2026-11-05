import { describe, expect, it } from "vitest";
import { readCreateRequest } from "../src/client/lib/navigation";

describe("creation requests carried by browser history", () => {
  it.each(["journal", "wishes"] as const)("opens the requested %s editor", (create) => {
    expect(readCreateRequest({ create })).toBe(create);
  });

  it.each([null, undefined, "journal", {}, { settingsFrom: "/journal" }, { create: "garden" }, { create: true }])(
    "ignores ordinary navigation or invalid state %j", (state) => {
      expect(readCreateRequest(state)).toBeNull();
    },
  );
});
