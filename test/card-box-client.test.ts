import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { I18nProvider } from "../src/client/i18n";
import { CardBoxBlock } from "../src/client/components/bisou/CardBoxBlock";
import { Router } from "wouter";
import { vi, afterEach } from "vitest";
import { expect, it } from "vitest";
import {
  formatBoxPrice,
  seenCardCount,
  cardSwipe,
  cardBoxEndMessage,
  cardBoxLoadMessage,
  nextCard,
  randomCard,
  previousCard,
  readSeen,
  writeSeen,
  readCache,
  writeCache,
  clearCardBoxCache,
  type Play,
} from "../src/client/lib/cardBox";
import type { CardBoxDetail } from "../src/shared/cardBox";
import { CardBoxPlayer } from "../src/client/screens/CardBoxPlayer";
import { api } from "../src/client/api";
import { CardBoxes } from "../src/client/screens/CardBoxes";
import { testQueryClient } from "./query-fixture";
vi.mock("../src/client/components/ui/dialog", async (original) => ({
  ...(await original<typeof import("../src/client/components/ui/dialog")>()),
  DialogContent: ({ children }: { children: import("react").ReactNode }) => h("div", { role: "dialog" }, children),
}));
const detail: CardBoxDetail = {
  box: {
    id: "sample",
    name: { vi: "Hộp", en: "Box" },
    description: { vi: "", en: "" },
    open: true,
    cardCount: 4,
    cover: "/card-boxes/sample.jpg",
    price: null,
  },
  cards: ["a", "b", "c", "d"].map((id) => ({ id, kind: "question", text: { vi: id, en: id } })),
};
it("card-box AC26 AC27: load failures stay hidden with cached content and uncached offline content needs a connection", () => {
  expect(cardBoxLoadMessage(true, false, "loadError")).toBeNull();
  expect(cardBoxLoadMessage(true, true, "loadError")).toBeNull();
  expect(cardBoxLoadMessage(false, false, "loadError")).toBe("needsConnection");
  expect(cardBoxLoadMessage(false, false, null)).toBe("needsConnection");
  expect(cardBoxLoadMessage(false, true, "loadError")).toBe("loadError");
  expect(cardBoxLoadMessage(false, true, "notFound")).toBe("notFound");
  expect(cardBoxLoadMessage(false, true, null)).toBeNull();
});
it("card-box AC9, card-box-unlock AC14: a completed open box starts over and a completed preview explains the rest opens later", () => {
  expect(cardBoxEndMessage(true)).toBe("cardBox.startOver");
  expect(cardBoxEndMessage(false)).toBe("cardBox.previewEnd");
});
it("card-box AC7 AC8 AC10: unseen draws and complete stack replay before drawing again", () => {
  let play: Play = { stack: [], index: -1, startedOver: false };
  let seen: string[] = [];
  for (let i = 0; i < 3; i++) ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.stack).toEqual(["a", "b", "c"]);
  play = previousCard(previousCard(previousCard(play)));
  expect(play.index).toBe(0);
  ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.index).toBe(1);
  expect(seen).toEqual(["a", "b", "c"]);
  ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.index).toBe(2);
  play = nextCard(detail, play, seen, () => 0).play;
  expect(play.stack).toEqual(["a", "b", "c", "d"]);
});

it("card-box AC9, card-box-unlock AC14 AC15 AC17: preview uses only supplied cards, persists seen and ends without resetting", () => {
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  let play: Play = { stack: [], index: -1, startedOver: false };
  let seen = ["a", "obsolete"];
  ({ play, seen } = nextCard(preview, play, seen, () => 0));
  expect(play.stack).toEqual(["b"]);
  expect(seen).toEqual(["a", "b"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0));
  expect(play.stack).toEqual(["b", "c"]);
  ({ play, seen } = nextCard(preview, play, seen, () => 0));
  expect(play.startedOver).toBe(true);
  expect(play.stack.at(-1)).toBe("c");
  expect(seen).toEqual(["a", "b", "c"]);
  play = previousCard(play);
  expect(play.startedOver).toBe(false);
  play = nextCard(preview, play, seen, () => 0).play;
  expect(play.startedOver).toBe(false);
  const full = nextCard(detail, { stack: [], index: -1, startedOver: false }, ["a", "b", "c"], () => 0);
  expect(full.play.stack).toEqual(["d"]);
});
it("empty and single-card boxes remain usable", () => {
  const play = { stack: ["a"], index: 0, startedOver: false };
  expect(nextCard({ ...detail, cards: [] }, play, ["a"]).play.index).toBe(-1);
  expect(nextCard({ ...detail, cards: detail.cards.slice(0, 1) }, play, ["a"]).play.stack).toEqual(["a", "a"]);
});

