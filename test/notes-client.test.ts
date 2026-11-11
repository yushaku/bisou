import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { noteBlock, softHints } from "../src/client/lib/notes";
import { I18nProvider } from "../src/client/i18n";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
const input = { happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" };
afterEach(() => vi.unstubAllGlobals());
test.each([
  ["ALWAYS, never; always", ["always", "never"]],
  ["lúc nào cũng".normalize("NFD"), ["lúc nào cũng"]],
  ["hiện tại anh đang bận, tại sao anh, bao giờ anh về, nevertheless", []],
  ["tại anh và lỗi của em", ["tại anh", "lỗi của em"]],
  ["every time and all the time, your fault because of you", ["every time", "all the time", "your fault", "because of you"]],
])("AC3 AC34: soft hints match both languages without rewriting %s", (text, expected) => expect(softHints(text as string)).toEqual(expected));
test("AC2: noteBlock counts trimmed code points, requires all parts", () => {
  expect(noteBlock(input)).toBeNull();
  for (const field of ["happened", "feel", "need", "hope"]) {
    expect(noteBlock({ ...input, [field]: "  " })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "\u200b" })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "😀".repeat(500) })).toBeNull();
    expect(noteBlock({ ...input, [field]: "😀".repeat(501) })).toBe("tooLong");
  }
});
test.each(["vi", "en"])("AC1 AC31: empty section offers writing to the named partner in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory(); memory.notes = { fromMe: [], toMe: [] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const render = () => renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(render()).toContain(locale === "vi" ? "Chưa có lời nhắn nào" : "No notes yet");
  expect(render()).toContain(locale === "vi" ? "Viết cho Linh" : "Write to Linh");
  couple.members.pop(); expect(render()).toBe("");
});
