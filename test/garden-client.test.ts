import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { GardenCard } from "../src/client/components/bisou/GardenCard";
import { StarredBlock } from "../src/client/components/bisou/StarredCards";
import { I18nProvider } from "../src/client/i18n";
import {
  cardPhase,
  flipKey,
  gardenQuestion,
  gardenMemoryKey,
  gardenSeen,
  rememberGarden,
  starredHere,
} from "../src/client/lib/garden";
import type { GardenCardState } from "../src/shared/garden";
import { readFileSync } from "node:fs";

const card: GardenCardState = {
  starred: false,
  cardId: "money-01",
  mine: "my words",
  partner: null,
  partnerAnswered: false,
  mineChoice: null,
  partnerChoice: null,
  mineEdited: false,
  partnerEdited: false,
  mineDeleted: false,
  partnerDeleted: false,
  flippedDay: null,
};
afterEach(() => vi.unstubAllGlobals());

it("garden-stars AC40 AC42: starred cards stay hidden until this reader flips on this device; empty Home has no block", () => {
  const store = new Map([["bisou.locale", "vi"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null });
  const flipped = { ...card, starred: true, partner: "partner words", flippedDay: "2026-11-09" };
  expect(starredHere([flipped], "stars-reader")).toEqual([]);
  store.set(flipKey("stars-reader", flipped), "1");
  expect(starredHere([flipped], "stars-reader")).toEqual([flipped]);
  expect(starredHere([flipped], "other-reader")).toEqual([]);
  expect(starredHere([], "stars-reader")).toEqual([]);
  expect(
    renderToString(
      h(
        I18nProvider,
        null,
        h(StarredBlock, {
          couple: { id: "c", members: [], events: [], startDate: null },
          user: {
            id: "u",
            email: "an@example.com",
            displayName: "An",
            birthDate: null,
            avatarId: null,
            locale: "vi",
            createdAt: 0,
          },
          onSignedOut: () => {},
        }),
      ),
    ),
  ).toBe("");
});

it("garden-stars R69 R73: a starred decision appears only after this device revealed it", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null });
  const decision: GardenCardState = {
    ...card,
    cardId: "L2-01",
    starred: true,
    partner: null,
    partnerChoice: "later_not_applicable",
    flippedDay: "2026-11-09",
  };
  expect(starredHere([decision], "decision-preview")).toEqual([]);
  store.set(flipKey("decision-preview", decision), "1");
  expect(starredHere([decision], "decision-preview")).toEqual([decision]);
});

it("garden R4 R15 AC21: card phase handles tombstones and unknown cards have translated fallback copy", () => {
  expect(cardPhase({ ...card, mine: null })).toBe("open");
  expect(cardPhase(card)).toBe("waiting");
  expect(cardPhase({ ...card, mine: null, mineDeleted: true, flippedDay: "2026-11-09" })).toBe("flipped");
  expect(gardenQuestion("money-01", "en", () => "fallback")).toContain("Growing up");
  expect(gardenQuestion("old-card", "en", () => "fallback")).toBe("fallback");
});

it("garden R1 R13 R36: PWA caching excludes API navigations and has no runtime data cache", () => {
  const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  expect(config).toContain("navigateFallbackDenylist: [/^\\/api\\//]");
  expect(config).toContain("runtimeCaching: []");
});

it("garden-stages R43 AC25: a card with both choices but no flip is still waiting", () => {
  const chosen = {
    ...card,
    mine: null,
    mineChoice: "no_details" as const,
    partnerChoice: "later_not_applicable" as const,
  };
  expect(cardPhase(chosen)).toBe("waiting");
});

it("garden R15 AC9: one flip persists across remounts and surfaces, scoped to couple, user, card and day", () => {
  const store = new Map([["bisou.locale", "vi"]]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
  const flipped = { ...card, partner: "partner words", partnerAnswered: true, flippedDay: "2026-11-09" };
  const key = gardenMemoryKey("couple:user", "flip", "money-01:2026-11-09");
  expect(gardenSeen(key)).toBe(false);
  rememberGarden(key);
  for (const variant of ["today", "deck"] as const) {
    const html = renderToString(
      h(
        I18nProvider,
        null,
        h(GardenCard, {
          variant,
          card: flipped,
          myName: "An",
          partnerName: "Binh",
          memoryScope: "couple:user",
          onChanged: () => {},
          onSignedOut: () => {},
        }),
      ),
    );
    expect(html).toContain("my words");
    expect(html).toContain("partner words");
    expect(html).not.toContain("Lật thẻ");
  }
  expect(gardenSeen(gardenMemoryKey("couple:partner", "flip", "money-01:2026-11-09"))).toBe(false);
  expect(gardenSeen(gardenMemoryKey("couple:user", "flip", "money-01:2026-11-10"))).toBe(false);
});
it("garden R15, garden-stages R48: device memory handles unavailable storage without losing session state", () => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  const key = gardenMemoryKey("blocked-test", "stage", "in_love");
  expect(gardenSeen(key)).toBe(false);
  rememberGarden(key);
  expect(gardenSeen(key)).toBe(true);
});

it.each(["vi", "en"])("garden-stars AC39: %s star toggle requires a device-revealed paired card", (locale) => {
  let seen = false;
  vi.stubGlobal("localStorage", { getItem: (key: string) => (key === "bisou.locale" ? locale : seen ? "1" : null) });
  const render = (state: GardenCardState, variant: "today" | "deck" = "deck") =>
    renderToString(
      h(
        I18nProvider,
        null,
        h(GardenCard, {
          variant,
          card: state,
          myName: "An",
          partnerName: "Binh",
          memoryScope: "star-ui",
          onChanged: () => {},
          onSignedOut: () => {},
        }),
      ),
    );
  const flipped = { ...card, partner: "other", flippedDay: "2026-11-09" };
  expect(render(flipped)).not.toContain("aria-pressed=");
  seen = true;
  for (const variant of ["today", "deck"] as const) {
    expect(render(flipped, variant)).toContain('aria-pressed="false"');
    expect(render(flipped, variant)).toContain(locale === "vi" ? "Gắn sao" : "Star");
    expect(render({ ...flipped, starred: true }, variant)).toContain('aria-pressed="true"');
    expect(render({ ...flipped, starred: true }, variant)).toContain(locale === "vi" ? "Bỏ sao" : "Unstar");
  }
  expect(render(card)).not.toContain("aria-pressed=");
  expect(render({ ...flipped, cardId: "L2-01" })).toContain('aria-pressed="false"');
  expect(render({ ...card, cardId: "L2-01" })).not.toContain("aria-pressed=");
  seen = false;
  expect(render({ ...flipped, cardId: "L2-01" })).not.toContain("aria-pressed=");
  seen = true;
  expect(render({ ...flipped, mine: null, partner: null, mineDeleted: true, partnerDeleted: true })).toContain(
    'aria-pressed="false"',
  );
});
