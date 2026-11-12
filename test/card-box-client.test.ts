import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { I18nProvider } from "../src/client/i18n";
import { CardBoxCard } from "../src/client/components/bisou/CardBoxCard";
import { CardBoxRows, CardBoxBlock, CardBoxList } from "../src/client/components/bisou/CardBoxBlock";
import { Router } from "wouter";
import { vi, afterEach } from "vitest";
import { expect, it } from "vitest";
import { cardBoxEndMessage, cardBoxLoadMessage, nextCard, previousCard, readSeen, writeSeen, readCache, writeCache, clearCardBoxCache, type Play } from "../src/client/lib/cardBox";
import type { CardBoxDetail } from "../src/shared/cardBox";
import { CardBoxPlayer } from "../src/client/screens/CardBoxPlayer";
import { api } from "../src/client/api";
import { CardBoxes } from "../src/client/screens/CardBoxes";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { TABS } from "../src/client/components/bisou/AppShell";
const detail: CardBoxDetail = { box: { id: "sample", name: { vi: "Hộp", en: "Box" }, description: { vi: "", en: "" }, open: true }, cards: ["a", "b", "c", "d"].map(id => ({ id, kind: "question", text: { vi: id, en: id } })) };
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

it("AC9 AC14 AC15 AC17: preview uses only supplied cards, persists seen and resets once without an immediate repeat", () => {
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  let play: Play = { stack: [], index: -1, startedOver: false }; let seen = ["a", "obsolete"];
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.stack).toEqual(["b"]); expect(seen).toEqual(["a", "b"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.stack).toEqual(["b", "c"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0)); expect(play.startedOver).toBe(true); expect(play.stack.at(-1)).toBe("a"); expect(seen).toEqual(["a"]);
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
it("AC6 AC16: rows show preview without counts, payment or unlock controls", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(CardBoxRows, { boxes: [detail.box, { ...detail.box, id: "paid", open: false }], from: "/boxes" })) }));
  expect(html).toContain("Xem thử"); expect(html).not.toMatch(/<input|49.000|Liên hệ|Mã mở|[0-9]\/[0-9]/);
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
    expect(html).toContain("Xem thử");
    expect(html).not.toMatch(/<input|Liên hệ|Mã mở|49.000|[0-9]\/[0-9]/);
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
