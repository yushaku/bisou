import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { WishJar } from "../src/client/components/bisou/WishJar";
import { I18nProvider } from "../src/client/i18n";

afterEach(() => vi.unstubAllGlobals());

it.each([
  ["vi", "Hũ của An, mở hũ của mình", "Hũ của Bình, quay quà"],
  ["en", "An&#x27;s jar, open my jar", "Bình&#x27;s jar, spin for a gift"],
])("R25, R27: renders full %s names without a partner count and unique clip paths", (locale, mine, partner) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null,
    h(WishJar, { person: { name: "An", tone: "primary" }, level: 4, mine: true, onOpen: () => {} }),
    h(WishJar, { person: { name: "Bình", tone: "secondary" }, level: 2, onOpen: () => {} }),
  ));
  expect(html).toContain(`aria-label="${mine}"`);
  expect(html).toContain(`aria-label="${partner}"`);
  const clips = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(clips).size).toBe(2);
  for (const clip of clips) expect(html).toContain(`clip-path="url(#${clip})"`);
  expect(html).not.toContain("aria-disabled=");
});

it("AC15 (R27): labels only a confirmed empty jar, keeping loading and error jars available", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const render = (empty: boolean) => renderToString(h(I18nProvider, null,
    h(WishJar, { person: { name: "Bình", tone: "secondary" }, level: 0, empty, onOpen: () => {} }),
  ));
  const empty = render(true);
  expect(empty).toContain('aria-disabled="true"');
  expect(empty).toContain('aria-label="Hũ của Bình, quay quà"');
  const description = empty.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(description).toBeDefined();
  expect(empty).toContain(`id="${description}"`);
  expect(empty).toMatch(new RegExp(`<span id="${description}"[^>]*>Chưa bỏ điều ước nào</span>`));
  expect(render(false)).not.toContain("Chưa bỏ điều ước nào");
  expect(render(false)).not.toContain("aria-disabled=");
  expect(render(false)).not.toContain("aria-describedby=");
});
