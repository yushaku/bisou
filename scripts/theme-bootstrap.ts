type Palettes = Record<string, { kind: string; tokens: Record<string, string> }>;

// Vite injects these before the page paints. Adding a palette also updates this script.
export function themeHead(palettes: Palettes) {
  const ids = (kind: string) => Object.keys(palettes).filter((id) => palettes[id]?.kind === kind);
  return [
    {
      tag: "style",
      attrs: { id: "bisou-palettes" },
      children: Object.entries(palettes).map(([id, theme]) =>
        `:root[data-theme="${id}"]{color-scheme:${theme.kind};${Object.entries(theme.tokens).map(([key, value]) => `--${key}:${value};`).join("")}}`,
      ).join("\n"),
      injectTo: "head-prepend" as const,
    },
    {
      tag: "script",
      attrs: { id: "bisou-theme-init" },
      children: `(() => {
        let p = {};
        try { p = JSON.parse(localStorage.getItem("bisou.theme") || "{}") || {}; } catch {}
        const light = ${JSON.stringify(ids("light"))};
        const dark = ${JSON.stringify(ids("dark"))};
        const lt = light.includes(p.lightTheme) ? p.lightTheme : "peach";
        const dt = dark.includes(p.darkTheme) ? p.darkTheme : "cocoa";
        const sysDark = !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = p.mode === "dark" || (p.mode !== "light" && sysDark);
        const r = document.documentElement;
        r.dataset.theme = isDark ? dt : lt;
        r.dataset.style = ["journal", "soft", "sticker"].includes(p.style) ? p.style : "soft";
        r.dataset.bg = ["linen", "plain", "paper", "dots", "hearts"].includes(p.background) ? p.background : "linen";
        r.classList.toggle("dark", isDark);
      })();`,
      injectTo: "head-prepend" as const,
    },
  ];
}
