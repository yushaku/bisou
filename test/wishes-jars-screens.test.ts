import { createElement as h, type ComponentProps, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { Router } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import { Wishes } from "../src/client/screens/Wishes";
import { I18nProvider } from "../src/client/i18n";
import { TabMemory, type TabMemoryValue } from "../src/client/lib/tabMemory";
import { createQueryFixture as createTabMemory } from "./query-fixture";

const buttons = vi.hoisted(() => new Map<string, () => void>());
const refreshes = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("wouter/use-browser-location", async (original) => ({
  ...(await original<typeof import("wouter/use-browser-location")>()),
  useHistoryState: vi.fn(() => null),
}));
vi.mock("../src/client/screens/SignedInShell", () => ({
  SignedInShell: ({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> }) => {
    if (onRefresh) refreshes.push(onRefresh);
    return children;
  },
}));
vi.mock("../src/client/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
    if (onClick) buttons.set(renderToString(h("span", null, children)), onClick);
    return h("button", null, children);
  },
}));

const members = [
  { id: "an", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", email: "binh@example.com", displayName: "Bình", birthDate: null, avatarId: null },
];
const couple = { id: "couple", startDate: null, members, events: [] };
const session = {
  user: { ...members[0]!, email: "an@example.com", locale: "vi" as const, createdAt: 1 },
  onUser: () => {},
  onSignedOut: () => {},
};

function render(
  screen: ReactNode,
  memoryPatch: Partial<TabMemoryValue> = { wishesJar: "private" },
  ssrSearch = "",
  language = "vi",
) {
  vi.stubGlobal("localStorage", { getItem: () => language });
  return renderToString(
    h(Router, {
      ssrPath: "/wishes",
      ssrSearch,
      children: h(
        I18nProvider,
        null,
        h(TabMemory.Provider, { value: Object.assign(createTabMemory(), memoryPatch) }, screen),
      ),
    }),
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(useHistoryState).mockReturnValue(null);
  vi.unstubAllGlobals();
  buttons.clear();
  refreshes.length = 0;
});

it("shared wishes: a link with section=shared selects Hai đứa even when the last view was private", () => {
  const html = render(
    h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>),
    { wishesJar: "private" },
    "section=shared",
  );
  expect(html).toContain("Những điều hai đứa muốn làm cùng nhau");
  expect(html).not.toContain("Hũ của An, mở hũ của mình");
});

it.each([
  ["shared", "sharedWishes", "wishes"],
  ["private", "wishes", "sharedWishes"],
] as const)("pull to refresh on %s reloads the jar that is shown", async (jar, refreshed, untouched) => {
  const empty = { open: [], done: [], received: [], partnerJarEmpty: true };
  const shown = vi.spyOn(api, refreshed).mockResolvedValue({ ok: true, data: empty });
  const other = vi.spyOn(api, untouched).mockResolvedValue({ ok: true, data: empty });
  render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), { wishesJar: jar });
  await refreshes.at(-1)!();
  expect(shown).toHaveBeenCalledOnce();
  expect(other).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
