import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { themeHead } from "./scripts/theme-bootstrap.ts";
import palettes from "./src/client/theme/palettes.json" with { type: "json" };
import pkg from "./package.json" with { type: "json" };

// Cache buster for data saved on the device (ADR 0014): package version, commit and build time,
// so every build discards what an older one saved.
function buildId(): string {
  let commit = process.env.GITHUB_SHA?.slice(0, 7) ?? "";
  if (!commit) {
    try {
      commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      commit = "nogit";
    }
  }
  return `${pkg.version}-${commit}-${Date.now().toString(36)}`;
}

// `pnpm dev` (scripts/dev-seed-garden.mjs) points the Worker at a local config and state directory.
function localCloudflareOptions() {
  const configPath = process.env.BISOU_LOCAL_CONFIG;
  if (!configPath) return undefined;
  const statePath = process.env.BISOU_LOCAL_STATE;
  if (!statePath) throw new Error("BISOU_LOCAL_STATE must be set together with BISOU_LOCAL_CONFIG");
  return { configPath, persistState: { path: statePath }, remoteBindings: false, inspectorPort: false } as const;
}

export default defineConfig({
  define: { __BISOU_BUILD__: JSON.stringify(buildId()) },
  // `pnpm dev:phone` serves the dev server through a cloudflared quick tunnel.
  server: { allowedHosts: [".trycloudflare.com"] },
  // Deps used only inside lazy chunks (compose, crop, calendar). Pre-bundled at startup so the
  // dev server never answers their first lazy import with "Outdated Optimize Dep" (blank page).
  optimizeDeps: { include: ["react-day-picker", "react-day-picker/locale", "react-easy-crop"] },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src/client", import.meta.url)) },
  },
  plugins: [
    { name: "bisou-palettes", transformIndexHtml: () => themeHead(palettes) },
    react(),
    tailwindcss(),
    cloudflare(localCloudflareOptions()),
    // The PWA plugin only concerns the browser build, not the Worker bundle.
    ...clientOnly(
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        // The glob below already precaches every icon.
        includeManifestIcons: false,
        manifest: {
          name: "Bisou",
          short_name: "Bisou",
          description: "Góc nhỏ của hai đứa: lưu kỷ niệm, viết nhật ký và gửi gắm điều ước.",
          id: "/",
          shortcuts: [
            { name: "Viết nhật ký", url: "/journal?compose=1" },
            { name: "Quay quà", url: "/wishes?spin=1" },
          ],
          lang: "vi",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: palettes.peach.tokens.background,
          theme_color: palettes.peach.tokens.background,
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          importScripts: ["/push-sw.js"],
          // A new deploy takes over at once; updateReload.ts reloads the open page only when it is hidden.
          skipWaiting: true,
          clientsClaim: true,
          // App shell only (fonts included, for offline): never cache the API.
          globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,webmanifest,woff2}"],
          globIgnores: ["splash/**"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ),
  ],
});

function clientOnly(plugins: PluginOption[]): PluginOption[] {
  return plugins.map((plugin) =>
    plugin && typeof plugin === "object" && "name" in plugin
      ? { ...plugin, applyToEnvironment: (env: { name: string }) => env.name === "client" }
      : plugin,
  );
}
