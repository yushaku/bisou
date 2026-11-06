import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";
import palettes from "../src/client/theme/palettes.json" with { type: "json" };

test("every portrait splash link has matching pixels and the approved background", async () => {
  const html = await readFile("index.html", "utf8");
  const links = [...html.matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)"/g)];
  assert.equal(links.length, 22);
  for (const [, href, media] of links) {
    const [, width, height, dpr, mode] = href.match(/(\d+)x(\d+)@(\d)x-(light|dark)/);
    const image = sharp(`public${href}`);
    const meta = await image.metadata();
    assert.equal(meta.width, Number(width) * Number(dpr));
    assert.equal(meta.height, Number(height) * Number(dpr));
    assert.ok(media.includes(`(device-width: ${width}px)`));
    assert.ok(media.includes(`(device-height: ${height}px)`));
    assert.ok(media.includes(`(-webkit-device-pixel-ratio: ${dpr})`));
    assert.ok(media.includes(`(prefers-color-scheme: ${mode})`));
    assert.ok(media.includes("(orientation: portrait)"));
    const pixel = await image.extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    const expected = palettes[mode === "light" ? "peach" : "cocoa"].tokens.background;
    const background = expected.slice(1).match(/../g).map((part) => parseInt(part, 16));
    // The subtle linen overlay stays close to its base palette.
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(pixel[i] - background[i]) < 16);
  }
});
