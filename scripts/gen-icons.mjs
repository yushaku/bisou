// Exports the brand mark, favicons and install icons from assets/ (pnpm icons).
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import sharp from "sharp";
import palettes from "../src/client/theme/palettes.json" with { type: "json" };

const out = [
  { src: "assets/brand-heart.webp", file: "src/client/assets/brand-heart.webp", size: 192 },
  { src: "assets/brand-heart.webp", file: "public/favicon-16.png", size: 16 },
  { src: "assets/brand-heart.webp", file: "public/favicon-32.png", size: 32 },
  { src: "assets/app-icon.webp", file: "public/icons/icon-192.png", size: 192 },
  { src: "assets/app-icon.webp", file: "public/icons/icon-512.png", size: 512 },
  { src: "assets/app-icon.webp", file: "public/icons/icon-maskable-512.png", size: 512 },
  // iOS draws its own rounded corners, so the touch icon uses the full bleed square.
  { src: "assets/app-icon.webp", file: "public/apple-touch-icon.png", size: 180 },
];

await mkdir("public/icons", { recursive: true });
await mkdir("src/client/assets", { recursive: true });
for (const { src, file, size } of out) {
  await sharp(src).resize(size, size).toFile(file);
  console.log(`wrote ${file} (${size}x${size})`);
}

// Portrait CSS sizes and DPR. Shared sizes need just one image per appearance.
// Latest Pro/Max: https://www.apple.com/iphone-18-pro/specs/
const phones = [
  { width: 375, height: 667, dpr: 2, models: "SE (2nd/3rd generation)" },
  { width: 375, height: 812, dpr: 3, models: "X/XS/11 Pro, 12/13 mini" },
  { width: 414, height: 896, dpr: 2, models: "XR/11" },
  { width: 414, height: 896, dpr: 3, models: "XS Max/11 Pro Max" },
  { width: 390, height: 844, dpr: 3, models: "12/12 Pro/13/13 Pro/14/16e/17e" },
  { width: 428, height: 926, dpr: 3, models: "12/13 Pro Max, 14 Plus" },
  { width: 393, height: 852, dpr: 3, models: "14 Pro/15/15 Pro/16" },
  { width: 430, height: 932, dpr: 3, models: "14/15 Pro Max, 15/16 Plus" },
  { width: 402, height: 874, dpr: 3, models: "16 Pro/17/17 Pro/18 Pro" },
  { width: 420, height: 912, dpr: 3, models: "Air" },
  { width: 440, height: 956, dpr: 3, models: "16/17/18 Pro Max" },
];
await mkdir("public/splash", { recursive: true });
const links = [];
let total = 0;
for (const { width, height, dpr } of phones) {
  const pixelsWide = width * dpr;
  const pixelsHigh = height * dpr;
  const heart = await sharp("assets/brand-heart.webp").resize(Math.round(pixelsWide * 0.28)).toBuffer();
  for (const [mode, palette] of [["light", "peach"], ["dark", "cocoa"]]) {
    const href = `/splash/${width}x${height}-${dpr}x-${mode}.png`;
    // A smaller, quieter weave compresses well across the full launch screen.
    const linen = await sharp("src/client/assets/linen.webp").resize(64 * dpr, 64 * dpr)
      .removeAlpha().linear(mode === "light" ? 0.08 : 0.025, mode === "light" ? 255 * 0.92 : 0).png().toBuffer();
    await sharp({ create: { width: pixelsWide, height: pixelsHigh, channels: 3, background: palettes[palette].tokens.background } })
      .composite([{ input: linen, tile: true, blend: mode === "light" ? "multiply" : "screen" }, { input: heart, gravity: "centre" }])
      .png({ compressionLevel: 9, palette: true, colours: 64, dither: 0 }).toFile(`public${href}`);
    total += (await stat(`public${href}`)).size;
    links.push(`    <link rel="apple-touch-startup-image" href="${href}" media="(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${mode})" />`);
  }
}
const html = await readFile("index.html", "utf8");
const block = `    <!-- splash:start -->\n${links.join("\n")}\n    <!-- splash:end -->`;
await writeFile("index.html", html.includes("<!-- splash:start -->")
  ? html.replace(/    <!-- splash:start -->[\s\S]*?<!-- splash:end -->/, block)
  : html.replace("  </head>", `${block}\n  </head>`));
console.log(`wrote ${links.length} splash PNGs: ${total} bytes (${(total / 1024 / 1024).toFixed(2)} MiB)`);
