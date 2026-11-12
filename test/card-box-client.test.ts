import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { I18nProvider } from "../src/client/i18n";
import { CardBoxCard } from "../src/client/components/bisou/CardBoxCard";
import { CardBoxRows, CardBoxBlock } from "../src/client/components/bisou/CardBoxBlock";
import { Router } from "wouter";
import { vi, afterEach } from "vitest";
import { expect, it } from "vitest";
import { nextCard, previousCard, readSeen, writeSeen, type Play } from "../src/client/lib/cardBox";
import type { CardBoxDetail } from "../src/shared/cardBox";
import { CardBoxes } from "../src/client/screens/CardBoxes";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { TABS } from "../src/client/components/bisou/AppShell";
const detail: CardBoxDetail = { box: { id: "sample", name: { vi: "Hộp", en: "Box" }, description: { vi: "", en: "" }, open: true }, cards: ["a", "b", "c", "d"].map(id => ({ id, kind: "question", text: { vi: id, en: id } })) };
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
  for (const screen of [h(CardBoxBlock, { onSignedOut }), h(CardBoxes, { user, onUser() {}, onSignedOut })]) {
    const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, screen)) }));
    expect(html.indexOf("Làm quen lại")).toBeLessThan(html.indexOf("Deep Connection"));
    expect(html).toContain("Xem thử");
    expect(html).not.toMatch(/<input|Liên hệ|Mã mở|49.000|[0-9]\/[0-9]/);
  }
  expect(TABS).toEqual(["home", "journal", "wishes", "garden"]);
});
