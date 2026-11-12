import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { I18nProvider } from "../src/client/i18n";
import { CardBoxDeck } from "../src/client/components/bisou/CardBoxDeck";
import { CardBoxCard } from "../src/client/components/bisou/CardBoxCard";
import { CardBoxRows, CardBoxBlock, CardBoxList } from "../src/client/components/bisou/CardBoxBlock";
import { Router } from "wouter";
import { vi, afterEach } from "vitest";
import { expect, it } from "vitest";
import { formatBoxPrice, cardSwipe, cardBoxEndMessage, cardBoxLoadMessage, nextCard, randomCard, previousCard, readSeen, writeSeen, readCache, writeCache, clearCardBoxCache, type Play } from "../src/client/lib/cardBox";
import type { CardBoxDetail } from "../src/shared/cardBox";
import { CardBoxGift } from "../src/client/components/bisou/CardBoxGift";
import { CardBoxPlayer } from "../src/client/screens/CardBoxPlayer";
import { api } from "../src/client/api";
import { CardBoxes } from "../src/client/screens/CardBoxes";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { TABS } from "../src/client/components/bisou/AppShell";
vi.mock("../src/client/components/ui/dialog", async original => ({
  ...await original<typeof import("../src/client/components/ui/dialog")>(),
  DialogContent: ({ children }: { children: import("react").ReactNode }) => h("div", { role: "dialog" }, children),
}));
const detail: CardBoxDetail = { box: { id: "sample", name: { vi: "Hộp", en: "Box" }, description: { vi: "", en: "" }, open: true, cover: "/card-boxes/sample.jpg", price: null }, cards: ["a", "b", "c", "d"].map(id => ({ id, kind: "question", text: { vi: id, en: id } })) };
it("AC26 AC27: load failures stay hidden with cached content and uncached offline content needs a connection", () => {
  expect(cardBoxLoadMessage(true, false, "loadError")).toBeNull();
  expect(cardBoxLoadMessage(true, true, "loadError")).toBeNull();
  expect(cardBoxLoadMessage(false, false, "loadError")).toBe("needsConnection");
  expect(cardBoxLoadMessage(false, false, null)).toBe("needsConnection");
  expect(cardBoxLoadMessage(false, true, "loadError")).toBe("loadError");
  expect(cardBoxLoadMessage(false, true, "notFound")).toBe("notFound");
  expect(cardBoxLoadMessage(false, true, null)).toBeNull();
});
it("AC9 AC14: a completed open box starts over and a completed preview explains the rest opens later", () => {
  expect(cardBoxEndMessage(true)).toBe("cardBox.startOver");
  expect(cardBoxEndMessage(false)).toBe("cardBox.previewEnd");
});
it("AC7 AC8 AC10: unseen draws and complete stack replay before drawing again", () => {
  let play: Play = { stack: [], index: -1, startedOver: false }; let seen: string[] = [];
  for (let i = 0; i < 3; i++) ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.stack).toEqual(["a", "b", "c"]);
  play = previousCard(previousCard(previousCard(play)));
  expect(play.index).toBe(0);
  ({ play, seen } = nextCard(detail, play, seen, () => 0)); expect(play.index).toBe(1); expect(seen).toEqual(["a", "b", "c"]);
  ({ play, seen } = nextCard(detail, play, seen, () => 0)); expect(play.index).toBe(2);
  ({ play, seen } = nextCard(detail, play, seen, () => 0)); expect(play.stack).toEqual(["a", "b", "c", "d"]);
});

