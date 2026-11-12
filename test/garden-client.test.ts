import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { GardenCard } from "../src/client/components/bisou/GardenCard";
import { AnswerSlots } from "../src/client/components/bisou/AnswerSlots";
import { StarredCard, StarredBlock } from "../src/client/components/bisou/StarredCards";
import { I18nProvider } from "../src/client/i18n";
import { cardPhase, flipKey, gardenQuestion, gardenMemoryKey, gardenSeen, rememberGarden, starredHere } from "../src/client/lib/garden";
import type { GardenCardState } from "../src/shared/garden";
import { Plant } from "../src/client/components/bisou/Plant";
import { Planter } from "../src/client/components/bisou/Planter";
import { DECKS } from "../src/shared/garden";
import { readFileSync } from "node:fs";

const card: GardenCardState = { starred: false, cardId: "money-01", mine: "my words", partner: null, partnerAnswered: false, mineChoice: null, partnerChoice: null, mineEdited: false, partnerEdited: false, mineDeleted: false, partnerDeleted: false, flippedDay: null };
afterEach(() => vi.unstubAllGlobals());

it("AC40 AC42: starred cards stay hidden until this reader flips on this device; empty Home has no block", () => {
  const store = new Map([["bisou.locale", "vi"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null });
  const flipped = { ...card, starred: true, partner: "partner words", flippedDay: "2026-11-09" };
  expect(starredHere([flipped], "stars-reader")).toEqual([]);
  store.set(flipKey("stars-reader", flipped), "1");
  expect(starredHere([flipped], "stars-reader")).toEqual([flipped]);
  expect(starredHere([flipped], "other-reader")).toEqual([]);
  expect(starredHere([], "stars-reader")).toEqual([]);
  expect(renderToString(h(I18nProvider, null, h(StarredBlock, { couple: { id: "c", members: [], events: [], startDate: null }, user: { id: "u", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null, locale: "vi", createdAt: 0 }, onSignedOut: () => {} })))).toBe("");
});

it.each(["vi", "en"])("AC43 AC44 R75: %s starred preview localizes questions, preserves own-first answers and markers without dates", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const render = (state: GardenCardState) => renderToString(h(I18nProvider, null, h(StarredCard, { card: state, myName: "An", partnerName: "Bình", onOpen: () => {} })));
  const flipped = { ...card, starred: true, partner: "Bình wrote this", partnerEdited: true, flippedDay: "2026-11-09" };
  const html = render(flipped);
  expect(html).toContain(locale === "en" ? "Growing up, how did your family talk about money?" : "Hồi nhỏ, nhà mình nói chuyện tiền bạc với nhau như thế nào?");
  expect(html.indexOf("my words")).toBeLessThan(html.indexOf("Bình wrote this"));
  expect(html).toContain(locale === "en" ? "edited" : "đã sửa");
  expect(html).toContain("line-clamp-4");
  expect(html).not.toContain("<time"); expect(html).not.toContain("2026-11-09");
  expect(render({ ...flipped, mine: null, mineDeleted: true })).toContain(locale === "en" ? "This answer was deleted" : "Câu trả lời này đã được xoá");
});

it.each(["vi", "en"])("R69 R73: %s decision preview keeps the device reveal rule and renders deferred and neutral labels", locale => {
  const store = new Map([["bisou.locale", locale]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null });
  const decision: GardenCardState = { ...card, cardId: "L2-01", starred: true, partner: null, partnerChoice: "later_not_applicable", flippedDay: "2026-11-09" };
  expect(starredHere([decision], "decision-preview")).toEqual([]);
  store.set(flipKey("decision-preview", decision), "1");
  expect(starredHere([decision], "decision-preview")).toEqual([decision]);
  const render = (state: GardenCardState) => renderToString(h(I18nProvider, null, h(StarredCard, { card: state, myName: "An", partnerName: "Bình", onOpen: () => {} })));
  const html = render(decision);
  expect(html).toContain(locale === "vi" ? "Để sau" : "Later");
  expect(html).toContain("my words"); expect(html).toContain("line-clamp-4");
  expect(html).not.toContain("later_not_applicable");
  expect(render({ ...decision, partnerChoice: "no_details" })).toContain(locale === "vi" ? "Không ghi chi tiết" : "No details");
});

