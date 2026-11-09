import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { GardenCard } from "../src/client/components/bisou/GardenCard";
import { AnswerSlots } from "../src/client/components/bisou/AnswerSlots";
import { I18nProvider } from "../src/client/i18n";
import { cardPhase, gardenQuestion } from "../src/client/lib/garden";
import type { GardenCardState } from "../src/shared/garden";
import { Plant } from "../src/client/components/bisou/Plant";
import { Planter } from "../src/client/components/bisou/Planter";
import { DECKS } from "../src/shared/garden";
import { readFileSync } from "node:fs";

const card: GardenCardState = { cardId: "money-01", mine: "my words", partner: null, mineChoice: null, partnerChoice: null, mineEdited: false, partnerEdited: false, mineDeleted: false, partnerDeleted: false, flippedDay: null };
afterEach(() => vi.unstubAllGlobals());

it("R13 R14 R30 R31 AC8: face-down slots contain no answers, partner names, times or scores", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const html = renderToString(h(I18nProvider, null, h(AnswerSlots, { card, revealed: false, myName: "An", partnerName: "SECRET NAME" })));
  expect(html).toContain("Đang chờ người ấy");
  expect(html).not.toContain("my words");
  expect(html).not.toContain("SECRET NAME");
  expect(html).not.toContain("<time");
});

it("R15 R19 AC9 AC17: flipped slots show own answer first and edited and deleted states", () => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const html = renderToString(h(I18nProvider, null, h(AnswerSlots, { card: { ...card, mineEdited: true, partnerDeleted: true, flippedDay: "2026-11-09" }, revealed: true, myName: "An", partnerName: "Bình" })));
  expect(html.indexOf("An")).toBeLessThan(html.indexOf("Bình"));
  expect(html).toContain("my words");
  expect(html).toContain("edited");
  expect(html).toContain("This answer was deleted");
});

it("R4 R15 AC21: card phase handles tombstones and unknown cards have translated fallback copy", () => {
  expect(cardPhase({ ...card, mine: null })).toBe("open");
  expect(cardPhase(card)).toBe("waiting");
  expect(cardPhase({ ...card, mine: null, mineDeleted: true, flippedDay: "2026-11-09" })).toBe("flipped");
  expect(gardenQuestion("money-01", "en", () => "fallback")).toContain("Growing up");
  expect(gardenQuestion("old-card", "en", () => "fallback")).toBe("fallback");
});

it("R2 R23 R28 R30 AC2 AC14: plants have eight layered sizes, unique SVG ids, deck-only names and readable freshness", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const html = renderToString(h(I18nProvider, null, h("div", null,
    ...Array.from({ length: 8 }, (_, stage) => h(Plant, { deckId: "money", stage, key: stage })),
    h(Planter, { plants: DECKS.map((d) => ({ deckId: d.id, stage: 0 })), freshness: "wilted", onOpen: () => {} }))));
  for (let stage = 0; stage < 8; stage++) expect(html).toContain(`data-stage="${stage}"`);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(html).toContain('aria-label="Tiền bạc"');
  expect(html).toContain("Không cây nào mất đi đâu");
  expect(html).not.toMatch(/(?:level|stage|size|cỡ cây) \d/i);
});

it("R1 R13 R36: PWA caching excludes API navigations and has no runtime data cache", () => {
  const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  expect(config).toContain("navigateFallbackDenylist: [/^\\/api\\//]");
  expect(config).toContain("runtimeCaching: []");
});

it.each(["vi", "en"])("R44 R64 AC25 AC35: %s decision notice explains reveal, retention and unavailable controls before submission", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { card: { ...card, cardId: "L2-01", mine: null }, myName: "An", partnerName: "Binh", onChanged: () => {}, onSignedOut: () => {} })));
  for (const phrase of locale === "vi" ? ["Khi cả hai gửi", "đến khi bạn xoá", "rời đôi", "tải dữ liệu", "tự sao chép"] : ["Once both submit", "until you delete", "unpairing", "data downloads", "manually copy"]) expect(html).toContain(phrase);
  expect(html.indexOf("<h2")).toBeLessThan(html.indexOf(locale === "vi" ? "Khi cả hai gửi" : "Once both submit"));
  expect(html.indexOf(locale === "vi" ? "Khi cả hai gửi" : "Once both submit")).toBeLessThan(html.indexOf("<button"));
});
it("R43 AC25: choice-aware slots localize own-first choices only after explicit flip", () => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const chosen = { ...card, mine: null, mineChoice: "no_details" as const, partnerChoice: "later_not_applicable" as const };
  expect(cardPhase(chosen)).toBe("waiting");
  const render = (revealed: boolean) => renderToString(h(I18nProvider, null, h(AnswerSlots, { card: chosen, revealed, myName: "An", partnerName: "Binh" })));
  expect(render(false)).not.toContain("No details");
  expect(render(true).indexOf("No details")).toBeLessThan(render(true).indexOf("Later / not applicable"));
});

it.each(["vi", "en"])("decision waiting copy includes text and neutral choices in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { card: { ...card, cardId: "L2-01" }, myName: "An", partnerName: "Binh", onChanged: () => {}, onSignedOut: () => {} })));
  expect(html).toContain(locale === "vi" ? "Hai đứa có thể lật thẻ khi cả hai đã gửi chữ hoặc một lựa chọn." : "You can flip the card once you have both submitted text or a choice.");
  expect(html).not.toContain(locale === "vi" ? "Hai thẻ sẽ cùng lật khi cả hai đã viết xong." : "The cards will flip when you have both finished writing.");
});

it.each(["vi", "en"])("today variant keeps the soft paper card private in every state (%s)", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const render = (state: GardenCardState, props: { variant?: "deck" | "today" } = { variant: "today" }) => renderToString(h(I18nProvider, null, h(GardenCard, { card: state, myName: "An", partnerName: "Binh", onChanged: () => {}, onSignedOut: () => {}, ...props })));
  const open = render({ ...card, mine: null });
  expect(open).toContain(locale === "vi" ? "Viết câu trả lời" : "Write your answer");
  expect(open).not.toContain("my words");
  const waiting = render(card);
  expect(waiting).toContain(locale === "vi" ? "Đã úp thẻ" : "Placed face down");
  expect(waiting).toContain(locale === "vi" ? "Đang chờ người ấy" : "Waiting for your partner");
  expect(waiting).not.toContain("my words");
  const flipped = render({ ...card, partner: "partner words", flippedDay: "2026-11-08" });
  expect(flipped).toContain(locale === "vi" ? "Lật thẻ" : "Flip");
  expect(flipped).not.toContain("my words");
  expect(flipped).not.toContain("partner words");
});
