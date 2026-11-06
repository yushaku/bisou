import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { parsePrefs, resolveTheme, THEME_STORAGE_KEY, themeById, type ThemeId, type ThemeKind, type ThemePrefs } from "./themes";

interface ThemeValue {
  prefs: ThemePrefs;
  setPrefs: (patch: Partial<ThemePrefs>) => void;
  /* The theme in use after resolving mode "system". */
  theme: ThemeId;
  kind: ThemeKind;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPrefs(): ThemePrefs {
  try {
    return parsePrefs(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return parsePrefs(null);
  }
}

function systemIsDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

/* The initial attributes are set before paint by scripts/theme-bootstrap.ts. */
function applyToDocument(prefs: ThemePrefs, theme: ThemeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.style = prefs.style;
  root.dataset.bg = prefs.background;
  root.classList.toggle("dark", themeById(theme).kind === "dark");
  // Browser chrome follows the page background of the active theme.
  const background = getComputedStyle(root).getPropertyValue("--background").trim();
  if (background) {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = background;
      meta.removeAttribute("media");
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ThemePrefs>(readPrefs);
  const [systemDark, setSystemDark] = useState(systemIsDark);

  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(prefs, systemDark);

  useEffect(() => {
    applyToDocument(prefs, theme);
  }, [prefs, theme]);

  const setPrefs = useCallback((patch: Partial<ThemePrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the choice still applies for this session.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, theme, kind: themeById(theme).kind }),
    [prefs, setPrefs, theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
