import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { themeHead } from "../scripts/theme-bootstrap.ts";
import palettes from "../src/client/theme/palettes.json" with { type: "json" };
import { DEFAULT_PREFS, THEMES, parsePrefs, resolveTheme } from "../src/client/theme/themes.ts";
import { parseDay, formatDay, formatVnd } from "../src/client/lib/format.ts";
import { daysBetween, daysTogether, nextMilestone } from "../src/shared/days.ts";

test("invalid saved preferences recover without mixing light and dark palettes", () => {
  for (const raw of [null, "broken", "null", "[]", "42", '"text"']) {
    assert.deepEqual(parsePrefs(raw), DEFAULT_PREFS);
  }
  assert.deepEqual(parsePrefs(JSON.stringify({
    mode: "unknown", lightTheme: "mocha", darkTheme: "latte", style: "missing", background: "photo",
  })), DEFAULT_PREFS);
});

test("mode, palette, style and background resolve independently, including before React loads", () => {
  const script = themeHead(palettes).find((tag) => tag.tag === "script").children;
  for (const theme of THEMES) {
    for (const mode of ["light", "dark", "system", "invalid"]) {
      for (const systemDark of [false, true]) {
        const raw = JSON.stringify({
          mode, [`${theme.kind}Theme`]: theme.id, style: "sticker", background: "hearts",
        });
        const prefs = parsePrefs(raw);
        const expected = mode === "light" || (mode !== "dark" && !systemDark)
          ? prefs.lightTheme : prefs.darkTheme;
        assert.equal(resolveTheme(prefs, systemDark), expected);
        const root = { dataset: {}, classList: { toggle: (name, on) => { root[name] = on; } } };
        const statusBar = { content: "black" };
        const color = { removeAttribute() {} };
        runInNewContext(script, {
          localStorage: { getItem: () => raw },
          window: { matchMedia: () => ({ matches: systemDark }) },
          document: { documentElement: root, querySelector: () => statusBar, querySelectorAll: () => [color] },
        });
        assert.equal(statusBar.content, "black");
        assert.equal(color.content, palettes[expected].tokens.background);
        assert.equal(root.dataset.theme, expected);
        assert.equal(root.dataset.style, "sticker");
        assert.equal(root.dataset.bg, "hearts");
        assert.equal(root.dark, palettes[expected].kind === "dark");
      }
    }
  }
});

test("pre-paint theme works when browser storage is blocked", () => {
  const root = { dataset: {}, classList: { toggle() {} } };
  runInNewContext(themeHead(palettes).find((tag) => tag.tag === "script").children, {
    localStorage: { getItem() { throw new Error("blocked"); } },
    window: {}, document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [] },
  });
  assert.equal(root.dataset.theme, DEFAULT_PREFS.lightTheme);
  assert.equal(root.dataset.style, DEFAULT_PREFS.style);
  assert.equal(root.dataset.bg, DEFAULT_PREFS.background);
});

test("the fabric preset resolves before paint and existing choices are retained", () => {
  const root = { dataset: {}, classList: { toggle() {} } };
  for (const systemDark of [false, true]) {
    runInNewContext(themeHead(palettes).find((tag) => tag.tag === "script").children, {
      localStorage: { getItem: () => null },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [] },
    });
    assert.equal(root.dataset.theme, resolveTheme(DEFAULT_PREFS, systemDark));
    assert.equal(root.dataset.style, "soft");
    assert.equal(root.dataset.bg, "linen");
  }
  const saved = { mode: "dark", lightTheme: "latte", darkTheme: "mocha", style: "journal", background: "paper" };
  assert.deepEqual(parsePrefs(JSON.stringify(saved)), saved);
});

test("every palette supplies the same semantic tokens with readable text pairs", () => {
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((n) => parseInt(n, 16) / 255)
      .map((s) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const pairs = [
    ["box-peach-foreground", "box-peach"], ["box-blue-foreground", "box-blue"], ["box-lilac-foreground", "box-lilac"], ["box-rose-foreground", "box-rose"],
    ["foreground", "background"], ["card-foreground", "card"], ["popover-foreground", "popover"],
    ["muted-foreground", "muted"], ["primary-foreground", "primary"], ["secondary-foreground", "secondary"],
    ["destructive", "card"], ["success-foreground", "success"], ["warning-foreground", "warning"], ["info-foreground", "info"],
  ];
  for (const [id, { kind, tokens }] of Object.entries(palettes)) {
    assert.ok(["light", "dark"].includes(kind));
    assert.deepEqual(Object.keys(tokens).sort(), Object.keys(palettes.latte.tokens).sort());
    for (const [fg, bg] of pairs) {
      const a = luminance(tokens[fg]);
      const b = luminance(tokens[bg]);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${id}: ${fg}/${bg}`);
    }
    for (const [fg, bg] of [["foreground", "card"], ["input", "card"], ["ring", "background"]]) {
      const a = luminance(tokens[fg]);
      const b = luminance(tokens[bg]);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3, `${id}: ${fg}/${bg}`);
    }
  }
});

test("the counter counts calendar days across timezones and DST", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["Asia/Ho_Chi_Minh", "America/New_York"]) {
      process.env.TZ = zone;
      assert.equal(parseDay("2026-11-04").getDate(), 4);
      for (const locale of ["vi", "en"]) {
        assert.equal(formatDay("2023-02-14", locale, "numeric"), "14/02/2023");
      }
      assert.equal(daysTogether("2023-02-14", "2026-11-04"), 1360);
      assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
      assert.equal(daysBetween("2026-10-31", "2026-11-02"), 2);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("anniversaries include today and keep leap-day anniversaries on Feb 28", () => {
  assert.equal(nextMilestone("2023-02-14", "2026-02-14").daysLeft, 0);
  assert.equal(nextMilestone("2023-02-14", "2026-02-15").kind, "days");
  assert.deepEqual(nextMilestone("2024-02-29", "2025-02-28"), { kind: "anniversary", years: 1, date: "2025-02-28", daysLeft: 0 });
  assert.equal(formatVnd(450000, "vi"), "450.000\u00a0₫");
  assert.equal(formatVnd(450000, "en"), "₫450,000");
});
