import { createElement as h, type ComponentProps, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
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
  const html = render(h(Home, { ...session, user, couple, onCouple: () => {}, celebrate: false, onCelebrated: () => {} }));
  const labels = [...html.matchAll(/<button[^>]*aria-label="(Hũ[^\"]+)"/g)].map((match) => match[1]);
  expect(labels).toEqual([
    `Hũ của ${user.displayName}, mở hũ của mình`,
    `Hũ của ${members[index === 0 ? 1 : 0]!.displayName}, quay quà`,
  ]);
});

it("returns through history when Back is pressed on a spin opened from Home", () => {
  vi.mocked(useHistoryState).mockReturnValue({ create: "spin" });
  const back = vi.fn();
  vi.stubGlobal("history", { back });
  render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>));
  const click = [...buttons].find(([label]) => label.includes("Về hũ của mình") || label.includes("Quay lại"))?.[1];
  expect(click).toBeDefined();
  click!();
  expect(back).toHaveBeenCalledOnce();
});
