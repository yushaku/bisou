import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { test } from "node:test";

test("initial JavaScript stays below 200 kB gzipped", async () => {
  const root = new URL("../dist/client/", import.meta.url);
  const html = await readFile(new URL("index.html", root), "utf8");
  const files = [...html.matchAll(/(?:src|href)="\/([^"?]+\.js)"/g)].map((match) => match[1]);
  assert.ok(files.length > 0, "Built HTML must load JavaScript");
  const sizes = await Promise.all(
    [...new Set(files)].map(async (file) => gzipSync(await readFile(new URL(file, root))).length),
  );
  const bytes = sizes.reduce((sum, size) => sum + size, 0);
  assert.ok(bytes < 200_000, `Initial JavaScript: ${bytes} bytes gzipped (budget: 200000)`);
});
