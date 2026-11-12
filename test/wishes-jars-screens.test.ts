import { readFileSync } from "node:fs";
import { createElement as h, type ComponentProps, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import { Journal } from "../src/client/screens/Journal";
import { Home } from "../src/client/screens/Home";
import { Wishes } from "../src/client/screens/Wishes";
import { I18nProvider } from "../src/client/i18n";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";

const buttons = vi.hoisted(() => new Map<string, () => void>());
vi.mock("wouter/use-browser-location", async (original) => ({
  ...await original<typeof import("wouter/use-browser-location")>(), useHistoryState: vi.fn(() => null),
}));
vi.mock("../src/client/screens/SignedInShell", () => ({ SignedInShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("../src/client/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
    if (onClick) buttons.set(renderToString(h("span", null, children)), onClick);
    return h("button", null, children);
  },
}));

const members = [
  { id: "an", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", displayName: "Bình", birthDate: null, avatarId: null },
];
const couple = { id: "couple", startDate: null, members, events: [] };
const session = {
  user: { ...members[0]!, email: "an@example.com", locale: "vi" as const, createdAt: 1 },
  onUser: () => {}, onSignedOut: () => {},
};

function render(screen: ReactNode) {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  return renderToString(h(Router, { ssrPath: "/wishes",
    children: h(I18nProvider, null, h(TabMemory.Provider, { value: createTabMemory() }, screen)),
  }));
}

afterEach(() => { vi.clearAllMocks(); vi.mocked(useHistoryState).mockReturnValue(null); vi.unstubAllGlobals(); buttons.clear(); });

it.each([0, 1])("wishes R25: puts my jar on the left for partner %i", (index) => {
  const user = { ...session.user, ...members[index]! };
  const html = render(h(Wishes, { ...session, user, couple } satisfies ComponentProps<typeof Wishes>));
  const labels = [...html.matchAll(/<button[^>]*aria-label="(Hũ[^\"]+)"/g)].map((match) => match[1]);
  expect(labels).toEqual([
    `Hũ của ${user.displayName}, mở hũ của mình`,
    `Hũ của ${members[index === 0 ? 1 : 0]!.displayName}, quay quà`,
  ]);
});

it("returns to my jar from a spin opened by a link", () => {
  vi.mocked(useHistoryState).mockReturnValue({ create: "spin", shortcut: true });
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>));
  const back = [...buttons].find(([label]) => label.includes("Về hũ của mình"));
  expect(back).toBeDefined();
  expect(html).not.toContain("Hũ của An, mở hũ của mình");
});

it("wishes R25: leaves both jars off Home", () => {
  const html = render(h(Home, { ...session, couple, onCouple: () => {}, celebrate: false, onCelebrated: () => {} }));
  expect(html).not.toContain("Hũ của");
});

it("notes AC4: Notes stays inside the Journal tabs", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory(); memory.journal = { entries: [], nextCursor: null }; memory.notes = { fromMe: [], toMe: [] }; memory.journalSection = "notes";
  const html = renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, couple }))) }));
  expect(html).toContain('role="tablist"'); expect(html).toContain('>Nhật ký<'); expect(html).toContain('>Lời nhắn<'); expect(html).toContain("Chưa có lời nhắn nào");
});

it("notes AC12 AC13: Home shows only waiting notes with a mailbox and count", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  const page = () => renderToString(h(Router, { ssrPath: "/", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }))) }));
  expect(page()).not.toContain("mailbox-wait");
  memory.notes = { fromMe: [], toMe: [{ id: "one", state: "waiting" }, { id: "two", state: "waiting" }] };
  expect(page()).toContain("mailbox-wait"); expect(page()).toContain("2 lời nhắn đang đợi");
  memory.notes.toMe = [{ id: "one", state: "opened", happened: "h", feel: "f", need: "n", hope: "r" }];
  expect(page()).not.toContain("mailbox-wait");
});
it("notes-journal AC19 journal AC22: feed keeps writer name/time and recipient above pick/line with a badge", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory(); memory.journal = { entries: [{ id: "e", authorId: "an", date: "2026-11-13", text: "", source: "partner", photoIds: [], createdAt: 1794556500000, updatedAt: 1794556500000, note: { id: "n", recipientId: "binh", happened: "What happened", feel: "Feelings", need: "Need", hope: "Hope", pick: "talk", line: "I understand" } }], nextCursor: null };
  const html = renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, couple }))) }));
  expect(html).toContain("Lời nhắn nhỏ"); expect(html).toContain("What happened");
  expect(html.indexOf("Bình", html.indexOf("What happened"))).toBeLessThan(html.indexOf("Mình muốn nói trực tiếp"));
  expect(html).toContain("I understand");
});

it.each([0, 1])("notes-journal AC20 journal AC22: note-entry actions show for both partners, normal-entry actions stay author-only: %i", (index) => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const user = { ...session.user, ...members[index]! };
  const base = { id: "normal", authorId: "an", date: "2026-11-13", text: "Normal", source: "partner" as const, photoIds: [], createdAt: 1794556500000, updatedAt: 1794556500000 };
  const memory = createTabMemory(); memory.journal = { entries: [base, { ...base, id: "note-entry", text: "", note: { id: "n", recipientId: "binh", happened: "h", feel: "f", need: "n", hope: "r", pick: "try", line: "" } }], nextCursor: null };
  const html = renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, user, couple }))) }));
  expect([...html.matchAll(/lucide-ellipsis/g)]).toHaveLength(index === 0 ? 2 : 1);
});

it.each([[1, "1 note is waiting"], [2, "2 notes are waiting"]])("notes AC12: English Home uses the right count for %i", (count, text) => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const memory = createTabMemory();
  memory.notes = { fromMe: [], toMe: Array.from({ length: count as number }, (_, i) => ({ id: String(i), state: "waiting" as const })) };
  const html = renderToString(h(Router, { ssrPath: "/", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }))) }));
  expect(html).toContain(text);
});

it("card-box AC5: Home puts the box section directly after DailyQuestion and before notes", () => {
  const html = render(h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }));
  expect(html).toContain("Deep talk");
  const source = readFileSync("src/client/screens/Home.tsx", "utf8");
  expect(source.indexOf("<DailyQuestion")).toBeLessThan(source.indexOf("<CardBoxBlock"));
  expect(source.indexOf("<CardBoxBlock")).toBeLessThan(source.indexOf("<NotesInbox"));
});