it("AC9 AC14 AC15 AC17: preview uses only supplied cards, persists seen and ends without resetting", () => {
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  let play: Play = { stack: [], index: -1, startedOver: false }; let seen = ["a", "obsolete"];
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.stack).toEqual(["b"]); expect(seen).toEqual(["a", "b"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.stack).toEqual(["b", "c"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.startedOver).toBe(true); expect(play.stack.at(-1)).toBe("c"); expect(seen).toEqual(["a", "b", "c"]);
  play = previousCard(play); expect(play.startedOver).toBe(false);
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.startedOver).toBe(false);
  const full = nextCard(detail, { stack: [], index: -1, startedOver: false }, ["a", "b", "c"], () => 0);
  expect(full.play.stack).toEqual(["d"]);
});
it("empty and single-card boxes remain usable", () => {
  const play = { stack: ["a"], index: 0, startedOver: false };
  expect(nextCard({ ...detail, cards: [] }, play, ["a"]).play.index).toBe(-1);
  expect(nextCard({ ...detail, cards: detail.cards.slice(0, 1) }, play, ["a"]).play.stack).toEqual(["a", "a"]);
});

afterEach(() => vi.unstubAllGlobals());
it.each(["vi", "en"])("AC11 AC12 AC13: five kinds are readable without response controls in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const text = { vi: "Mẫu", en: "Sample" };
  const cards: CardBoxDetail["cards"] = [
    { id: "q", kind: "question", text }, { id: "d", kind: "dare", text }, { id: "p", kind: "point", text },
    { id: "r", kind: "rather", options: [text, { vi: "Khác", en: "Other" }] }, { id: "s", kind: "scale", text, low: { vi: "Ít", en: "Low" }, high: { vi: "Nhiều", en: "High" } },
  ];
  const html = renderToString(h(I18nProvider, null, cards.map(card => h(CardBoxCard, { key: card.id, card }))));
  expect(html).not.toMatch(/<button|<input|<select|role="radio|role="slider/);
  for (const label of locale === "vi" ? ["Câu hỏi", "Thử", "Ai hơn?", "Chọn một", "Từ 1 đến 10", "1: Ít 10: Nhiều"] : ["Question", "Try it", "Who’s more?", "Pick one", "1 to 10", "1: Low 10: High"]) expect(html).toContain(label);
});
it.each(["vi", "en"] as const)("product grid shows background covers, descriptions and price badges in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const free = { ...detail.box, description: { vi: "Câu nhẹ nhàng", en: "Light cards" } };
  const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(CardBoxRows, { boxes: [free, { ...free, id: "paid", open: false, price: 49000 }, { ...free, id: "unpriced", open: false, price: null }], from: "/boxes" })) }));
  expect(html).toContain('grid-cols-2');
  expect(html).toContain('border border-border bg-card text-card-foreground');
  expect(html.match(/data-slot="badge"/g)).toHaveLength(2);
  expect(html).toContain('relative h-1/2 shrink-0');
  expect(html).toContain('absolute top-2 left-2 bg-card text-card-foreground tabular-nums');
  expect(html).toContain('line-clamp-2 font-heading text-base');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('width="800" height="1024"');
  expect(html).toContain('alt=""');
  expect(html).toContain(free.description[locale]);
  expect(html).toContain(locale === "vi" ? "Miễn phí" : "Free");
  expect(html).toContain(locale === "vi" ? "49.000đ" : "49,000₫");
  expect(html).not.toContain(locale === "vi" ? "Xem thử" : "Preview");
  expect(html).not.toMatch(/<input|Liên hệ|Mã mở/);
});

