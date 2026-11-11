import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AppShell } from "../src/client/components/bisou/AppShell";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = { current: initial };
    return hooks.values[index];
  },
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("../src/client/lib/useOnline", () => ({ useOnline: () => true }));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  hooks.values = []; hooks.effects = []; hooks.index = 0;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

type Props = { children?: ReactNode; ref?: { current: unknown }; role?: string; className?: string; style?: { height?: number }; "aria-busy"?: boolean };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function setup(onRefresh?: () => void | Promise<void>, tabs = true) {
  vi.useFakeTimers();
  const win = Object.assign(new EventTarget(), { scrollY: 0 });
  const root = { style: { overscrollBehaviorY: "contain" } };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { documentElement: root });
  class TestElement extends EventTarget {
    scrollHeight = 0;
    clientHeight = 0;
    parentElement: TestElement | null = null;
    closest = vi.fn(() => null as TestElement | null);
  }
  vi.stubGlobal("Element", TestElement);
  vi.stubGlobal("getComputedStyle", () => ({ overflowY: "auto" }));
  const main = new TestElement();
  const props = { children: "content", ...(onRefresh ? { onRefresh } : {}), ...(tabs ? { tabs: { active: "home" as const, onSelect: vi.fn(), onCreate: vi.fn() } } : {}) };
  const render = () => { hooks.index = 0; return elements(AppShell(props)); };
  const nodes = render();
  const ref = nodes.find((node) => node.type === "main")!.props.ref;
  if (ref) ref.current = main;
  for (const effect of hooks.effects.splice(0)) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
  const touch = (type: string, y = 0, x = 0, count = type === "touchend" ? 0 : 1, target = main) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "target", { value: target });
    Object.assign(event, { touches: Array.from({ length: count }, () => ({ clientY: y, clientX: x })) });
    main.dispatchEvent(event);
    return event;
  };
  const pull = (distance: number) => { touch("touchstart"); touch("touchmove", distance); touch("touchend"); };
  return { win, root, main, render, touch, pull, TestElement };
}

it("refreshes only when a downward pull starts at the top and reaches 80px", async () => {
  const refresh = vi.fn();
  const { win, pull } = setup(refresh);
  win.scrollY = 20; pull(100);
  expect(refresh).not.toHaveBeenCalled();
  win.scrollY = 0; pull(79);
  expect(refresh).not.toHaveBeenCalled();
  pull(80);
  expect(refresh).toHaveBeenCalledOnce();
  await vi.runAllTimersAsync();
});

it("cancels upward, horizontal, multi-touch and interrupted pulls without blocking normal scrolling", () => {
  const refresh = vi.fn();
  const { win, touch, render } = setup(refresh);
  for (const [y, x, count] of [[-20, 0, 1], [80, 100, 1], [100, 0, 2]]) {
    touch("touchstart");
    expect(touch("touchmove", y, x, count).defaultPrevented).toBe(false);
    touch("touchend");
  }
  touch("touchstart");
  expect(touch("touchmove", 100).defaultPrevented).toBe(true);
  touch("touchcancel"); touch("touchend");
  touch("touchstart"); touch("touchmove", 100);
  win.scrollY = 10; win.dispatchEvent(new Event("scroll")); touch("touchend");
  touch("touchstart");
  expect(touch("touchmove", 100).defaultPrevented).toBe(false);
  expect(refresh).not.toHaveBeenCalled();
  expect(render().find((node) => node.props.style)?.props.style?.height).toBe(0);
});

