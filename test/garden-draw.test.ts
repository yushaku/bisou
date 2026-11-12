import { describe, expect, it } from "vitest";
import { CARDS, DECKS, drawCard } from "../src/shared/garden";

describe("Garden draw", () => {
  it("garden R6 R8: deterministic for a seed and offers each deck from light to deep", () => {
    for (let seed = 0; seed < 60; seed++) {
      const card = drawCard({}, seed)!;
      expect(drawCard({}, seed)).toEqual(card);
      expect(card).toEqual(CARDS.find((c) => c.deckId === card.deckId));
    }
  });
  it("garden R3 R11 AC19: skips played cards and returns null when all are played", () => {
    expect(drawCard({ played: CARDS.map((c) => c.id) }, 0)).toBeNull();
    const first = drawCard({}, 0)!;
    expect(drawCard({ played: [first.id] }, 0)?.id).not.toBe(first.id);
  });
  it("garden R9 AC4: avoids yesterday's deck unless it is the only deck left", () => {
    const deck = DECKS[0]!.id;
    for (let seed = 0; seed < 60; seed++) expect(drawCard({ previousDeck: deck }, seed)?.deckId).not.toBe(deck);
    expect(drawCard({ previousDeck: deck, played: CARDS.filter((c) => c.deckId !== deck).map((c) => c.id) }, 0)?.deckId).toBe(deck);
  });
  it("garden R8 AC4: smaller plants are weighted up to three times, with a full tree counting once", () => {
    const [small, big] = DECKS;
    const counts = { [small!.id]: 0, [big!.id]: 0 };
    for (let seed = 0; seed < 400; seed++) {
      const card = drawCard({ played: CARDS.filter((c) => c.deckId !== small!.id && c.deckId !== big!.id).map((c) => c.id), stages: { [small!.id]: 0, [big!.id]: 7 } }, seed)!;
      counts[card.deckId]!++;
    }
    expect(counts).toEqual({ [small!.id]: 300, [big!.id]: 100 });
  });
  it("garden R10 AC5: swapped cards return at the back of their deck in swap order", () => {
    const deck = DECKS[0]!.id;
    const others = CARDS.filter((c) => c.deckId !== deck).map((c) => c.id);
    expect(drawCard({ played: others, swapped: [`${deck}-01`] }, 0)?.id).toBe(`${deck}-02`);
    expect(drawCard({ played: CARDS.filter((c) => c.id !== `${deck}-01` && c.id !== `${deck}-02`).map((c) => c.id), swapped: [`${deck}-02`, `${deck}-01`] }, 0)?.id).toBe(`${deck}-02`);
  });
});

it("garden-stages R53 R79 AC31 AC36: only opened ordinary cards enter draws; locked cards do not prevent exhaustion", () => {
  const legacy = CARDS.filter((c) => !c.id.startsWith("L")).map((c) => c.id);
  expect(drawCard({ played: legacy }, 0)).toBeNull();
  const next = drawCard({ played: legacy, furthestLevel: 1 }, 0)!;
  expect(next.kind).toBe("ordinary"); expect(next.levelId).toBe("in_love");
  expect(drawCard({ played: CARDS.filter((c) => c.kind === "ordinary" && ["acquainted", "in_love"].includes(c.levelId)).map((c) => c.id), furthestLevel: 1 }, 0)).toBeNull();
  const candidates = CARDS.filter((c) => c.deckId === "money" && !c.id.startsWith("L"));
  const played = CARDS.filter((c) => c.deckId !== "money" || !candidates.slice(0, 2).includes(c)).map((c) => c.id);
  expect(drawCard({ played, waiting: ["money-01"] }, 0)?.id).toBe("money-02");
  expect(drawCard({ played: [...played, "money-02"], waiting: ["money-01"] }, 0)?.id).toBe("money-01");
});