it.each(["vi", "en"] as const)("AC47: an unlocked paid box tile shows no price in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const owned = { ...detail.box, id: "owned", open: true, price: 49000 };
  const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(CardBoxRows, { boxes: [owned], from: "/boxes" })) }));
  expect(html).not.toContain(locale === "vi" ? "49.000đ" : "49,000₫");
  expect(html).not.toContain('data-slot="badge"');
});
it("AC25: client and shared sources have no runtime imports from Worker", () => {
  const visit = (dir: string): void => { for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) visit(path);
    else if (/\.[cm]?[jt]sx?$/.test(path)) expect(readFileSync(path, "utf8"), path).not.toMatch(/(?:from\s*|import\s*\(|require\s*\()\s*["'][^"']*worker\//);
  } };
  visit("src/client"); visit("src/shared");
});

it("AC9 AC14: reopening a completed box avoids the last card from its previous opening", () => {
  const next = nextCard(detail, { stack: [], index: -1, startedOver: false }, ["b", "c", "d", "a"], () => 0);
  expect(next.play.stack).toEqual(["b"]); expect(next.play.startedOver).toBe(true);
});

it("AC7 AC8 AC15: thirty draws have no limit and seen history survives reopening only on this phone", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  let play: Play = { stack: [], index: -1, startedOver: false };
  let seen: string[] = [];
  for (let i = 0; i < 30; i++) ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.stack).toHaveLength(30);
  writeSeen("couple:linh", "sample", ["a"]);
  expect(nextCard(detail, { stack: [], index: -1, startedOver: false }, readSeen("couple:linh", "sample"), () => 0).play.stack).toEqual(["b"]);
  expect(readSeen("couple:son", "sample")).toEqual([]);
  expect(nextCard(detail, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
});

it("AC5 AC6 AC16: Home block and box list share ordered preview-only rows and the four tabs", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.boxes = [{ ...detail.box, name: { vi: "Làm quen lại", en: "Free" } }, { ...detail.box, id: "paid", name: { vi: "Deep Connection", en: "Deep Connection" }, open: false }];
  const onSignedOut = () => {};
  const user = { id: "u", displayName: "U", email: "u@example.com", locale: "vi" as const, createdAt: 1, birthDate: null, avatarId: null };
  for (const screen of [h(CardBoxBlock, { onSignedOut, scope: "c:u" }), h(CardBoxes, { user, onUser() {}, onSignedOut, couple: { id: "c", members: [], events: [], startDate: null } })]) {
    const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, screen)) }));
    expect(html.indexOf("Làm quen lại")).toBeLessThan(html.indexOf("Deep Connection"));
    expect(html).not.toContain("Xem thử");
    expect(html).toContain("Deep talk");
    expect(html).toContain("relative h-1/2 shrink-0");
    expect(html).toContain("h-full w-full object-cover");
    expect(html).not.toMatch(/<input|Liên hệ|Mã mở/);
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/[0-9]\/[0-9]/);
  }
  expect(TABS).toEqual(["home", "journal", "wishes", "garden"]);
});

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  return values;
}
it("AC26: cached list and box survive reopening, keep both languages and play a complete offline cycle", () => {
  storage();
  writeCache("c:u", "list", [detail.box]);
  writeCache("c:u", "box:sample", detail);
  expect(readCache("c:u", "list")).toEqual([detail.box]);
  const cached = readCache("c:u", "box:sample")!;
  expect(cached).toEqual(detail);
  expect(readCache("other:u", "box:sample")).toBeNull();
  let play: Play = { stack: [], index: -1, startedOver: false }; let seen: string[] = [];
  for (let i = 0; i < 5; i++) ({ play, seen } = nextCard(cached, play, seen, () => 0));
  expect(play.startedOver).toBe(true); expect(play.stack).toHaveLength(5);
  expect(previousCard(play).index).toBe(3);
});

it("AC26: server detail replaces a longer cached box and storage failures do not stop play", () => {
  const values = storage();
  writeCache("c:u", "box:sample", detail);
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 1) };
  writeCache("c:u", "box:sample", preview);
  expect(readCache("c:u", "box:sample")?.cards.map(card => card.id)).toEqual(["a"]);
  values.set("bisou.cardBox.v1:c:u:box:sample", "broken JSON");
  expect(readCache("c:u", "box:sample")).toBeNull();
  vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } });
  expect(readCache("c:u", "list")).toBeNull();
  expect(() => writeCache("c:u", "box:sample", detail)).not.toThrow();
  expect(nextCard(detail, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
});
it("R61: logout clears every account and version of box cache and seen history only", () => {
  const values = storage();
  writeCache("c:u", "list", [detail.box]); writeCache("c:v", "box:sample", detail); writeSeen("c:u", "sample", ["a"]);
  values.set("bisou.cardBox.v0:old", "old"); values.set("bisou.locale", "en");
  clearCardBoxCache();
  expect([...values]).toEqual([["bisou.locale", "en"]]);
  expect(readSeen("c:u", "sample")).toEqual([]);
});

