import type { MessageKey } from "../i18n";

import palettes from "./palettes.json" with { type: "json" };

export type ThemeKind = "light" | "dark";
export type ThemeId = keyof typeof palettes;

export interface ThemeDef {
  id: ThemeId;
  label: string;
  kind: ThemeKind;
  swatches: readonly string[];
}

// Colours, names and modes all come from a single block per theme in palettes.json.
export const THEMES: ThemeDef[] = Object.entries(palettes).map(([id, theme]) => ({
  id: id as ThemeId,
  label: theme.label,
  kind: theme.kind as ThemeKind,
  swatches: [theme.tokens.background, theme.tokens.card, theme.tokens.primary, theme.tokens.secondary, theme.tokens.foreground],
}));

export const LIGHT_THEMES = THEMES.filter((t) => t.kind === "light");
export const DARK_THEMES = THEMES.filter((t) => t.kind === "dark");

export const MODES = ["light", "dark", "system"] as const;
export type Mode = (typeof MODES)[number];

/* Backgrounds (theme/backgrounds.css). "photo" is reserved for an uploaded photo later. */
export const BACKGROUNDS = [
  { id: "linen", labelKey: "bg.linen" },
  { id: "plain", labelKey: "bg.plain" },
  { id: "paper", labelKey: "bg.paper" },
  { id: "dots", labelKey: "bg.dots" },
  { id: "hearts", labelKey: "bg.hearts" },
] as const satisfies readonly { id: string; labelKey: MessageKey }[];
export type BackgroundId = (typeof BACKGROUNDS)[number]["id"];

/* Personalities share the same components; values live in personalities.css. */
export const STYLES = [
  { id: "journal", labelKey: "style.journal" },
  { id: "soft", labelKey: "style.soft" },
  { id: "sticker", labelKey: "style.sticker" },
] as const satisfies readonly { id: string; labelKey: MessageKey }[];
export type StyleId = (typeof STYLES)[number]["id"];

export interface ThemePrefs {
  mode: Mode;
  lightTheme: ThemeId;
  darkTheme: ThemeId;
  background: BackgroundId;
  style: StyleId;
}

/* The pre-paint script uses the same defaults; covered by the design-system tests. */
export const THEME_STORAGE_KEY = "bisou.theme";
export const DEFAULT_PREFS: ThemePrefs = {
  mode: "system",
  lightTheme: "peach",
  darkTheme: "cocoa",
  background: "linen",
  style: "soft",
};

const has = <T extends { id: string }>(list: readonly T[], id: unknown): id is T["id"] =>
  typeof id === "string" && list.some((item) => item.id === id);

export function parsePrefs(raw: string | null): ThemePrefs {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    // Corrupt value: fall back to the defaults.
  }
  return {
    mode: MODES.includes(data.mode as Mode) ? (data.mode as Mode) : DEFAULT_PREFS.mode,
    lightTheme: has(LIGHT_THEMES, data.lightTheme) ? data.lightTheme : DEFAULT_PREFS.lightTheme,
    darkTheme: has(DARK_THEMES, data.darkTheme) ? data.darkTheme : DEFAULT_PREFS.darkTheme,
    background: has(BACKGROUNDS, data.background) ? data.background : DEFAULT_PREFS.background,
    style: has(STYLES, data.style) ? data.style : DEFAULT_PREFS.style,
  };
}

export function themeById(id: ThemeId): ThemeDef {
  const found = THEMES.find((t) => t.id === id) ?? THEMES[0];
  if (!found) throw new Error("No themes registered in palettes.json");
  return found;
}

export function resolveTheme(prefs: ThemePrefs, systemDark: boolean): ThemeId {
  if (prefs.mode === "light") return prefs.lightTheme;
  if (prefs.mode === "dark") return prefs.darkTheme;
  return systemDark ? prefs.darkTheme : prefs.lightTheme;
}
