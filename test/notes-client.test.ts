import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { noteBlock, softHints } from "../src/client/lib/notes";
import { I18nProvider } from "../src/client/i18n";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { Drawer } from "../src/client/components/ui/drawer";
import { NoteForm } from "../src/client/components/bisou/NoteSheet";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
const input = { happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" };
afterEach(() => vi.unstubAllGlobals());
test.each([
  ["ALWAYS, never; always", ["always", "never"]],
  ["lúc nào cũng".normalize("NFD"), ["lúc nào cũng"]],
  ["hiện tại anh đang bận, tại sao anh, bao giờ anh về, nevertheless", []],
  ["tại anh và lỗi của em", ["tại anh", "lỗi của em"]],
  ["every time and all the time, your fault because of you", ["every time", "all the time", "your fault", "because of you"]],
])("notes AC3, notes-journal AC34: soft hints match both languages without rewriting %s", (text, expected) => expect(softHints(text as string)).toEqual(expected));
test("notes AC2: noteBlock counts trimmed code points, requires all parts", () => {
  expect(noteBlock(input)).toBeNull();
  for (const field of ["happened", "feel", "need", "hope"]) {
    expect(noteBlock({ ...input, [field]: "  " })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "\u200b" })).toBe("empty");
    expect(noteBlock({ ...input, [field]: "😀".repeat(500) })).toBeNull();
    expect(noteBlock({ ...input, [field]: "😀".repeat(501) })).toBe("tooLong");
  }
});
test.each(["vi", "en"])("notes AC1 AC31: empty section offers writing to the named partner in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory(); memory.notes = { fromMe: [], toMe: [] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const render = () => renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(render()).toContain(locale === "vi" ? "Chưa có lời nhắn nào" : "No notes yet");
  expect(render()).toContain(locale === "vi" ? "Viết cho Linh" : "Write to Linh");
  couple.members.pop(); expect(render()).toBe("");
});

test("notes R26: an opened recipient note offers reading again", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.notes = { fromMe: [], toMe: [{ id: "n", state: "opened", ...input }] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(html).toContain("Đọc lại");
  expect(html).toContain(">Đã mở<");
  expect(html).toContain('data-seal="broken"');
  expect(html).not.toContain('data-seal="intact"');
  expect(html).toContain("Từ Linh");
  expect(html).toContain("Yesterday");
  expect(html).not.toContain("Viết cho Linh");
});

test("notes AC32: offline waiting note disables opening and explains the connection", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  vi.stubGlobal("navigator", { onLine: false });
  const memory = createTabMemory(); memory.notes = { fromMe: [], toMe: [{ id: "n", state: "waiting" }] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Mình sẵn sàng nghe<\/button>/);
  expect(html).toContain('<p class="text-sm text-muted-foreground">Cần kết nối mạng để tiếp tục</p>');
  expect(html).toContain('data-envelope-state="waiting"');
  expect(html).toMatchSnapshot();
  expect(html).toContain('data-seal="intact"');
  expect(html).toContain('aria-label="Từ Linh, Chưa mở, Mình sẵn sàng nghe"');
  expect(html).toContain('class="note-postmark"');
  expect(html).not.toContain('class="note-address-lines');
  expect(html).not.toContain("Yesterday");
  expect(html).not.toMatch(/<time|\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}/);
  expect(html).toContain("Từ Linh");
  expect(html).not.toContain("Viết cho Linh");
});

test.each(["vi", "en"])("envelope writer states have readable captions and no top write action in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const clock = vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 11, 18, 0).getTime());
  try {
    const memory = createTabMemory();
    memory.notes = { toMe: [], fromMe: [
      { ...input, id: "cooling", state: "draft", sendableAt: new Date(2026, 10, 11, 18, 36).getTime() },
      { ...input, id: "ready", state: "draft", sendableAt: Date.now() - 1 },
      { ...input, id: "sent", state: "sent", sendableAt: 1 },
      { ...input, id: "opened", state: "opened", sendableAt: 1 },
    ] };
    const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
    const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
    const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
    for (const stamp of locale === "vi" ? ["Gửi được từ 18:36", "Đọc lại và gửi", "Chưa mở", "Đã mở"] : ["Can be sent from 18:36", "Reread and send", "Not opened yet", "Opened"]) expect(html).toContain(`>${stamp}<`);
    expect(html).toContain(locale === "vi" ? "Gửi Linh" : "To Linh");
    expect(html).not.toContain(locale === "vi" ? "Viết cho Linh" : "Write to Linh");
    expect(html.match(/<button/g)).toHaveLength(4);
    const cards = html.split('<button').slice(1);
    expect(cards.map((card) => card.includes('class="note-postmark"'))).toEqual([false, false, true, true]);
    expect(cards.map((card) => card.includes('data-seal="intact"'))).toEqual([true, true, true, false]);
    expect(cards.map((card) => card.includes('data-seal="broken"'))).toEqual([false, false, false, true]);
    for (const card of cards) expect(card).toMatch(locale === 'vi' ? /aria-label="Gửi Linh, / : /aria-label="To Linh, /);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  } finally { clock.mockRestore(); }
});

test.each(["vi", "en"])("note form offers immediate, eight-hour and custom delivery in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(Drawer, { open: true }, h(NoteForm, { partnerName: "Linh", onSaved() {}, onRefresh() {}, onSignedOut() {}, onLock() {}, onClose() {}, onDone() {} }))));
  for (const label of locale === "vi" ? ["Gửi ngay", "Sau 8 tiếng", "Tuỳ chọn"] : ["Send now", "In 8 hours", "Custom"]) expect(html).toContain(label);
});

test("scheduled note shows its date and time instead of asking the writer to send", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.notes = { toMe: [], fromMe: [{ ...input, id: "n", state: "draft", sendableAt: Date.now() - 1, scheduledAt: Date.now() - 1 }] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(html).toContain("Hẹn gửi"); expect(html).not.toContain("Đọc lại và gửi");
});
