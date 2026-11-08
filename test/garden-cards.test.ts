import { expect, it } from "vitest";
import { CARDS, DECKS } from "../src/shared/garden";

it("R2 R3 R4 R17 AC21: approved stable bilingual cards retain deck, purpose and depth", () => {
  expect(CARDS).toHaveLength(95);
  expect(new Set(CARDS.map((c) => c.id)).size).toBe(95);
  expect(DECKS).toHaveLength(6);
  for (const deck of DECKS) {
    expect(deck.name.vi).toBeTruthy();
    expect(deck.name.en).toBeTruthy();
    expect(deck.purpose.vi).toBeTruthy();
    expect(deck.purpose.en).toBeTruthy();
    const cards = CARDS.filter((c) => c.deckId === deck.id && !c.id.startsWith("L"));
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

it("R41 R52 AC24: new catalog has unique bilingual stage/category/role metadata", () => {
  expect(CARDS.filter((c) => c.id.startsWith("L"))).toHaveLength(35);
  for (const card of CARDS) {
    expect(DECKS.some((deck) => deck.id === card.deckId)).toBe(true);
    expect(card.levelId).toBeTruthy();
    expect(["ordinary", "decision"]).toContain(card.kind);
    expect(card.text.vi).toBeTruthy(); expect(card.text.en).toBeTruthy();
  }
});

it("R52 AC26: all 60 original IDs, texts, categories, depths and ordering remain byte-for-byte compatible", async () => {
  const legacy = CARDS.filter((card) => !card.id.startsWith("L")).map(({id, deckId, depth, text}) => ({id, deckId, depth, text}));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(legacy)));
  expect(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")).toBe("5d160a5f8e43fd0e9e3ca1e6ab6e293a684241c96ea2328bf230f48639315c57");
});
