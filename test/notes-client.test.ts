import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { noteBlock, softHints } from "../src/client/lib/notes";
import { I18nProvider } from "../src/client/i18n";
import { TabMemory } from "../src/client/lib/tabMemory";
import { createQueryFixture as createTabMemory } from "./query-fixture";
import { Drawer } from "../src/client/components/ui/drawer";
import { Router } from "wouter";
import { Home } from "../src/client/screens/Home";
import { JournalDetailSheet } from "../src/client/components/bisou/JournalDetailSheet";
import { NoteReply } from "../src/client/components/bisou/NoteReply";
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
  expect(html).not.toMatch(/aria-label="[^"]*Yesterday/);
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
  expect(html).toMatch(/<p[^>]*>Cần kết nối mạng để tiếp tục<\/p>/);
  expect(html).toContain('data-envelope-state="waiting"');
  expect(html).toMatchSnapshot();
  expect(html).toContain('data-seal="intact"');
  expect(html).toContain('aria-label="Từ Linh, Mình sẵn sàng nghe"');
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
      { ...input, id: "cooling", state: "draft", scheduledAt: new Date(2026, 10, 11, 18, 36).getTime() },
      { ...input, id: "ready", state: "draft" },
      { ...input, id: "sent", state: "sent" },
      { ...input, id: "opened", state: "opened" },
    ] };
    const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
    const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
    const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
    for (const stamp of locale === "vi" ? ["Hẹn gửi 11 thg 11 18:36", "Đọc lại và gửi", "Chưa mở", "Đã mở"] : ["Scheduled for 11 Nov 18:36", "Reread and send", "Not opened yet", "Opened"]) expect(html).toContain(`>${stamp}<`);
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
  memory.notes = { toMe: [], fromMe: [{ ...input, id: "n", state: "draft", scheduledAt: Date.now() - 1 }] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  expect(html).toContain("Hẹn gửi"); expect(html).not.toContain("Đọc lại và gửi");
});

test.each(["vi", "en"])("Home puts a waiting inbox before the daily question and shop in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory(); memory.notes = { fromMe: [], toMe: [{ id: "n", state: "waiting" }] };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
  const render = () => renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Router, { ssrPath: "/", children: h(Home, { user, couple, onSignedOut() {}, onUser() {}, onCouple() {}, celebrate: false, onCelebrated() {} }) }))));
  const html = render();
  const inbox = html.indexOf("mailbox-wait");
  const daily = html.indexOf('aria-labelledby="today-card"');
  const shop = html.indexOf('aria-labelledby="card-box-title"');
  expect(inbox).toBeGreaterThan(-1); expect(daily).toBeGreaterThan(inbox); expect(shop).toBeGreaterThan(inbox);
  memory.notes = { fromMe: [], toMe: [] };
  expect(render()).not.toContain("mailbox-wait");
});

test.each(["vi", "en"])("A5 option C uses text-first cards, trailing small art and a sealed waiting invitation in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory();
  const longName = "Linh".repeat(35), longWord = "a".repeat(500);
  memory.notes = {
    toMe: [{ id: "waiting", state: "waiting" }, { ...input, id: "received", state: "opened", happened: "Opened recipient preview" }],
    fromMe: [
      { ...input, id: "scheduled", state: "draft", scheduledAt: new Date(2099, 10, 18, 19, 30).getTime(), happened: "Scheduled preview" },
      { ...input, id: "draft", state: "draft", happened: "Legacy draft preview" },
      { ...input, id: "sent", state: "sent", happened: longWord },
      { ...input, id: "opened", state: "opened", happened: "Writer opened\nwith newlines" },
    ],
  };
  const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: longName }] };
  const html = renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(NotesSection, { user, couple, onSignedOut() {} }))));
  const cards = html.split(/<div data-slot="card"/).slice(1);
  expect(cards).toHaveLength(6);
  expect(html.match(/line-clamp-2/g)).toHaveLength(5);
  expect(html.match(/text-base leading-6 font-semibold/g)).toHaveLength(5);
  expect(html).not.toContain("text-xs"); expect(html).not.toContain("truncate");
  expect(html).not.toContain("<text"); expect(html).not.toContain("note-envelope-caption");
  expect(cards[0]).not.toContain("line-clamp-2");
  expect(cards[0]).not.toContain(locale === "vi" ? "Chưa mở" : "Not opened yet");
  expect(cards[0]).not.toContain("Yesterday");
  expect(cards[0]).not.toMatch(/<time|\d{1,2}:\d{2}/);
  expect(cards[0]!.match(/<button/g)).toHaveLength(1);
  expect(cards[0]).toContain("note-envelope-waiting");
  for (const card of cards.slice(1)) {
    expect(card.match(/<button/g)).toHaveLength(1);
    const label = card.match(/aria-label="([^"]*)"/)?.[1];
    expect(label).toBeDefined();
    expect(label).not.toMatch(/preview|aaaa|Writer opened/);
    expect(card.indexOf("note-preview")).toBeLessThan(card.indexOf("note-metadata"));
    expect(card.indexOf("note-metadata")).toBeLessThan(card.indexOf("note-envelope-item"));
  }
  expect(cards.map(card => card.match(/data-envelope-state="([^"]+)"/)?.[1])).toEqual(["waiting", "opened", "cooling", "ready", "sent", "opened"]);
  expect(cards[2]).toContain(locale === "vi" ? "Hẹn gửi 18 thg 11 19:30" : "Scheduled for 18 Nov 19:30");
  for (const card of cards.slice(3)) expect(card).not.toMatch(/<time|\d{1,2}:\d{2}|2099/);
  expect(cards[4]).toContain(longWord);
  expect(html).toContain(longName);
  expect(html).toContain("[overflow-wrap:anywhere]");
  expect(html.match(/<span class="note-envelope-item"[^>]*aria-hidden="true"/g)).toHaveLength(6);
});

test("journal renders only the recipient message", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const html = renderToString(h(I18nProvider, null, h(NoteReply, { reply: { person: { name: "Binh", tone: "secondary" }, line: "Mình muốn nói trực tiếp" } })));
  expect(html).toContain("Binh");
  expect(html).not.toContain("Mình hiểu là...");
  expect(html.match(/Mình muốn nói trực tiếp/g)).toHaveLength(1);
});

test.each(["vi", "en"])("full note detail keeps all four parts and recipient text unclamped in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const parts = { happened: "h".repeat(500), feel: "f".repeat(500), need: "n".repeat(500), hope: "r".repeat(500) };
  const reply = "m".repeat(500);
  const html = renderToString(h(I18nProvider, null, h(JournalDetailSheet, { entry: { id: "e", date: "2026-11-17", author: { name: "An", tone: "primary" }, source: "note", body: "", photos: [], parts, reply: { person: { name: "Binh", tone: "secondary" }, line: reply } }, onOpenPhoto() {} })));
  expect(html.match(/<dt/g)).toHaveLength(4);
  expect(html).not.toContain("line-clamp");
  for (const value of Object.values(parts)) expect(html).toContain(value);
  expect(html).toContain(reply);
  expect(html).not.toContain("note-envelope");
  const header = html.split("</div>")[0]!;
  expect(header).toMatch(new RegExp(`data-slot="badge"[^>]*>${locale === "vi" ? "Lời nhắn nhỏ" : "Kind note"}<`));
  expect(html.indexOf("Binh")).toBeLessThan(html.indexOf(reply));
});
