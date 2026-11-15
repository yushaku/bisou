import { beforeEach, expect, it, vi } from "vitest";

const imports = vi.hoisted(() => ({ journal: vi.fn(), wishes: vi.fn(), garden: vi.fn() }));
vi.mock("../src/client/screens/Journal", () => { imports.journal(); return { Journal: function Journal() { return null; } }; });
vi.mock("../src/client/screens/Wishes", () => { imports.wishes(); return { Wishes: function Wishes() { return null; } }; });
vi.mock("../src/client/screens/Garden", () => { imports.garden(); return { Garden: function Garden() { return null; } }; });

const screens = () => import("../src/client/lib/screens");

beforeEach(async () => {
  vi.clearAllMocks();
  (await screens()).resetTabsForTest();
});

it("prewarms the three other tab chunks one at a time through the idle scheduler, and keeps them for direct rendering", async () => {
  const { prewarmTabs, loadedTab } = await screens();
  const queue: (() => void)[] = [];
  prewarmTabs((run) => { queue.push(run); });
  expect(queue).toHaveLength(1); // nothing is fetched until the browser is idle
  expect(loadedTab("journal")).toBeUndefined();
  for (const tab of ["journal", "wishes", "garden"] as const) {
    queue.shift()!();
    await vi.waitFor(() => expect(loadedTab(tab)).toBeDefined());
    expect(queue).toHaveLength(tab === "garden" ? 0 : 1); // the next one is queued only after this one loaded
  }
  expect(loadedTab("journal")!.name).toBe("Journal");
  expect(loadedTab("wishes")!.name).toBe("Wishes");
  expect(loadedTab("garden")!.name).toBe("Garden");
});

it("shares one import between a tap and the prewarm", async () => {
  const { loadTab } = await screens();
  const [a, b] = await Promise.all([loadTab("wishes"), loadTab("wishes")]);
  expect(a).toBe(b);
});

it("skips tabs that are already loaded", async () => {
  const { loadTab, prewarmTabs } = await screens();
  await Promise.all([loadTab("journal"), loadTab("wishes"), loadTab("garden")]);
  const schedule = vi.fn();
  prewarmTabs(schedule);
  expect(schedule).not.toHaveBeenCalled();
});

it("falls back to a timer when requestIdleCallback is missing", async () => {
  vi.useFakeTimers();
  try {
    const { prewarmTabs, loadedTab } = await screens();
    vi.stubGlobal("requestIdleCallback", undefined);
    prewarmTabs();
    await vi.advanceTimersByTimeAsync(1000);
    expect(loadedTab("journal")).toBeDefined();
    expect(loadedTab("garden")).toBeDefined();
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
