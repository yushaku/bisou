import { env } from "cloudflare:test";
import { CARD_BOXES } from "../src/worker/lib/cardBoxes";
import { beforeEach, expect, it } from "vitest";
import { call, paired, resetDb, user } from "./helpers";
import type { CardBoxDetail } from "../src/shared/cardBox";
beforeEach(resetDb);
it("AC25: paid detail sends exactly flagged preview cards to both partners", async () => {
  const { a, b } = await paired();
  for (const person of [a, b]) {
    const res = await call("GET", "/api/boxes/deep-connection", { cookie: person.cookie });
    expect(res.status).toBe(200);
    const detail = await res.json<CardBoxDetail>();
    expect(detail.cards.map(c => c.id)).toEqual(["dc-02", "dc-05", "dc-07"]);
    expect(JSON.stringify(detail)).not.toContain("truly understood");
  }
});

it("AC1: anonymous and unpaired people cannot read boxes", async () => {
  expect((await call("GET", "/api/boxes")).status).toBe(401);
  const person = await user("Solo");
  for (const path of ["/api/boxes", "/api/boxes/lam-quen-lai", "/api/boxes/deep-connection"]) expect((await call("GET", path, { cookie: person.cookie })).status).toBe(404);
});
it("AC1 AC3 AC6: shared catalogue is ordered and free detail contains bilingual launch cards", async () => {
  const { a, b } = await paired();
  const list = await (await call("GET", "/api/boxes", { cookie: a.cookie })).json();
  expect(list).toEqual(await (await call("GET", "/api/boxes", { cookie: b.cookie })).json());
  expect(list).toMatchObject({ boxes: [{ id: "lam-quen-lai", open: true }, { id: "deep-connection", open: false }] });
  const detail = await (await call("GET", "/api/boxes/lam-quen-lai", { cookie: a.cookie })).json<CardBoxDetail>();
  expect(detail.cards).toHaveLength(10);
  expect(detail.cards[0]).toMatchObject({ text: { vi: "Món ăn nào mỗi lần ăn là thấy nhớ nhà? Kể cho nhau nghe.", en: "Which food tastes like home to you? Tell each other about it." } });
  expect((await call("GET", "/api/boxes/missing", { cookie: a.cookie })).status).toBe(404);
});
it("AC4 AC30: browsing twenty times leaves garden and push unchanged and stores no play records", async () => {
  const { a } = await paired();
  const snapshot = async () => Promise.all(["garden_days", "garden_answers", "garden_growth", "garden_levels", "push_subscriptions"].map(table => env.DB.prepare(`SELECT * FROM ${table}`).all()));
  const before = await snapshot();
  for (let i = 0; i < 20; i++) expect((await call("GET", "/api/boxes/deep-connection", { cookie: a.cookie })).status).toBe(200);
  expect((await snapshot()).map(x => x.results)).toEqual(before.map(x => x.results));
  const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
  expect(tables.results.filter(row => /card_box|unlock|draw/.test(row.name))).toEqual([]);
  expect((await call("POST", "/api/boxes/deep-connection", { cookie: a.cookie, body: { answer: "hello" } })).status).toBe(404);
});
it("AC25 AC28: launch content has unique bilingual cards, safe wording and playable previews", () => {
  const ids = CARD_BOXES.flatMap(box => box.cards.map(card => card.id));
  expect(new Set(ids).size).toBe(20);
  for (const box of CARD_BOXES) {
    expect(box.cards).toHaveLength(10);
    if (!box.free) expect(box.cards.filter(card => card.preview).map(card => card.id)).toEqual(["dc-02", "dc-05", "dc-07"]);
    for (const card of box.cards) {
      const texts = card.kind === "rather" ? card.options : card.kind === "scale" ? [card.text, card.low, card.high] : [card.text];
      for (const text of texts) { expect(text.vi).not.toMatch(/\b(anh|em)\b/i); expect(text.vi.length).toBeGreaterThan(0); expect(text.en.length).toBeGreaterThan(0); }
    }
  }
});