it("AC27: an uncached offline player asks for a connection without displaying a card", () => {
  storage(); vi.stubGlobal("navigator", { onLine: false });
  const user = { id: "u", displayName: "U", email: "u@example.com", locale: "vi" as const, createdAt: 1, birthDate: null, avatarId: null };
  const html = renderToString(h(Router, { ssrPath: "/boxes/sample", children: h(I18nProvider, null, h(CardBoxPlayer, { user, couple: { id: "c", members: [], startDate: null, events: [] }, boxId: "sample", onUser() {}, onSignedOut() {} })) }));
  expect(html).toContain("Connect to open this box for the first time");
  expect(html).not.toContain("Next card");
});
it("AC26: failed fetch leaves the cached detail playable and cached list visible", async () => {
  storage(); writeCache("c:u", "box:sample", detail); writeCache("c:u", "list", [detail.box]);
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
  expect((await api.box("sample")).ok).toBe(false);
  const cached = readCache("c:u", "box:sample")!;
  expect(nextCard(cached, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
  const html = renderToString(h(Router, { ssrPath: "/", children: h(I18nProvider, null, h(CardBoxBlock, { scope: "c:u", onSignedOut() {} })) }));
  expect(html).toContain("Box"); expect(html).not.toContain("Opening box");
});

it.each(["vi", "en"])("list states use house loading, empty and error patterns in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  vi.stubGlobal("navigator", { onLine: true });
  const render = (boxes: CardBoxDetail["box"][] | null, failed: boolean) => renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(CardBoxList, { boxes, failed, refresh: async () => {}, from: "/boxes" })) }));
  const loading = render(null, false);
  expect(loading).toContain('data-slot="skeleton"');
  expect(loading).toContain('aria-label=');
  const empty = render([], false);
  expect(empty).toContain('role="status"');
  expect(empty).toContain("border-dashed");
  const error = render(null, true);
  expect(error).toContain(locale === "vi" ? "Chưa tải được các hộp. Thử lại nhé." : "Couldn&#x27;t load the boxes. Try again.");
  expect(error).toContain('role="alert"');
  expect(error).toContain('data-variant="outline"');
  const cached = render([detail.box], true);
  expect(cached).toContain(detail.box.name[locale as "vi" | "en"]);
  expect(cached).not.toContain('role="alert"');
  expect(cached).not.toContain("<button");
  vi.stubGlobal("navigator", { onLine: false });
  const offline = render(null, true);
  expect(offline).toContain(locale === "vi" ? "Kết nối mạng để mở hộp này lần đầu" : "Connect to open");
  expect(offline).not.toContain(locale === "vi" ? "Chưa tải" : "Couldn");
});

it("box prices keep VND and locale grouping", () => {
  expect(formatBoxPrice(49000, "vi")).toBe("49.000đ");
  expect(formatBoxPrice(49000, "en")).toBe("49,000₫");
  expect(formatBoxPrice(0, "vi")).toBe("0đ");
});
it("card swipe follows the photo threshold and ignores vertical movement", () => {
  expect(cardSwipe(-60, 10, 400)).toBe("next");
  expect(cardSwipe(60, 10, 400)).toBe("previous");
  expect(cardSwipe(-59, 0, 400)).toBeNull();
  expect(cardSwipe(100, 120, 400)).toBeNull();
  expect(cardSwipe(90, -90, 400)).toBeNull();
});

it("PO18: random draw discards forward replay, uses unseen cards and preserves the return card", () => {
  let seed = 17;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const play: Play = { stack: ["a", "b", "c"], index: 0, startedOver: false };
  const drawn = randomCard(detail, play, ["a", "b", "c"], rng);
  expect(drawn.play.stack).toEqual(["a", "d"]);
  expect(drawn.seen).toEqual(["a", "b", "c", "d"]);
  expect(drawn.play.stack[previousCard(drawn.play).index]).toBe("a");
  const reset = randomCard(detail, play, ["a", "b", "c", "d"], rng);
  expect(reset.play.stack.at(-1)).not.toBe("a");
  expect(reset.play.startedOver).toBe(true);
  expect(play.stack).toEqual(["a", "b", "c"]);
});

