import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { statSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { MASCOTS, readMascot, setMascot } from "../src/client/lib/mascots";
import { clearCardBoxCache } from "../src/client/lib/cardBox";

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { get length() { return values.size; }, key: (i: number) => [...values.keys()][i] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { location: { href: "http://localhost/settings" } }));
  return values;
}
afterEach(() => { storage(); setMascot("girl"); vi.unstubAllGlobals(); });
it("defaults to the girl and tolerates unknown or unavailable device storage", () => {
  const values = storage();
  expect(readMascot().id).toBe("girl");
  values.set("bisou.mascot", "unknown");
  expect(readMascot().id).toBe("girl");
  vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); } });
  expect(readMascot().id).toBe("girl");
});
it("keeps the choice on this device across sign out, with a fresh device using the default", () => {
  storage(); setMascot("boy"); clearCardBoxCache();
  expect(readMascot().id).toBe("boy");
  storage(); expect(readMascot().id).toBe("girl");
});
it("ships every situation for every mascot as a small transparent WebP", async () => {
  const { default: sharp } = await import("sharp");
  expect(MASCOTS.map(m => m.id)).toEqual(["girl", "boy"]);
  for (const mascot of MASCOTS) {
    expect(Object.keys(mascot.images).sort()).toEqual(["celebrate", "empty", "error", "waiting"]);
    for (const situation of Object.keys(mascot.images)) {
      const path = `src/client/assets/mascots/${mascot.id}-${situation}.webp`;
      expect(statSync(path).size).toBeLessThan(80_000);
      const metadata = await sharp(path).metadata();
      expect(metadata.width).toBe(480);
      expect(metadata.hasAlpha).toBe(true);
    }
  }
});

import { I18nProvider } from "../src/client/i18n";
import { EmptyState } from "../src/client/components/bisou/EmptyState";
import { DaysCounter } from "../src/client/components/bisou/DaysCounter";
import { Settings } from "../src/client/screens/Settings";
import { ThemeProvider } from "../src/client/theme/ThemeProvider";
import { Router } from "wouter";
import { MascotPicker } from "../src/client/components/bisou/MascotPicker";

it("empty state keeps its meaning and action with a decorative lazy mascot", () => {
  storage();
  const html = renderToString(h(EmptyState, { title: "No notes", action: { label: "Write", onClick() {} } }));
  expect(html).toContain("girl-empty.webp");
  expect(html).toContain('alt=""'); expect(html).toContain('loading="lazy"');
  expect(html).toContain("No notes"); expect(html).toContain("Write");
});
it.each([
  ["2026-01-01", new Date(2026, 3, 10), true],
  ["2026-01-01", new Date(2026, 3, 9), false],
  ["2025-01-01", new Date(2026, 0, 1), true],
  ["2025-01-01", new Date(2026, 0, 2), false],
] as const)("celebrates milestone dates only: %s, %s", (startDate, today, celebrate) => {
  storage();
  const html = renderToString(h(I18nProvider, null, h(DaysCounter, { startDate, today })));
  expect(html.includes("girl-celebrate.webp")).toBe(celebrate);
});
it.each(["vi", "en"])("Settings renders the compact mascot picker in %s", locale => {
  const values = storage(); values.set("bisou.locale", locale);
  const user = { id: "u", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const html = renderToString(h(Router, { ssrPath: "/settings", children: h(ThemeProvider, null, h(I18nProvider, null, h(Settings, { user, couple: null, onUser() {}, onSignedOut() {}, onCouple() {} }))) }));
  for (const label of locale === "vi" ? ["Linh vật", "Bạn gái", "Bạn trai"] : ["Mascot", "Girl", "Boy"]) expect(html).toContain(label);
  expect(html).toContain("girl-empty.webp"); expect(html).toContain("boy-empty.webp");
  setMascot("boy");
  const selected = renderToString(h(I18nProvider, null, h(MascotPicker)));
  expect(selected).toMatch(/aria-checked="true"[^>]*>[\s\S]*?boy-empty.webp/);
});

it("applies a session choice even when storage can be read but writes are blocked", () => {
  storage();
  vi.stubGlobal("localStorage", { getItem: () => "girl", setItem() { throw new Error("quota"); } });
  setMascot("boy");
  expect(readMascot().id).toBe("boy");
});

it("keeps secondary errors free of mascots", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of ["components/bisou/ClaimsList", "screens/Wishes", "components/bisou/StarredCards"]) {
    const source = await readFile(`src/client/${file}.tsx`, "utf8");
    expect(source).not.toContain("<Mascot");
  }
  const player = await readFile("src/client/screens/CardBoxPlayer.tsx", "utf8");
  expect(player).not.toContain("<Mascot situation=\"error\"");
});
