import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { noteBlock, softHints } from "../src/client/lib/notes";
import { I18nProvider } from "../src/client/i18n";
import { TabMemory } from "../src/client/lib/tabMemory";
import { createQueryFixture as createTabMemory } from "./query-fixture";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
const input = { happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" };
afterEach(() => vi.unstubAllGlobals());
test.each([
  ["ALWAYS, never; always", ["always", "never"]],
  ["lúc nào cũng".normalize("NFD"), ["lúc nào cũng"]],
  ["hiện tại anh đang bận, tại sao anh, bao giờ anh về, nevertheless", []],
  ["tại anh và lỗi của em", ["tại anh", "lỗi của em"]],
  [
    "every time and all the time, your fault because of you",
    ["every time", "all the time", "your fault", "because of you"],
  ],
])("notes AC3, notes-journal AC34: soft hints match both languages without rewriting %s", (text, expected) =>
  expect(softHints(text)).toEqual(expected),
);
test("notes AC2: noteBlock counts trimmed code points, requires all parts", () => {
  expect(noteBlock(input)).toBeNull();
  for (const field of ["happened", "feel", "need", "hope"]) {
    expect(noteBlock({ ...input, [field]: "  " })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "\u200b" })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "😀".repeat(500) })).toBeNull();
    expect(noteBlock({ ...input, [field]: "😀".repeat(501) })).toBe("tooLong");
  }
});

test("notes AC32: offline waiting note disables opening without revealing it", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  vi.stubGlobal("navigator", { onLine: false });
  const memory = createTabMemory();
  memory.notes = { fromMe: [], toMe: [{ id: "n", state: "waiting" }] };
  const user = {
    id: "a",
    displayName: "An",
    email: "an@example.com",
    locale: "vi" as const,
    birthDate: null,
    avatarId: null,
    createdAt: 1,
  };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const html = renderToString(
    h(
      I18nProvider,
      null,
      h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} })),
    ),
  );
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Mình sẵn sàng nghe<\/button>/);
  expect(html).not.toContain("Yesterday");
});
