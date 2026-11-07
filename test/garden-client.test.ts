import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { AnswerSlots } from "../src/client/components/bisou/AnswerSlots";
import { I18nProvider } from "../src/client/i18n";
import { cardPhase, gardenQuestion } from "../src/client/lib/garden";
import type { GardenCardState } from "../src/shared/garden";

const card: GardenCardState = { cardId: "money-01", mine: "my words", partner: null, mineEdited: false, partnerEdited: false, mineDeleted: false, partnerDeleted: false, flippedDay: null };
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
