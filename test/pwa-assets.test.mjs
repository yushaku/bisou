import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { test } from "node:test";

test("portrait splash PNGs total less than 3 MB", async () => {
  const sizes = await Promise.all(
    (await readdir("public/splash"))
      .filter((file) => file.endsWith(".png"))
      .map(async (file) => (await stat(`public/splash/${file}`)).size),
  );
  assert.ok(sizes.reduce((sum, size) => sum + size, 0) < 3_000_000);
});

test("manifest shortcuts open the journal composer and the spin through the paths the app reads", async () => {
  const config = await readFile("vite.config.ts", "utf8");
  const urls = [...config.matchAll(/shortcuts: \[([^\]]*)\]/g)][0][1]
    .match(/url: "([^"]+)"/g)
    .map((entry) => entry.slice(6, -1));
  assert.deepEqual(urls, ["/journal?compose=1", "/wishes?spin=1"]);
});