it.each(["vi", "en"])("PO18: player deck provides previous, labelled random and primary next controls in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToString(h(I18nProvider, null, h(CardBoxDeck, {
    card: detail.cards[0]!, boxId: "sample", boxName: "Box", onNext() {}, onPrevious() {}, onRandom() {},
  })));
  expect(html).toContain(locale === "vi" ? "Thẻ trước" : "Previous card");
  expect(html).toContain(locale === "vi" ? "Thẻ tiếp" : "Next card");
  expect(html).toContain(`aria-label="${locale === "vi" ? "Rút ngẫu nhiên" : "Random card"}"`);
  expect(html).toContain('data-size="icon"');
  expect(html).toContain('size-11');
  expect(html).toContain('data-variant="default"');
  expect(html).toContain('disabled=""');
});

it.each(["vi", "en"] as const)("AC35 AC36: truth and dare are labelled static blocks in the deck in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const card: CardBoxDetail["cards"][number] = { id: "tod-04", kind: "truthDare", truth: { vi: "Mỗi người có món gì hay lén ăn một mình mà chưa từng mời người kia không?", en: "Is there a snack each of you sneaks alone and has never offered the other?" }, dare: { vi: "Mỗi người diễn không lời món ăn mình thích nhất, người kia đoán.", en: "Each act out your favourite food without a word while the other guesses." } };
  const html = renderToString(h(I18nProvider, null, h(CardBoxCard, { card, boxId: "truth-or-dare" })));
  for (const label of locale === "vi" ? ["Thật hay thử thách", ">Thật<", ">Thử thách<"] : ["Truth or dare", ">Truth<", ">Dare<"]) expect(html).toContain(label);
  expect(html).toContain(card.truth[locale]); expect(html).toContain(card.dare[locale]);
  expect(html.match(/rounded-xl border border-current\/20/g)).toHaveLength(2);
  expect(html).not.toMatch(/<button|<input|<select|aria-pressed|aria-selected|role="radio/);
  const deck = renderToString(h(I18nProvider, null, h(CardBoxDeck, { card, boxId: "truth-or-dare", boxName: "Truth or Dare", onNext() {}, onPrevious() {}, onRandom() {} })));
  expect(deck).toContain(card.truth[locale]); expect(deck).toContain(card.dare[locale]);
  expect(deck).toContain(locale === "vi" ? "Thẻ tiếp" : "Next card");
  expect(deck.match(/<button/g)).toHaveLength(3);
  const box = { ...detail, box: { ...detail.box, id: "truth-or-dare", open: false }, cards: [card, { ...card, id: "tod-09" }] };
  const first = nextCard(box, { stack: [], index: -1, startedOver: false }, [], () => 0);
  expect(first.play.stack).toEqual(["tod-04"]);
  expect(nextCard(box, first.play, first.seen, () => 0).play.stack).toEqual(["tod-04", "tod-09"]);
  expect(randomCard(box, first.play, first.seen, () => 0).play.stack).toEqual(["tod-04", "tod-09"]);
  expect(cardSwipe(80, 0, 400)).toBe("previous"); expect(cardSwipe(-80, 0, 400)).toBe("next");
});

