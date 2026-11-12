import { env } from "cloudflare:test";
import { CARD_BOXES } from "../src/worker/lib/cardBoxes";
import { beforeEach, expect, it } from "vitest";
import { call, explain, paired, resetDb, user } from "./helpers";
import type { CardBoxDetail } from "../src/shared/cardBox";
beforeEach(resetDb);
it("AC25: paid detail sends exactly flagged preview cards to both partners", async () => {
  const { a, b } = await paired();
  for (const person of [a, b]) {
    const res = await call("GET", "/api/boxes/deep-connection", { cookie: person.cookie });
    expect(res.status).toBe(200);
    const detail = await res.json<CardBoxDetail>();
    expect(detail.box).toMatchObject({ cover: "/card-boxes/deep-connection.jpg", price: 49000 });
    expect(detail.cards.map(c => c.id)).toEqual(["dc-02", "dc-05", "dc-07"]);
    expect(JSON.stringify(detail)).not.toContain("truly understood");
  }
});

it("AC1: anonymous and unpaired people cannot read boxes", async () => {
  expect((await call("GET", "/api/boxes")).status).toBe(401);
  const person = await user("Solo");
  for (const path of ["/api/boxes", "/api/boxes/lam-quen-lai", "/api/boxes/deep-connection", "/api/boxes/truth-or-dare", "/api/boxes/rau-ram"]) expect((await call("GET", path, { cookie: person.cookie })).status).toBe(404);
});
it("AC1 AC3 AC6: shared catalogue is ordered and free detail contains bilingual launch cards", async () => {
  const { a, b } = await paired();
  const list = await (await call("GET", "/api/boxes", { cookie: a.cookie })).json();
  expect(list).toEqual(await (await call("GET", "/api/boxes", { cookie: b.cookie })).json());
  expect(list).toMatchObject({ boxes: [{ id: "lam-quen-lai", open: true, cover: "/card-boxes/lam-quen-lai.jpg", price: null }, { id: "rau-ram", open: false, adult: true, cover: "/card-boxes/rau-ram.jpg", price: 49000 }, { id: "deep-connection", open: false, cover: "/card-boxes/deep-connection.jpg", price: 49000 }, { id: "truth-or-dare", open: false, cover: "/card-boxes/truth-or-dare.jpg", price: 49000 }] });
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
  expect(tables.results.filter(row => /draw/.test(row.name))).toEqual([]);
  expect((await env.DB.prepare("SELECT * FROM card_box_unlocks").all()).results).toEqual([]);
  expect((await call("POST", "/api/boxes/deep-connection", { cookie: a.cookie, body: { answer: "hello" } })).status).toBe(404);
});
it("AC25 AC28: launch content has unique bilingual cards, safe wording and playable previews", () => {
  const ids = CARD_BOXES.flatMap(box => box.cards.map(card => card.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const box of CARD_BOXES) {
    expect(box.cards).toHaveLength(box.id === "truth-or-dare" ? 20 : 10);
    if (box.id === "deep-connection") expect(box.cards.filter(card => card.preview).map(card => card.id)).toEqual(["dc-02", "dc-05", "dc-07"]);
    for (const card of box.cards) {
      const texts = card.kind === "truthDare" ? [card.truth, card.dare] : card.kind === "rather" ? card.options : card.kind === "scale" ? [card.text, card.low, card.high] : [card.text];
      for (const text of texts) { expect(text.vi).not.toMatch(/\b(anh|em)\b/i); expect(text.vi.length).toBeGreaterThan(0); expect(text.en.length).toBeGreaterThan(0); }
    }
  }
});

it("AC34: Truth or Dare has twenty bilingual paired cards and exactly three previews", () => {
  const box = CARD_BOXES.find(box => box.id === "truth-or-dare");
  expect(box).toMatchObject({ free: false, price: 49000, cover: "/card-boxes/truth-or-dare.jpg", name: { vi: "Thật hay thử thách", en: "Truth or Dare" }, description: { vi: "Câu hỏi thật lòng và thử thách nho nhỏ, để hai đứa cười cùng nhau.", en: "Honest questions and little dares, to laugh about together." } });
  expect(box?.cards).toHaveLength(20);
  expect(box?.cards.filter(card => card.preview).map(card => card.id)).toEqual(["tod-01", "tod-04", "tod-09"]);
  for (const card of box!.cards) {
    expect(card.kind).toBe("truthDare");
    if (card.kind !== "truthDare") throw new Error("Expected a truth and a dare");
    for (const locale of ["vi", "en"] as const) {
      expect(card.truth[locale].length).toBeGreaterThan(0);
      expect(card.dare[locale].length).toBeGreaterThan(0);
    }
  }
});

it("AC34 AC25: both partners receive only Truth or Dare previews with bilingual sides", async () => {
  const { a, b } = await paired();
  for (const person of [a, b]) {
    const res = await call("GET", "/api/boxes/truth-or-dare", { cookie: person.cookie });
    expect(res.status).toBe(200);
    const detail = await res.json<CardBoxDetail>();
    expect(detail.box).toMatchObject({ open: false, cover: "/card-boxes/truth-or-dare.jpg", price: 49000 });
    expect(detail.cards.map(card => card.id)).toEqual(["tod-01", "tod-04", "tod-09"]);
    for (const card of detail.cards) {
      expect(card.kind).toBe("truthDare");
      if (card.kind !== "truthDare") throw new Error("Expected a truth and a dare");
      for (const locale of ["vi", "en"] as const) {
        expect(card.truth[locale]).toBeTruthy(); expect(card.dare[locale]).toBeTruthy();
      }
    }
    expect(JSON.stringify(detail)).not.toContain("childhood nicknames");
    expect((await call("POST", "/api/boxes/truth-or-dare", { cookie: person.cookie, body: { choice: "truth" } })).status).toBe(404);
  }
});

it("AC37 AC39: Rau răm has ten unique bilingual truth/dare cards with the approved copy", () => {
  const box = CARD_BOXES.find(box => box.id === "rau-ram");
  expect(box).toMatchObject({ free: false, adult: true, price: 49000, cover: "/card-boxes/rau-ram.jpg", name: { vi: "Rau răm", en: "Spicy" }, description: { vi: "Cay cay một chút, chỉ dành cho hai đứa.", en: "A little spicy, just for the two of you." } });
  expect(box?.cards.filter(card => card.preview).map(card => card.id)).toEqual(["rr-04", "rr-07", "rr-08"]);
  expect(box?.cards.map(card => card.id)).toEqual(["rr-01", "rr-02", "rr-03", "rr-04", "rr-05", "rr-06", "rr-07", "rr-08", "rr-09", "rr-10"]);
  for (const card of box!.cards) {
    expect(card.kind).toBe("truthDare");
    if (card.kind !== "truthDare") throw new Error("Expected a truth and a dare");
    for (const text of [card.truth, card.dare]) {
      expect(text.vi).toBeTruthy(); expect(text.en).toBeTruthy();
      expect(text.vi).not.toMatch(/\b(anh|em|phải)\b|không được từ chối/i);
    }
  }
});

it("AC37 AC40: both partners receive only Rau răm previews until gift unlock and cannot record a choice", async () => {
  const { a, b } = await paired();
  for (const person of [a, b]) {
    const res = await call("GET", "/api/boxes/rau-ram", { cookie: person.cookie });
    expect(res.status).toBe(200);
    const detail = await res.json<CardBoxDetail>();
    expect(detail.box).toMatchObject({ id: "rau-ram", open: false, adult: true, cover: "/card-boxes/rau-ram.jpg", price: 49000 });
    expect(detail.cards.map(card => card.id)).toEqual(["rr-04", "rr-07", "rr-08"]);
    expect(JSON.stringify(detail)).not.toContain("When did each of you first find the other truly attractive?");
    expect((await call("POST", "/api/boxes/rau-ram", { cookie: person.cookie, body: { choice: "truth" } })).status).toBe(404);
  }
  const full = CARD_BOXES.find(box => box.id === "rau-ram")!.cards;
  const unlock = await call("POST", "/api/boxes/rau-ram/unlock", { cookie: a.cookie });
  expect(unlock.status).toBe(200);
  expect(await unlock.json()).toMatchObject({ box: { open: true, adult: true, price: 49000 }, cards: full });
  for (const person of [a, b]) {
    const detail = await (await call("GET", "/api/boxes/rau-ram", { cookie: person.cookie })).json<CardBoxDetail>();
    expect(detail.box).toMatchObject({ open: true, adult: true, price: 49000 });
    expect(detail.cards).toHaveLength(10);
    expect(detail.cards).toEqual(full);
  }
});

it("AC2 AC23 AC44: gift unlock returns every card, repeats harmlessly and opens the box for both partners only", async () => {
  const { a, b } = await paired();
  const outsider = await user("Other");
  await call("POST", "/api/couple", { cookie: outsider.cookie });
  const full = CARD_BOXES.find(box => box.id === "deep-connection")!;
  for (const person of [a, b]) {
    for (const path of ["/api/boxes", "/api/boxes/deep-connection"]) {
      const body = await (await call("GET", path, { cookie: person.cookie })).text();
      for (const card of full.cards.filter(card => !card.preview)) {
        const texts = card.kind === "truthDare" ? [card.truth, card.dare] : card.kind === "rather" ? card.options : card.kind === "scale" ? [card.text, card.low, card.high] : [card.text];
        for (const text of texts) for (const locale of ["vi", "en"] as const) expect(body).not.toContain(text[locale]);
      }
    }
  }
  for (let i = 0; i < 2; i++) {
    const res = await call("POST", "/api/boxes/deep-connection/unlock", { cookie: a.cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ box: { open: true }, cards: full.cards });
  }
  for (const person of [a, b]) {
    const detail = await (await call("GET", "/api/boxes/deep-connection", { cookie: person.cookie })).json<CardBoxDetail>();
    expect(detail.box.open).toBe(true); expect(detail.cards).toEqual(full.cards);
    const list = await (await call("GET", "/api/boxes", { cookie: person.cookie })).json<{ boxes: CardBoxDetail["box"][] }>();
    expect(list.boxes.find(box => box.id === full.id)?.open).toBe(true);
  }
  expect((await call("POST", "/api/boxes/deep-connection/unlock", { cookie: outsider.cookie })).status).toBe(404);
});
it("AC44: gift unlock rejects free, unknown, unpaired, anonymous and foreign-origin requests", async () => {
  const { a } = await paired(); const solo = await user("Solo");
  for (const id of ["missing", "lam-quen-lai"]) expect((await call("POST", `/api/boxes/${id}/unlock`, { cookie: a.cookie })).status).toBe(404);
  expect((await call("POST", "/api/boxes/deep-connection/unlock", { cookie: solo.cookie })).status).toBe(404);
  expect((await call("POST", "/api/boxes/deep-connection/unlock")).status).toBe(401);
  for (const origin of [null, "https://other.example"]) expect((await call("POST", "/api/boxes/deep-connection/unlock", { cookie: a.cookie, origin })).status).toBe(403);
});

it("AC25 AC44: gift unlock stays within the caller's couple and uses the couple index", async () => {
  const { a } = await paired();
  await call("POST", "/api/boxes/deep-connection/unlock", { cookie: a.cookie });
  const c = await user("Third"); const d = await user("Fourth");
  const created = await (await call("POST", "/api/couple", { cookie: c.cookie })).json<{ couple: { pendingCode: { code: string } } }>();
  await call("POST", "/api/couple/join", { cookie: d.cookie, body: { code: created.couple.pendingCode.code } });
  const other = await (await call("GET", "/api/boxes/deep-connection", { cookie: c.cookie })).json<CardBoxDetail>();
  expect(other.box.open).toBe(false); expect(other.cards).toHaveLength(3);
  const plans = await explain("SELECT box_id FROM card_box_unlocks WHERE couple_id = ?", "couple");
  expect(plans.join(" ")).toContain("SEARCH"); expect(plans.join(" ")).not.toContain("SCAN");
});
