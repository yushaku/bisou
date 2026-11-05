// Exports the brand mark, favicons and install icons from assets/ (pnpm icons).
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

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
