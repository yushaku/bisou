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

it.each([0, 1])("R25: puts my jar on the left for partner %i", (index) => {
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

it("R25: leaves both jars off Home", () => {
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
it("notes AC19 journal AC22: feed keeps writer name/time and recipient above pick/line with a badge", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory(); memory.journal = { entries: [{ id: "e", authorId: "an", date: "2026-11-13", text: "", source: "partner", photoIds: [], createdAt: 1794556500000, updatedAt: 1794556500000, note: { id: "n", recipientId: "binh", happened: "What happened", feel: "Feelings", need: "Need", hope: "Hope", pick: "talk", line: "I understand" } }], nextCursor: null };
  const html = renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, couple }))) }));
  expect(html).toContain("Lời nhắn nhỏ"); expect(html).toContain("What happened");
  expect(html.indexOf("Bình", html.indexOf("What happened"))).toBeLessThan(html.indexOf("Mình muốn nói trực tiếp"));
  expect(html).toContain("I understand");
});