it.each(["resolve", "reject"])("holds the spinner until refresh and minimum duration finish (%s), then allows retry", async (result) => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve, reject) => { finish = result === "resolve" ? resolve : () => reject(new Error("offline")); });
  const refresh = vi.fn(() => pending);
  const { pull, render } = setup(refresh);
  pull(300);
  expect(render().some((node) => node.props["aria-busy"])).toBe(true);
  pull(100); expect(refresh).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(300);
  expect(render().some((node) => node.props["aria-busy"])).toBe(true);
  finish(); await vi.runAllTimersAsync();
  expect(render().some((node) => node.props["aria-busy"])).toBe(false);
  expect(render().find((node) => node.props.style)?.props.style?.height).toBe(0);
  expect(render().find((node) => node.props.style)?.props.className).toContain("duration-(--duration) ease-(--ease)");
  expect(render().find((node) => node.props.style)?.props.className).toContain("motion-reduce:transition-none");
  if (result === "reject") expect(toast.error).toHaveBeenCalledWith("error.generic");
  pull(80); expect(refresh).toHaveBeenCalledTimes(2);
  await vi.runAllTimersAsync();
});

it("does not flash the spinner for synchronous refresh", async () => {
  const { pull, render } = setup(vi.fn());
  pull(80);
  await vi.advanceTimersByTimeAsync(299);
  expect(render().some((node) => node.props["aria-busy"])).toBe(true);
  await vi.advanceTimersByTimeAsync(1);
  expect(render().some((node) => node.props["aria-busy"])).toBe(false);
});

it.each([false, true])("leaves tabless shells and shells without callbacks inert (tabs=%s)", (tabs) => {
  const refresh = vi.fn();
  const { touch, pull, root } = setup(tabs ? undefined : refresh, tabs);
  expect(touch("touchmove", 100).defaultPrevented).toBe(false);
  pull(100);
  expect(refresh).not.toHaveBeenCalled();
  expect(root.style.overscrollBehaviorY).toBe("contain");
});

it("restores native overscroll and removes touch and scroll listeners on unmount", () => {
  const refresh = vi.fn();
  const { main, win, root, pull } = setup(refresh);
  const removeTouch = vi.spyOn(main, "removeEventListener");
  const removeScroll = vi.spyOn(win, "removeEventListener");
  expect(root.style.overscrollBehaviorY).toBe("none");
  for (const cleanup of cleanups.splice(0)) cleanup();
  expect(removeTouch.mock.calls.map(([name]) => name)).toEqual(["touchstart", "touchmove", "touchend", "touchcancel"]);
  expect(removeScroll).toHaveBeenCalledWith("scroll", expect.any(Function));
  expect(root.style.overscrollBehaviorY).toBe("contain");
  pull(100); expect(refresh).not.toHaveBeenCalled();
});

it("keeps inputs and nested scrolling areas outside the gesture", () => {
  const refresh = vi.fn();
  const { main, touch, TestElement } = setup(refresh);
  const input = new TestElement(); input.closest.mockReturnValue(input);
  const scroller = new TestElement(); scroller.scrollHeight = 200; scroller.clientHeight = 100; scroller.parentElement = main;
  for (const target of [input, scroller]) {
    touch("touchstart", 0, 0, 1, target);
    expect(touch("touchmove", 100, 0, 1, target).defaultPrevented).toBe(false);
    touch("touchend");
  }
  expect(refresh).not.toHaveBeenCalled();
});

it.each(["button", "a"])("allows pulling from a %s while leaving a stationary tap alone", async (tag) => {
  const refresh = vi.fn();
  const { main, touch, TestElement } = setup(refresh);
  const button = new TestElement(); button.parentElement = main;
  button.closest.mockImplementation((selector?: string) => selector?.split(", ").includes(tag) ? button : null);
  touch("touchstart", 0, 0, 1, button);
  expect(touch("touchmove", 0, 0, 1, button).defaultPrevented).toBe(false);
  expect(touch("touchend", 0, 0, 0, button).defaultPrevented).toBe(false);
  expect(refresh).not.toHaveBeenCalled();
  touch("touchstart", 0, 0, 1, button);
  expect(touch("touchmove", 80, 0, 1, button).defaultPrevented).toBe(true);
  touch("touchend", 80, 0, 0, button);
  expect(refresh).toHaveBeenCalledOnce();
  await vi.runAllTimersAsync();
});
