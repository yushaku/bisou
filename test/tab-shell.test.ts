import { createElement as h, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { TabScreens } from "../src/client/screens/TabScreens";
import { I18nProvider } from "../src/client/i18n";
import { attachTabScroll, createTabMemory } from "../src/client/lib/tabMemory";

vi.mock("../src/client/screens/Journal", () => ({ Journal: () => h("p", null, "journal-screen") }));
vi.mock("../src/client/screens/Wishes", () => ({ Wishes: () => h("p", null, "wishes-screen") }));
vi.mock("../src/client/screens/Garden", () => ({ Garden: () => h("p", null, "garden-screen") }));
vi.mock("../src/client/screens/Home", () => ({ Home: () => h("p", null, "home-screen") }));

afterEach(() => vi.unstubAllGlobals());

const count = (html: string, tag: string) => html.match(new RegExp(`<${tag}[ >]`, "g"))?.length ?? 0;
const session = { user: { id: "an" } as never, onUser: () => {}, onSignedOut: () => {} };

function render(children: ReactNode) {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  return renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, children) }));
}

const props = {
  session,
  couple: {} as never,
  onCouple: () => {},
  onRefresh: async () => {},
  celebrate: false,
  onCelebrated: () => {},
};
it("first visit mounts only the selected tab inside one frame", async () => {
  const { loadTab } = await import("../src/client/lib/screens");
  await loadTab("journal");
  const html = render(h(TabScreens, { location: "/journal", ...props }));
  expect(count(html, "header")).toBe(1);
  expect(count(html, "nav")).toBe(1);
  expect(count(html, "main")).toBe(1);
  expect(html).toContain("journal-screen");
  expect(html).not.toContain("home-screen");
  expect(html).not.toContain("wishes-screen");
  expect(html).not.toContain("garden-screen");
});

function fakeWindow(scrollY = 0) {
  const win = Object.assign(new EventTarget(), {
    scrollY,
    scrollTo: vi.fn((options: { top: number }) => {
      win.scrollY = options.top;
    }),
  });
  const focus = vi.fn();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { getElementById: vi.fn(() => ({ focus })) });
  return { win, focus };
}

it("a revisited tab starts at scroll position zero", () => {
  const memory = createTabMemory();
  const { win } = fakeWindow();
  attachTabScroll(memory, "journal");
  win.scrollY = 2400;
  attachTabScroll(memory, "wishes");
  attachTabScroll(memory, "journal");
  expect(win.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
});

it("returns focus to the control that opened a sub-page, once", () => {
  const memory = createTabMemory();
  memory.returnFocus = "settings-button";
  const { focus } = fakeWindow();
  attachTabScroll(memory, "home");
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(memory.returnFocus).toBeNull();
});

it("a page without a tab neither scrolls nor listens", () => {
  const memory = createTabMemory();
  const { win } = fakeWindow();
  attachTabScroll(memory, undefined);
  expect(win.scrollTo).not.toHaveBeenCalled();
});
