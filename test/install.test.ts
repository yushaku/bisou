import { createElement as h, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { InstallCard } from "../src/client/components/bisou/InstallCard";
import { captureInstallPrompt, clearInstallPrompt } from "../src/client/lib/install";

const buttons = vi.hoisted(() => new Map<string, () => unknown>());
vi.mock("../src/client/components/ui/button", () => ({ Button: ({ children, onClick, "aria-label": label }: { children: ReactNode; onClick?: () => unknown; "aria-label"?: string }) => {
  if (onClick) buttons.set(label ?? String(children), onClick);
  return h("button", { "aria-label": label }, children);
} }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: vi.fn(), useSyncExternalStore: vi.fn((_subscribe, snapshot) => snapshot()) }));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); clearInstallPrompt(); buttons.clear(); });
function setup(ua: string, standalone = false, dismissed = false) {
  vi.stubGlobal("navigator", { userAgent: ua, standalone });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: () => dismissed ? "1" : null, setItem: vi.fn() });
}
const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
it("shows the three iPhone Safari steps", () => {
  setup(safari);
  const html = renderToString(h(InstallCard));
  for (const key of ["install.share", "install.addToHome", "install.confirm"]) expect(html).toContain(key);
  expect(html).toContain('aria-label="install.dismiss"');
});
it.each(["installed", "dismissed", "other"])("hides the card when %s", (kind) => {
  setup(kind === "other" ? "Firefox/140" : safari, kind === "installed", kind === "dismissed");
  expect(renderToString(h(InstallCard))).toBe("");
});
it("captures and opens the Chromium prompt before Home mounts", async () => {
  setup("Chrome/140");
  captureInstallPrompt();
  const prompt = vi.fn();
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(renderToString(h(InstallCard))).toContain("install.button");
  const [, snapshot] = vi.mocked(useSyncExternalStore).mock.calls.at(-1)!;
  expect(snapshot()).toBe(event);
  buttons.get("install.button")!();
  await Promise.resolve();
  await Promise.resolve();
  expect(prompt).toHaveBeenCalledOnce();
  expect(snapshot()).toBeNull();
});

it("stores dismissal and hides it on the next visit", () => {
  setup(safari);
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  renderToString(h(InstallCard));
  buttons.get("install.dismiss")!();
  expect(storage.get("bisou.install.dismissed")).toBe("1");
  expect(renderToString(h(InstallCard))).toBe("");
});
it("hides in display-mode standalone even without navigator.standalone", () => {
  setup(safari);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  expect(renderToString(h(InstallCard))).toBe("");
});