it.each(["vi", "en"] as const)("AC37 AC38 AC40: adult badges appear on Home, boxes and every Spicy card only in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const adultBox = { ...detail.box, id: "rau-ram", adult: true as const, name: { vi: "Rau răm", en: "Spicy" } };
  const memory = createTabMemory(); memory.boxes = [detail.box, adultBox];
  const user = { id: "u", displayName: "U", email: "u@example.com", locale, createdAt: 1, birthDate: null, avatarId: null };
  for (const screen of [h(CardBoxBlock, { onSignedOut() {}, scope: "c:u" }), h(CardBoxes, { user, onUser() {}, onSignedOut() {}, couple: { id: "c", members: [], events: [], startDate: null } })]) {
    const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, screen)) }));
    expect(html.match(/18\+/g)).toHaveLength(1);
    expect(html).toContain(adultBox.name[locale]);
    expect(html).toContain(locale === "vi" ? "Miễn phí" : "Free");
  }
  const card: CardBoxDetail["cards"][number] = { id: "rr-04", kind: "truthDare", truth: { vi: "Câu thật", en: "A truth" }, dare: { vi: "Thử thách nhỏ", en: "A dare" } };
  const renderCard = (adult?: true) => renderToString(h(I18nProvider, null, h(CardBoxCard, { card, boxId: adult ? "rau-ram" : "truth-or-dare", adult })));
  const html = renderCard(true);
  expect(html).toContain('data-slot="badge"'); expect(html).toContain("18+");
  for (const label of locale === "vi" ? ["Thật hay thử thách", ">Thật<", ">Thử thách<"] : ["Truth or dare", ">Truth<", ">Dare<"]) expect(html).toContain(label);
  expect(html).not.toMatch(/<button|<input|<select|aria-pressed|aria-selected/);
  expect(renderCard()).not.toContain("18+");
  const deck = renderToString(h(I18nProvider, null, h(CardBoxDeck, { card, previous: { ...card, id: "rr-09" }, boxId: "rau-ram", boxName: adultBox.name[locale], adult: true, onNext() {}, onPrevious() {}, onRandom() {} })));
  expect(deck).toContain("18+"); expect(deck).toContain(locale === "vi" ? "Thẻ tiếp" : "Next card");
  expect(deck.match(/<button/g)).toHaveLength(3);
  const box = { box: adultBox, cards: [{ ...card, id: "rr-09" }, card] };
  const first = nextCard(box, { stack: [], index: -1, startedOver: false }, [], () => 0);
  expect(nextCard(box, first.play, first.seen, () => 0).play.stack).toEqual(["rr-09", "rr-04"]);
});

it("AC41 AC43 AC46: the last preview card leads to the buy view, keeps seen cards, and unlocking draws an unseen card", () => {
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  const play = { stack: ["a", "b", "c"], index: 2, startedOver: false };
  const end = nextCard(preview, play, ["a", "b", "c"], () => 0);
  expect(end.play).toEqual({ ...play, startedOver: true });
  expect(end.seen).toEqual(["a", "b", "c"]);
  expect(nextCard(detail, end.play, end.seen, () => 0).play.stack).toEqual(["a", "b", "c", "d"]);
  const reopened = nextCard(preview, { stack: [], index: -1, startedOver: false }, end.seen);
  expect(reopened.play.startedOver).toBe(true); expect(reopened.seen).toEqual(end.seen);
});

it.each(["vi", "en"] as const)("AC41 AC42 AC45: buy view and gift dialog show the approved copy, offline and error states in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const box = { ...detail.box, price: 49000, open: false };
  const render = (dialogOpen: boolean, online = true, failed = false) => renderToString(h(I18nProvider, null, h(CardBoxGift, { box, dialogOpen, online, failed, pending: false, onDialogChange() {}, onConfirm() {}, onPrevious() {} })));
  const buy = render(false);
  expect(buy).toContain(box.cover); expect(buy).toContain(box.name[locale]);
  expect(buy).toContain(locale === "vi" ? "49.000đ" : "49,000₫");
  expect(buy).toContain(locale === "vi" ? "Mua hộp" : "Buy box");
  expect(buy).not.toContain('role="dialog"');
  const dialog = render(true);
  expect(dialog).toContain(locale === "vi" ? "Bạn tính mua thật à? Đùa thôi, cái này tôi tặng bạn." : "You were really going to pay? Just kidding, this one&#x27;s on us.");
  expect(dialog).toContain(locale === "vi" ? "Nhận hộp" : "Get the box");
  expect(dialog).toContain('role="dialog"');
  expect(render(false, false)).toContain('disabled=""');
  expect(render(false, false)).toContain(locale === "vi" ? "Kết nối mạng để mở hộp này lần đầu" : "Connect to open this box for the first time");
  expect(render(true, true, true)).toContain(locale === "vi" ? "Chưa nhận được hộp. Thử lại nhé." : "Couldn&#x27;t get the box. Try again.");
});
