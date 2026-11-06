import { expect, it } from "vitest";
import { displayName } from "../src/client/lib/displayName";
import { en } from "../src/client/i18n/en";
import { vi } from "../src/client/i18n/vi";

it.each([
  [{ displayName: " Mai ", email: "an@example.com" }, "Mai"],
  [{ displayName: null, email: "an@example.com" }, "an"],
  [{ displayName: "  ", email: "an@example.com" }, "an"],
  [{ displayName: null }, null],
  [{ email: "@example.com" }, null],
  [undefined, null],
  [null, null],
])("uses the name, then email local part, then translated neutral word for %j", (person, expected) => {
  for (const messages of [vi, en]) {
    expect(displayName(person, (key) => messages[key])).toBe(expected ?? messages["common.person"]);
  }
});