it("R13 R14 R30 R31 AC8: face-down slots show real names without answers or timestamps", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const html = renderToString(h(I18nProvider, null, h(AnswerSlots, { card, revealed: false, myName: "An", partnerName: "SECRET NAME" })));
  expect(html).toContain("Đợi SECRET NAME nhé");
  expect(html).not.toContain("my words");
  expect(html).toContain("SECRET NAME");
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

it.each(["vi", "en"])("R44 R64 AC25 AC35: %s decision cards omit the privacy notice", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { card: { ...card, cardId: "L2-01", mine: null }, myName: "An", partnerName: "Binh", memoryScope: "client-test", onChanged: () => {}, onSignedOut: () => {} })));
  expect(html).not.toContain(locale === "vi" ? "Khi cả hai gửi" : "Once both submit");
  expect(html).not.toContain(locale === "vi" ? "tải dữ liệu" : "data downloads");
  expect(html).not.toContain(locale === "vi" ? "Chỉ đọc được câu trả lời" : "Your answers stay private");
});
it("R43 AC25: choice-aware slots localize own-first choices only after explicit flip", () => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const chosen = { ...card, mine: null, mineChoice: "no_details" as const, partnerChoice: "later_not_applicable" as const };
  expect(cardPhase(chosen)).toBe("waiting");
  const render = (revealed: boolean) => renderToString(h(I18nProvider, null, h(AnswerSlots, { card: chosen, revealed, myName: "An", partnerName: "Binh" })));
  expect(render(false)).not.toContain("No details");
  expect(render(true).indexOf("No details")).toBeLessThan(render(true).indexOf("Later"));
});

it.each(["vi", "en"])("R14: decision waiting copy names the partner in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { card: { ...card, cardId: "L2-01" }, myName: "An", partnerName: "Binh", memoryScope: "client-test", onChanged: () => {}, onSignedOut: () => {} })));
  expect(html).toContain(locale === "vi" ? "Đợi Binh nhé" : "Waiting for Binh");
});

it.each(["vi", "en"])("today variant keeps the soft paper card private in every state (%s)", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const render = (state: GardenCardState, props: { variant?: "deck" | "today" } = { variant: "today" }) => renderToString(h(I18nProvider, null, h(GardenCard, { card: state, myName: "An", partnerName: "Binh", memoryScope: "client-test", onChanged: () => {}, onSignedOut: () => {}, ...props })));
  const open = render({ ...card, mine: null });
  expect(open).toContain(locale === "vi" ? "Viết" : "Write");
  expect(open).not.toContain("my words");
  const waiting = render(card);
  expect(waiting).toContain(locale === "vi" ? "Đã úp thẻ" : "Placed face down");
  expect(waiting).toContain(locale === "vi" ? "Đợi Binh nhé" : "Waiting for Binh");
  expect(waiting).not.toContain("my words");
  const flipped = render({ ...card, partner: "partner words", flippedDay: "2026-11-08" });
  expect(flipped).toContain(locale === "vi" ? "Lật thẻ" : "Flip");
  expect(flipped).not.toContain("my words");
  expect(flipped).not.toContain("partner words");
});

