import { expect, it } from "vitest";
import { CARDS, DECKS } from "../src/shared/garden";

it("R2 R3 R4 R17 AC21: approved stable bilingual cards retain deck, purpose and depth", () => {
  expect(CARDS).toHaveLength(60);
  expect(new Set(CARDS.map((c) => c.id)).size).toBe(60);
  expect(DECKS).toHaveLength(6);
  for (const deck of DECKS) {
    expect(deck.name.vi).toBeTruthy();
    expect(deck.name.en).toBeTruthy();
    expect(deck.purpose.vi).toBeTruthy();
    expect(deck.purpose.en).toBeTruthy();
    const cards = CARDS.filter((c) => c.deckId === deck.id);
    expect(cards).toHaveLength(10);
    expect(cards.map((c) => ({ light: 0, medium: 1, deep: 2 })[c.depth])).toEqual(cards.map((c) => ({ light: 0, medium: 1, deep: 2 })[c.depth]).sort());
    for (const card of cards) {
      expect(card.id).toMatch(new RegExp(`^${deck.id}-\\d{2}$`));
      expect(card.text.vi).toBeTruthy();
      expect(card.text.en).toBeTruthy();
    }
  }
  expect(CARDS.find((c) => c.id === "money-01")?.text.en).toBe("Growing up, how did your family talk about money?");
});
