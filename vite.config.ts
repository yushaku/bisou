import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { themeHead } from "./scripts/theme-bootstrap.ts";
import palettes from "./src/client/theme/palettes.json" with { type: "json" };

export default defineConfig({
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
    cloudflare(),
    // The PWA plugin only concerns the browser build, not the Worker bundle.
    ...clientOnly(VitePWA({
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
        // A new deploy takes over open tabs at once; main.tsx reloads the page when it does.
        skipWaiting: true,
        clientsClaim: true,
        // App shell only (fonts included, for offline): never cache the API.
        globPatterns: ["**/*.{js,css,html,svg,png,webp,webmanifest,woff2}"],
        globIgnores: ["splash/**"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    })),
  ],
});

function clientOnly(plugins: PluginOption[]): PluginOption[] {
  return plugins.map((plugin) =>
    plugin && typeof plugin === "object" && "name" in plugin
      ? { ...plugin, applyToEnvironment: (env: { name: string }) => env.name === "client" }
      : plugin,
  );
}