it.each(["vi", "en"])("R13 R14: partner answered state calls the author by name with a prominent write action (%s)", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { variant: "today", card: { ...card, mine: null, partnerAnswered: true }, myName: "An", partnerName: "Binh", memoryScope: "client-test", onChanged: () => {}, onSignedOut: () => {} })));
  expect(html).toContain(locale === "vi" ? "Binh đã úp thẻ, tới lượt mình" : "Binh placed a card face down, your turn");
  expect(html).toContain(locale === "vi" ? "Viết" : "Write");
  expect(html).not.toContain("my words");
});
it("R15 AC9: one flip persists across remounts and surfaces, scoped to couple, user, card and day", () => {
  const store = new Map([["bisou.locale", "vi"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  vi.stubGlobal("window", new EventTarget());
  const flipped = { ...card, partner: "partner words", partnerAnswered: true, flippedDay: "2026-11-09" };
  const key = gardenMemoryKey("couple:user", "flip", "money-01:2026-11-09");
  expect(gardenSeen(key)).toBe(false);
  rememberGarden(key);
  for (const variant of ["today", "deck"] as const) {
    const html = renderToString(h(I18nProvider, null, h(GardenCard, { variant, card: flipped, myName: "An", partnerName: "Binh", memoryScope: "couple:user", onChanged: () => {}, onSignedOut: () => {} })));
    expect(html).toContain("my words"); expect(html).toContain("partner words");
    expect(html).not.toContain("Lật thẻ");
  }
  expect(gardenSeen(gardenMemoryKey("couple:partner", "flip", "money-01:2026-11-09"))).toBe(false);
  expect(gardenSeen(gardenMemoryKey("couple:user", "flip", "money-01:2026-11-10"))).toBe(false);
});
it("R19 AC17: a deleted answer offers writing again while the partner stays face up", () => {
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "bisou.locale" ? "vi" : "1" });
  const html = renderToString(h(I18nProvider, null, h(GardenCard, { card: { ...card, mine: null, mineDeleted: true, partner: "partner remains", flippedDay: "2026-11-09" }, myName: "An", partnerName: "Binh", memoryScope: "deleted-test", onChanged: () => {}, onSignedOut: () => {} })));
  expect(html).toContain("partner remains"); expect(html).toContain("Viết"); expect(html).not.toContain("Lật thẻ");
});
it("R15 R48: device memory handles unavailable storage without losing session state", () => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  const key = gardenMemoryKey("blocked-test", "stage", "in_love");
  expect(gardenSeen(key)).toBe(false); rememberGarden(key); expect(gardenSeen(key)).toBe(true);
});

it.each(["vi", "en"])("AC39: %s star toggle requires a device-revealed paired card", (locale) => {
  let seen = false;
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "bisou.locale" ? locale : seen ? "1" : null });
  const render = (state: GardenCardState, variant: "today" | "deck" = "deck") => renderToString(h(I18nProvider, null, h(GardenCard, { variant, card: state, myName: "An", partnerName: "Binh", memoryScope: "star-ui", onChanged: () => {}, onSignedOut: () => {} })));
  const flipped = { ...card, partner: "other", flippedDay: "2026-11-09" };
  expect(render(flipped)).not.toContain('aria-pressed=');
  seen = true;
  for (const variant of ["today", "deck"] as const) {
    expect(render(flipped, variant)).toContain('aria-pressed="false"');
    expect(render(flipped, variant)).toContain(locale === "vi" ? "Gắn sao" : "Star");
    expect(render({ ...flipped, starred: true }, variant)).toContain('aria-pressed="true"');
    expect(render({ ...flipped, starred: true }, variant)).toContain(locale === "vi" ? "Bỏ sao" : "Unstar");
  }
  expect(render(card)).not.toContain('aria-pressed=');
  expect(render({ ...flipped, cardId: "L2-01" })).toContain('aria-pressed="false"');
  expect(render({ ...card, cardId: "L2-01" })).not.toContain('aria-pressed=');
  seen = false;
  expect(render({ ...flipped, cardId: "L2-01" })).not.toContain('aria-pressed=');
  seen = true;
  expect(render({ ...flipped, mine: null, partner: null, mineDeleted: true, partnerDeleted: true })).toContain('aria-pressed="false"');
});
