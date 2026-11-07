import { describe, expect, it } from "vitest";
import { CARDS, DECKS, drawCard } from "../src/shared/garden";

describe("Garden draw", () => {
  it("R6 R8: deterministic for a seed and offers each deck from light to deep", () => {
    for (let seed = 0; seed < 60; seed++) {
      const card = drawCard({}, seed)!;
      expect(drawCard({}, seed)).toEqual(card);
      expect(card).toEqual(CARDS.find((c) => c.deckId === card.deckId));
    }
  });
  it("R3 R11 AC19: skips played cards and returns null when all are played", () => {
    expect(drawCard({ played: CARDS.map((c) => c.id) }, 0)).toBeNull();
    const first = drawCard({}, 0)!;
    expect(drawCard({ played: [first.id] }, 0)?.id).not.toBe(first.id);
  });
  it("R9 AC4: avoids yesterday's deck unless it is the only deck left", () => {
    const deck = DECKS[0]!.id;
    for (let seed = 0; seed < 60; seed++) expect(drawCard({ previousDeck: deck }, seed)?.deckId).not.toBe(deck);
    expect(drawCard({ previousDeck: deck, played: CARDS.filter((c) => c.deckId !== deck).map((c) => c.id) }, 0)?.deckId).toBe(deck);
  });
});