afterEach(() => vi.unstubAllGlobals());

it("card-box-unlock AC25: client and shared sources have no runtime imports from Worker", () => {
  const visit = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (item.isDirectory()) visit(path);
      else if (/\.[cm]?[jt]sx?$/.test(path))
        expect(readFileSync(path, "utf8"), path).not.toMatch(
          /(?:from\s*|import\s*\(|require\s*\()\s*["'][^"']*worker\//,
        );
    }
  };
  visit("src/client");
  visit("src/shared");
});

it("card-box AC9, card-box-unlock AC14: reopening a completed box avoids the last card from its previous opening", () => {
  const next = nextCard(detail, { stack: [], index: -1, startedOver: false }, ["b", "c", "d", "a"], () => 0);
  expect(next.play.stack).toEqual(["b"]);
  expect(next.play.startedOver).toBe(true);
});

it("card-box AC7 AC8, card-box-unlock AC15: thirty draws have no limit and seen history survives reopening only on this phone", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  let play: Play = { stack: [], index: -1, startedOver: false };
  let seen: string[] = [];
  for (let i = 0; i < 30; i++) ({ play, seen } = nextCard(detail, play, seen, () => 0));
  expect(play.stack).toHaveLength(30);
  writeSeen("couple:linh", "sample", ["a"]);
  expect(
    nextCard(detail, { stack: [], index: -1, startedOver: false }, readSeen("couple:linh", "sample"), () => 0).play
      .stack,
  ).toEqual(["b"]);
  expect(readSeen("couple:son", "sample")).toEqual([]);
  expect(nextCard(detail, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
});

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  return values;
}
it("card-box AC26: cached list and box survive reopening, keep both languages and play a complete offline cycle", () => {
  storage();
  writeCache("c:u", "list", [detail.box]);
  writeCache("c:u", "box:sample", detail);
  expect(readCache("c:u", "list")).toEqual([detail.box]);
  const cached = readCache("c:u", "box:sample")!;
  expect(cached).toEqual(detail);
  expect(readCache("other:u", "box:sample")).toBeNull();
  let play: Play = { stack: [], index: -1, startedOver: false };
  let seen: string[] = [];
  for (let i = 0; i < 5; i++) ({ play, seen } = nextCard(cached, play, seen, () => 0));
  expect(play.startedOver).toBe(true);
  expect(play.stack).toHaveLength(5);
  expect(previousCard(play).index).toBe(3);
});

it("card-box AC26: server detail replaces a longer cached box and storage failures do not stop play", () => {
  const values = storage();
  writeCache("c:u", "box:sample", detail);
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 1) };
  writeCache("c:u", "box:sample", preview);
  expect(readCache("c:u", "box:sample")?.cards.map((card) => card.id)).toEqual(["a"]);
  values.set("bisou.cardBox.v1:c:u:box:sample", "broken JSON");
  expect(readCache("c:u", "box:sample")).toBeNull();
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
  });
  expect(readCache("c:u", "list")).toBeNull();
  expect(() => writeCache("c:u", "box:sample", detail)).not.toThrow();
  expect(nextCard(detail, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
});
it("card-box R61: logout clears every account and version of box cache and seen history only", () => {
  const values = storage();
  writeCache("c:u", "list", [detail.box]);
  writeCache("c:v", "box:sample", detail);
  writeSeen("c:u", "sample", ["a"]);
  values.set("bisou.cardBox.v0:old", "old");
  values.set("bisou.locale", "en");
  clearCardBoxCache();
  expect([...values]).toEqual([["bisou.locale", "en"]]);
  expect(readSeen("c:u", "sample")).toEqual([]);
});

