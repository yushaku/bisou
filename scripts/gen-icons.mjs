// Renders the placeholder PWA icons from the SVG sources in assets/ (run: pnpm icons).
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const out = [
  { src: "assets/icon.svg", file: "public/icons/icon-192.png", size: 192 },
  { src: "assets/icon.svg", file: "public/icons/icon-512.png", size: 512 },
  { src: "assets/icon-maskable.svg", file: "public/icons/icon-maskable-512.png", size: 512 },
  // iOS draws its own rounded corners, so the touch icon uses the full bleed square.
  { src: "assets/icon-maskable.svg", file: "public/apple-touch-icon.png", size: 180 },
];

await mkdir("public/icons", { recursive: true });
for (const { src, file, size } of out) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(file);
  console.log(`wrote ${file} (${size}x${size})`);
}
