import { afterEach, expect, it, vi } from "vitest";
import { useNow } from "../src/client/lib/useNow";

const hooks = vi.hoisted(() => ({
  value: undefined as Date | undefined,
  effect: undefined as (() => () => void) | undefined,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: () => Date) => [
    (hooks.value ??= initial()),
    (value: Date) => {
      hooks.value = value;
    },
  ],
  useEffect: (effect: () => () => void) => {
    hooks.effect = effect;
  },
}));
afterEach(() => {
  hooks.value = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("revealing Home after midnight refreshes today and schedules the following midnight", () => {
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.setSystemTime(new Date(2026, 10, 17, 23, 50));
  useNow();
  const hide = hooks.effect!();
  hide();
  vi.setSystemTime(new Date(2026, 10, 18, 8));
  useNow();
  const cleanup = hooks.effect!();
  expect(useNow().getDate()).toBe(18);
  cleanup();
  const nextCleanup = hooks.effect!();
  vi.advanceTimersByTime(16 * 60 * 60 * 1000 + 1001);
  expect(useNow().getDate()).toBe(19);
  nextCleanup();
});