it("card-box AC26: failed fetch leaves the cached detail playable and cached list visible", async () => {
  storage();
  writeCache("c:u", "box:sample", detail);
  writeCache("c:u", "list", [detail.box]);
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
  expect((await api.box("sample")).ok).toBe(false);
  const cached = readCache("c:u", "box:sample")!;
  expect(nextCard(cached, { stack: [], index: -1, startedOver: false }, [], () => 0).play.stack).toEqual(["a"]);
  const html = renderToString(
    h(Router, { ssrPath: "/", children: h(I18nProvider, null, h(CardBoxBlock, { scope: "c:u", onSignedOut() {} })) }),
  );
  expect(html).toContain("Box");
  expect(html).not.toContain("Opening box");
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
  const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
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

it("card-box AC35 AC36: truth and dare cards draw like any other card", () => {
  const card: CardBoxDetail["cards"][number] = {
    id: "tod-04",
    kind: "truthDare",
    truth: { vi: "Thật", en: "Truth" },
    dare: { vi: "Thử", en: "Dare" },
  };
  const box = {
    ...detail,
    box: { ...detail.box, id: "truth-or-dare", open: false },
    cards: [card, { ...card, id: "tod-09" }],
  };
  const first = nextCard(box, { stack: [], index: -1, startedOver: false }, [], () => 0);
  expect(first.play.stack).toEqual(["tod-04"]);
  expect(nextCard(box, first.play, first.seen, () => 0).play.stack).toEqual(["tod-04", "tod-09"]);
  expect(randomCard(box, first.play, first.seen, () => 0).play.stack).toEqual(["tod-04", "tod-09"]);
});

it("card-box-unlock AC41 AC43 AC46: the last preview card leads to the buy view, keeps seen cards, and unlocking draws an unseen card", () => {
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  const play = { stack: ["a", "b", "c"], index: 2, startedOver: false };
  const end = nextCard(preview, play, ["a", "b", "c"], () => 0);
  expect(end.play).toEqual({ ...play, startedOver: true });
  expect(end.seen).toEqual(["a", "b", "c"]);
  expect(nextCard(detail, end.play, end.seen, () => 0).play.stack).toEqual(["a", "b", "c", "d"]);
  const reopened = nextCard(preview, { stack: [], index: -1, startedOver: false }, end.seen);
  expect(reopened.play.startedOver).toBe(true);
  expect(reopened.seen).toEqual(end.seen);
});

it("card-box R12: distinct playable seen counts follow next, previous, random, start over and preview", () => {
  let state = { play: { stack: [], index: -1, startedOver: false } as Play, seen: [] as string[] };
  expect(seenCardCount(detail, state.seen)).toBe(0);
  state = nextCard(detail, state.play, state.seen, () => 0);
  expect(seenCardCount(detail, state.seen)).toBe(1);
  state = nextCard(detail, state.play, state.seen, () => 0);
  expect(seenCardCount(detail, state.seen)).toBe(2);
  state.play = previousCard(state.play);
  expect(seenCardCount(detail, state.seen)).toBe(2);
  state = nextCard(detail, state.play, state.seen, () => 0);
  expect(seenCardCount(detail, state.seen)).toBe(2);
  state = randomCard(detail, state.play, state.seen, () => 0);
  expect(seenCardCount(detail, state.seen)).toBe(3);
  state = nextCard(detail, state.play, state.seen, () => 0);
  expect(seenCardCount(detail, state.seen)).toBe(4);
  state = nextCard(detail, state.play, state.seen, () => 0);
  expect(state.play.startedOver).toBe(true);
  expect(seenCardCount(detail, state.seen)).toBe(1);
  const preview = { ...detail, box: { ...detail.box, open: false }, cards: detail.cards.slice(0, 3) };
  expect(seenCardCount(preview, ["a", "a", "b", "c", "d", "obsolete"])).toBe(3);
  const end = nextCard(preview, state.play, ["a", "b", "c"], () => 0);
  expect(end.play.startedOver).toBe(true);
  expect(seenCardCount(preview, end.seen)).toBe(3);
});

it.each(["list", "player"])(
  "card-box AC26: local %s stays visible after its first server fetch fails",
  async (screen) => {
    const values = storage();
    values.set("bisou.locale", "en");
    vi.stubGlobal("navigator", { onLine: false });
    writeCache("c:u", "list", [detail.box]);
    writeCache("c:u", "box:sample", detail);
    const queryKey = screen === "list" ? ["boxes"] : ["boxes", "sample"];
    await expect(
      testQueryClient.query({ queryKey, queryFn: () => Promise.reject(new Error("offline")) }),
    ).rejects.toThrow("offline");
    expect(testQueryClient.getQueryState(queryKey)?.status).toBe("error");
    expect(testQueryClient.getQueryData(queryKey)).toBeUndefined();
    const user = {
      id: "u",
      displayName: "U",
      email: "u@example.com",
      locale: "en" as const,
      createdAt: 1,
      birthDate: null,
      avatarId: null,
    };
    const props = {
      user,
      couple: { id: "c", members: [], startDate: null, events: [] },
      onUser() {},
      onSignedOut() {},
    };
    const content = screen === "list" ? h(CardBoxes, props) : h(CardBoxPlayer, { ...props, boxId: "sample" });
    const html = renderToString(h(Router, { ssrPath: "/boxes", children: h(I18nProvider, null, content) }));
    expect(html).toContain(screen === "list" ? "Box" : "Seen 0/4");
    expect(html).not.toContain("Connect to open this box for the first time");
  },
);
