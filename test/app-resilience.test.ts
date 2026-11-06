import { createElement as h, useSyncExternalStore } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../src/client/components/bisou/ErrorBoundary";
import { useOnline } from "../src/client/lib/useOnline";

vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useSyncExternalStore: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("renders the friendly fallback and logs a child render error", () => {
  const error = new Error("private stack details");
  function Broken(): never { throw error; }
  const boundary = new ErrorBoundary({ children: h(Broken) });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try { renderToString(boundary.render()); } catch (caught) {
    boundary.state = ErrorBoundary.getDerivedStateFromError();
    boundary.componentDidCatch(caught as Error);
  }
  const html = renderToString(boundary.render());
  expect(html).toContain("errorScreen.title");
  expect(html).toContain("errorScreen.reload");
  expect(html).not.toContain(error.message);
  expect(log).toHaveBeenCalledWith("[bisou] render failed", error);
});

it("reads connectivity and subscribes to both online and offline events", () => {
  const target = new EventTarget();
  const navigator = { onLine: true };
  vi.stubGlobal("window", target);
  vi.stubGlobal("navigator", navigator);
  useOnline();
  const [subscribe, snapshot] = vi.mocked(useSyncExternalStore).mock.calls.at(-1)!;
  const changed = vi.fn();
  const cleanup = subscribe(changed);
  expect(snapshot()).toBe(true);
  navigator.onLine = false;
  target.dispatchEvent(new Event("offline"));
  expect(snapshot()).toBe(false);
  navigator.onLine = true;
  target.dispatchEvent(new Event("online"));
  expect(changed).toHaveBeenCalledTimes(2);
  cleanup();
  target.dispatchEvent(new Event("offline"));
  expect(changed).toHaveBeenCalledTimes(2);
});
