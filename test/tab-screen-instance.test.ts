import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { TabScreens } from "../src/client/screens/TabScreens";
import { TabFrame } from "../src/client/screens/SignedInShell";
import { loadTab, resetTabsForTest } from "../src/client/lib/screens";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: () => unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial();
    return [
      hooks.values[index],
      (value: unknown) => {
        hooks.values[index] = value;
      },
    ];
  },
}));
vi.mock("../src/client/screens/Home", () => ({ Home: () => null }));
vi.mock("../src/client/screens/Journal", () => ({ Journal: () => null }));
vi.mock("../src/client/screens/Wishes", () => ({ Wishes: () => null }));
vi.mock("../src/client/screens/Garden", () => ({ Garden: () => null }));
afterEach(() => {
  hooks.values = [];
  hooks.index = 0;
  resetTabsForTest();
});

function elements(node: ReactNode): ReactElement<{ children?: ReactNode }>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...elements(node.props.children)];
}

it.each(["journal", "wishes", "garden"] as const)(
  "a cold %s keeps its component type after its chunk loads",
  async (tab) => {
    const tree = TabScreens({
      location: `/${tab}`,
      session: { user: {} as never, onUser: vi.fn(), onSignedOut: vi.fn() },
      couple: {} as never,
      onCouple: vi.fn(),
      onRefresh: async () => {},
      celebrate: false,
      onCelebrated: vi.fn(),
    });
    const screen = elements(tree).find((node) => node.type !== TabFrame && typeof node.type === "function")!;
    const Screen = screen.type as (props: object) => ReactElement;
    hooks.values = [];
    hooks.index = 0;
    const before = Screen(screen.props);
    await loadTab(tab);
    hooks.index = 0;
    expect(Screen(screen.props).type).toBe(before.type);
  },
);
