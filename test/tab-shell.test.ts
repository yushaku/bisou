import { createElement as h, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { TabScreens } from "../src/client/screens/TabScreens";
import { I18nProvider } from "../src/client/i18n";
import { attachTabScroll, createTabMemory } from "../src/client/lib/tabMemory";
import { SignedInShell, TabFrame } from "../src/client/screens/SignedInShell";

vi.mock("../src/client/screens/Journal", () => ({ Journal: () => null }));
vi.mock("../src/client/screens/Wishes", () => ({ Wishes: () => null }));
vi.mock("../src/client/screens/Garden", () => ({ Garden: () => null }));
vi.mock("../src/client/screens/Home", () => ({ Home: () => null }));

afterEach(() => vi.unstubAllGlobals());

const count = (html: string, tag: string) => html.match(new RegExp(`<${tag}[ >]`, "g"))?.length ?? 0;
const session = { user: { id: "an" } as never, onUser: () => {}, onSignedOut: () => {} };

function render(children: ReactNode) {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  return renderToString(h(Router, { ssrPath: "/journal", children: h(I18nProvider, null, children) }));
}

it("a tab screen inside the frame draws only its content: one header, one tab bar, one main", () => {
  const html = render(h(TabFrame, { tab: "journal", children: h(SignedInShell, { ...session, tab: "journal", children: h("p", { id: "screen" }, "feed") }) }));
  expect(count(html, "header")).toBe(1);
  expect(count(html, "nav")).toBe(1);
  expect(count(html, "main")).toBe(1);
  expect(html).toMatch(/<main[^>]*>.*<p id="screen">feed<\/p>/s);
  expect(html).toContain('aria-current="page"');
});

it("outside the frame the same screen still draws its own shell", () => {
  const html = render(h(SignedInShell, { ...session, tab: "wishes", children: h("p", null, "jar") }));
  expect(count(html, "nav")).toBe(1);
  expect(count(html, "main")).toBe(1);
});

it("a screen without a tab keeps its own shell even inside the frame (sub-pages)", () => {
  const html = render(h(TabFrame, { tab: "home", children: h(SignedInShell, { ...session, children: h("p", null, "events") }) }));
  expect(count(html, "main")).toBe(2); // its own page, not folded into the frame
  expect(count(html, "nav")).toBe(1); // sub-pages have no tab bar
});

const props = { session, couple: {} as never, onCouple: () => {}, onRefresh: async () => {}, celebrate: false, onCelebrated: () => {} };
function frameOf(location: string): ReactElement<{ tab: string }> {
  const element = TabScreens({ location, ...props });
  if (!isValidElement<{ tab: string }>(element)) throw new Error("expected an element");
  return element;
}

it("switching tabs keeps the same frame element, so React keeps the header and tab bar mounted", () => {
  const [home, journal, wishes, garden] = ["/", "/journal", "/wishes", "/garden"].map(frameOf);
  for (const next of [journal, wishes, garden, home]) {
    expect(next!.type).toBe(TabFrame);
    expect(next!.key).toBe(home!.key);
  }
  expect([home, journal, wishes, garden].map((e) => e!.props.tab)).toEqual(["home", "journal", "wishes", "garden"]);
  expect(frameOf("/unknown").props.tab).toBe("home");
});

function fakeWindow(scrollY = 0) {
  const win = Object.assign(new EventTarget(), { scrollY, scrollTo: vi.fn((options: { top: number }) => { win.scrollY = options.top; }) });
  const focus = vi.fn();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { getElementById: vi.fn(() => ({ focus })), documentElement: { classList: { contains: () => false } } });
  return { win, focus };
}

it("a revisited tab starts at scroll position zero", () => {
  const memory = createTabMemory();
  const { win } = fakeWindow();
  const leaveJournal: unknown = attachTabScroll(memory, "journal");
  win.scrollY = 2400;
  win.dispatchEvent(new Event("scroll"));
  if (typeof leaveJournal === "function") leaveJournal();
  const leaveWishes: unknown = attachTabScroll(memory, "wishes");
  if (typeof leaveWishes === "function") leaveWishes();
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
  expect(attachTabScroll(memory, undefined)).toBeUndefined();
  expect(win.scrollTo).not.toHaveBeenCalled();
});
