import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { attachTabScroll, createTabMemory } from "../src/client/lib/tabMemory";
import { COMMIT_TIMEOUT_MS, notifyTabCommitted, placeTabScroll, runTabTransition, SWITCHING_CLASS, whenTabCommitted, type TransitionHost } from "../src/client/lib/tabTransition";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); });

const flush = () => vi.advanceTimersByTimeAsync(0);

it("resolves only after the new content reports it has committed", async () => {
  const go = vi.fn();
  const done = vi.fn();
  void whenTabCommitted(go).then(done);
  expect(go).toHaveBeenCalledOnce();
  await flush();
  expect(done).not.toHaveBeenCalled();
  notifyTabCommitted();
  await flush();
  expect(done).toHaveBeenCalledOnce();
});

it("does not hang when nothing commits: it resolves at the timeout", async () => {
  const done = vi.fn();
  void whenTabCommitted(() => {}).then(done);
  await vi.advanceTimersByTimeAsync(COMMIT_TIMEOUT_MS - 1);
  expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(done).toHaveBeenCalledOnce();
  notifyTabCommitted(); // a late commit signal is harmless
});

it("rejects when the navigation throws, and leaves no pending signal behind", async () => {
  await expect(whenTabCommitted(() => { throw new Error("boom"); })).rejects.toThrow("boom");
  expect(vi.getTimerCount()).toBe(0);
});

it("a signal resolves one switch only", async () => {
  const first = vi.fn();
  void whenTabCommitted(() => {}).then(first);
  notifyTabCommitted();
  await flush();
  const second = vi.fn();
  void whenTabCommitted(() => {}).then(second);
  notifyTabCommitted(); // belongs to the second switch
  await flush();
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
});

function host(startViewTransition?: TransitionHost["startViewTransition"], scrollY = 0) {
  const classes = new Set<string>();
  const style = new Map<string, string>();
  const page = { scrollTop: 0 };
  const scrolled: number[] = [];
  const documentElement = {
    style: { setProperty: (name: string, value: string) => { style.set(name, value); }, removeProperty: (name: string) => { style.delete(name); } },
    classList: { add: (name: string) => { classes.add(name); }, remove: (name: string) => { classes.delete(name); } },
  };
  const h: TransitionHost = { startViewTransition, documentElement, headerBottom: () => 56, page: () => page, scrollY, scrollTo: (top) => { scrolled.push(top); } };
  return { host: h, classes, style, page, scrolled };
}

it("runs the update inside a view transition, sets the slide direction and freezes the page until it finishes", async () => {
  let finish!: () => void;
  let update!: () => Promise<void>;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const { host: h, classes, style, page, scrolled } = host((callback) => { update = callback; return { finished }; }, 2400);
  const go = vi.fn();
  runTabTransition(go, -1, h, false);
  expect(style.get("--tab-dir")).toBe("-1");
  expect(style.get("--tab-top")).toBe("56px");
  expect(classes.has(SWITCHING_CLASS)).toBe(true);
  expect(page.scrollTop).toBe(2400); // the clipped box shows what was on screen
  expect(go).not.toHaveBeenCalled(); // the browser calls the update after it captured the old page
  const updated = vi.fn();
  void update().then(updated);
  expect(go).toHaveBeenCalledOnce();
  notifyTabCommitted();
  await flush();
  expect(updated).toHaveBeenCalledOnce();
  expect(classes.has(SWITCHING_CLASS)).toBe(true);
  finish();
  await flush();
  expect(classes.has(SWITCHING_CLASS)).toBe(false);
  expect(style.has("--tab-top")).toBe(false);
  expect(scrolled).toEqual([2400]); // nothing asked for another place: back where it was
});

it("a newly entered tab stays at the top when the frozen transition thaws", async () => {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const { host: h, classes, page, scrolled } = host(() => ({ finished }), 900);
  const real = { documentElement: { classList: { contains: (name: string) => classes.has(name) } }, querySelector: () => page };
  vi.stubGlobal("document", real);
  vi.stubGlobal("window", { scrollTo: vi.fn() });
  try {
    runTabTransition(() => {}, 1, h, false);
    expect(page.scrollTop).toBe(900);
    attachTabScroll(createTabMemory(), "journal");
    expect(page.scrollTop).toBe(0);
    expect(window.scrollTo).not.toHaveBeenCalled();
    finish();
    await flush();
    expect(scrolled).toEqual([0]);
    placeTabScroll(40); // thawed: an ordinary scroll
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 40, behavior: "instant" });
  } finally {
    vi.unstubAllGlobals();
  }
});

it("also thaws the page when the transition is skipped", async () => {
  const { host: h, classes, scrolled } = host(() => ({ finished: Promise.reject(new Error("skipped")) }), 700);
  runTabTransition(() => {}, 1, h, false);
  await flush();
  expect(classes.has(SWITCHING_CLASS)).toBe(false);
  expect(scrolled).toEqual([700]);
});

it("navigates at once without a view transition API or with reduced motion", () => {
  const go = vi.fn();
  const none = host();
  runTabTransition(go, 1, none.host, false);
  expect(go).toHaveBeenCalledOnce();
  expect(none.classes.size).toBe(0);
  const start = vi.fn();
  const reduced = host(start as unknown as TransitionHost["startViewTransition"]);
  runTabTransition(go, 1, reduced.host, true);
  expect(go).toHaveBeenCalledTimes(2);
  expect(start).not.toHaveBeenCalled();
  expect(reduced.classes.size).toBe(0);
});
