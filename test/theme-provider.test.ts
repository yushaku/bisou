import { createElement as h, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ThemeProvider } from "../src/client/theme/ThemeProvider";
import palettes from "../src/client/theme/palettes.json";

vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("updates theme colour without changing the launch-only status bar for every palette and mode", () => {
  for (const [id, palette] of Object.entries(palettes)) {
    for (const mode of [palette.kind, "system"]) {
      const status = { content: "black" };
      const color = { content: "", removeAttribute: vi.fn() };
      const root = { dataset: {}, classList: { toggle: vi.fn() } };
      vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ mode, [`${palette.kind}Theme`]: id }) });
      vi.stubGlobal("matchMedia", () => ({ matches: palette.kind === "dark", addEventListener: vi.fn(), removeEventListener: vi.fn() }));
      vi.stubGlobal("document", { documentElement: root, querySelector: () => status, querySelectorAll: () => [color] });
      vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => palette.tokens.background }));
      renderToString(h(ThemeProvider, { children: null }));
      vi.mocked(useEffect).mock.calls.at(-1)![0]();
      expect(color.content).toBe(palette.tokens.background);
      expect(status.content).toBe("black");
    }
  }
});
