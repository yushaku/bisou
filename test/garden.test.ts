import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, explain, paired, resetDb, user, type TestUser } from "./helpers";
import { CARDS, type GardenState, type GardenCardState, type GardenDeckState } from "../src/shared/garden";

const NOW = Date.parse("2026-11-09T08:00:00+07:00");
export async function garden(who: TestUser) {
  const res = await call("GET", "/api/garden", { cookie: who.cookie });
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  return res.json<GardenState>();
}
export async function answer(who: TestUser, cardId: string, text = "a private answer") {
  return call("POST", `/api/garden/cards/${cardId}/answer`, { cookie: who.cookie, body: { text } });
}

beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(NOW); });
afterEach(() => vi.restoreAllMocks());

describe("Garden daily cards", () => {
  it("R11 AC19: an exhausted garden has no new daily card and its freshness stays fresh", async () => {
    const { a, b, couple } = await paired();
    await env.DB.batch(CARDS.flatMap((card) => [a, b].map((who) => env.DB.prepare(`INSERT INTO garden_answers
      (couple_id, card_id, user_id, body, created_at, updated_at, flipped_day) VALUES (?, ?, ?, 'played', ?, ?, '2026-10-01')`)
      .bind(couple.id, card.id, who.id, NOW, NOW))));
    const state = await garden(a);
    expect(state.today).toBeNull();
    expect(state.freshness).toBe("fresh");
  });
  it("R5 R6 AC3: a phone already in tomorrow still shares the Vietnam daily card", async () => {
    const { a, b } = await paired();
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-10T00:30:00+09:00"));
    expect((await garden(a)).day).toBe("2026-11-09");
    expect((await garden(a)).today!.cardId).toBe((await garden(b)).today!.cardId);
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-10T00:00:00+07:00"));
    expect((await garden(b)).day).toBe("2026-11-10");
  });
  it("R10 AC5: concurrent swaps advance once, share the new card and put the old one at the back", async () => {
    const { a, b, couple } = await paired();
    const old = (await garden(a)).today!.cardId;
    const swap = (who: TestUser) => call("POST", "/api/garden/today/swap", { cookie: who.cookie, body: { cardId: old } });
    const responses = await Promise.all([swap(a), swap(b)]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const [first, second] = await Promise.all(responses.map((r) => r.json<GardenState>()));
    expect(first).toEqual(second);
    expect(first!.today!.cardId.split("-")[0]).not.toBe(old.split("-")[0]);
    expect(await env.DB.prepare("SELECT swaps FROM garden_days WHERE couple_id = ?").bind(couple.id).first("swaps")).toBe(1);
    const deck = await call("GET", `/api/garden/decks/${old.split("-")[0]}`, { cookie: a.cookie });
    expect((await deck.json<GardenDeckState>()).active!.cardId).toBe(`${old.split("-")[0]}-02`);
  });

  it("R10 R13 AC6: either answer locks swaps for both without naming who answered", async () => {
    const { a, b } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id, "LOCKED SECRET");
    const res = await Promise.all([a, b].map((who) => call("POST", "/api/garden/today/swap", { cookie: who.cookie, body: { cardId: id } })));
    expect(res.map((r) => r.status)).toEqual([409, 409]);
    for (const r of res) expect(await r.json()).toEqual({ error: "swap_locked" });
    await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie });
    expect((await call("POST", "/api/garden/today/swap", { cookie: b.cookie, body: { cardId: id } })).status).toBe(200);
  });

  it("R10 R13: racing a swap with an answer cannot discard or expose the answer", async () => {
    const { a, b, couple } = await paired();
    const id = (await garden(a)).today!.cardId;
    const [saved, swapped] = await Promise.all([answer(a, id, "RACING SECRET"), call("POST", "/api/garden/today/swap", { cookie: b.cookie, body: { cardId: id } })]);
    expect(saved.status).toBe(201);
    expect([200, 409]).toContain(swapped.status);
    expect(await swapped.text()).not.toContain("RACING SECRET");
    expect(await env.DB.prepare("SELECT body FROM garden_answers WHERE couple_id = ? AND card_id = ? AND user_id = ?").bind(couple.id, id, a.id).first("body")).toBe("RACING SECRET");
    const deck = await call("GET", `/api/garden/decks/${id.split("-")[0]}`, { cookie: b.cookie });
    expect(await deck.text()).not.toContain("RACING SECRET");
  });

  it("R7 R13 R20 AC8 AC12 AC18: a waiting old daily answer stays private in deck play until both answer", async () => {
    const { a, b } = await paired();
    const old = (await garden(a)).today!.cardId;
    const path = `/api/garden/decks/${old.split("-")[0]}`;
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-10T08:00:00+07:00"));
    await garden(b);
    const before = await call("GET", path, { cookie: b.cookie });
    const beforeBody = await before.clone().json<GardenDeckState>();
    await answer(a, old, "YESTERDAY SECRET");
    const after = await call("GET", path, { cookie: b.cookie });
    expect(await after.clone().json()).toEqual(beforeBody);
    expect([...after.headers]).toEqual([...before.headers]);
    expect(after.status).toBe(before.status);
    const saved = await answer(b, old, "my answer");
    expect((await saved.json<{ card: GardenCardState }>()).card).toMatchObject({ partner: "YESTERDAY SECRET", flippedDay: "2026-11-10" });
    const deck = await call("GET", path, { cookie: b.cookie });
    const state = await deck.json<GardenDeckState>();
    expect(state.active?.cardId).not.toBe(old);
    expect(state.history[0]).toMatchObject({ cardId: old, partner: "YESTERDAY SECRET" });
  });

  it("R13 R20 R21 AC18: deck extra play hides all first-answer metadata and shows newest flips first", async () => {
    const { a, b } = await paired();
    const path = "/api/garden/decks/money";
    const before = await call("GET", path, { cookie: b.cookie });
    const beforeBody = await before.json<GardenDeckState>();
    const id = beforeBody.active!.cardId;
    await answer(a, id, "EXTRA SECRET");
    expect(await (await call("GET", path, { cookie: b.cookie })).json()).toEqual(beforeBody);
    await answer(b, id);
    vi.mocked(Date.now).mockReturnValue(NOW + 1000);
    await answer(a, "money-02");
    await answer(b, "money-02");
    const state = await (await call("GET", path, { cookie: b.cookie })).json<GardenDeckState>();
    expect(state.active?.cardId).toBe("money-03");
    expect(state.history.map((c) => c.cardId)).toEqual(["money-02", "money-01"]);
  });
  it("R13 R31: historical deck ordering never reveals a partner's first answer", async () => {
    const { a, b, couple } = await paired();
    for (const [day, id, created] of [["2026-11-07", "money-01", NOW - 2000], ["2026-11-08", "money-02", NOW - 1000], ["2026-11-09", "money-03", NOW]] as const) {
      await env.DB.prepare("INSERT INTO garden_days(couple_id, day, card_id, deck_id, created_at) VALUES (?, ?, ?, 'money', ?)").bind(couple.id, day, id, created).run();
    }
    const path = "/api/garden/decks/money";
    const before = await (await call("GET", path, { cookie: b.cookie })).json();
    await answer(a, "money-01", "DO NOT SORT BY THIS");
    expect(await (await call("GET", path, { cookie: b.cookie })).json()).toEqual(before);
  });

  it("R1 R10 R12: decks and swap validate ids and every route is scoped to paired membership", async () => {
    const { a } = await paired();
    const outsider = await user("Out");
    expect((await call("GET", "/api/garden/decks/unknown", { cookie: a.cookie })).status).toBe(404);
    expect((await call("POST", "/api/garden/today/swap", { cookie: a.cookie, body: { cardId: "unknown" } })).status).toBe(400);
    for (const [method, path] of [["GET", "/api/garden/decks/money"], ["POST", "/api/garden/today/swap"]]) {
      expect((await call(method!, path!, { cookie: outsider.cookie, body: method === "GET" ? undefined : { cardId: "money-01" } })).status).toBe(404);
    }
  });
  it("R22 R24 R25 AC11: flips grow a plant once per day, edits and deletions never shrink or regrow it", async () => {
    const { a, b } = await paired();
    const id = (await garden(a)).today!.cardId;
    const deck = id.split("-")[0]!;
    await answer(a, id);
    await answer(b, id);
    const second = `${deck}-02`;
    await answer(a, second);
    await answer(b, second);
    expect((await garden(a)).plants.find((p) => p.deckId === deck)?.stage).toBe(1);
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-10T08:00:00+07:00"));
    await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "edit another day" } });
    await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: b.cookie });
    expect((await garden(a)).plants.find((p) => p.deckId === deck)?.stage).toBe(1);
    await answer(a, `${deck}-03`);
    await answer(b, `${deck}-03`);
    expect((await garden(a)).plants.find((p) => p.deckId === deck)?.stage).toBe(2);
  });

  it("R22 R26 R27 R29 AC14 AC15: only a current daily flip refreshes the shared garden", async () => {
    const { a, b } = await paired();
    const old = (await garden(a)).today!.cardId;
    await answer(a, old);
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-12T08:00:00+07:00"));
    expect((await garden(a)).freshness).toBe("dry");
    await answer(b, old);
    expect((await garden(a)).freshness).toBe("dry");
    const today = (await garden(a)).today!.cardId;
    await answer(a, today);
    expect((await garden(b)).freshness).toBe("dry");
    await answer(b, today);
    expect((await garden(a)).freshness).toBe("fresh");
    expect((await garden(a)).plants).toEqual((await garden(b)).plants);
  });
  it("R5 R6 AC3: concurrent first opens store the same Vietnam-day card for both", async () => {
    const { a, b, couple } = await paired();
    const [first, second] = await Promise.all([garden(a), garden(b)]);
    expect(first).toEqual(second);
    expect(first.day).toBe("2026-11-09");
    expect(first.today?.cardId).toMatch(/^[a-z]+-\d{2}$/);
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_days WHERE couple_id = ?").bind(couple.id).first("n")).toBe(1);
  });

  it("R13 R14 R31 AC8: a single answer leaves all partner response data and headers private", async () => {
    const { a, b } = await paired();
    const before = await call("GET", "/api/garden", { cookie: b.cookie });
    const state = await before.clone().json<GardenState>();
    const saved = await answer(a, state.today!.cardId, "SECRET one");
    expect(saved.status).toBe(201);
    const after = await call("GET", "/api/garden", { cookie: b.cookie });
    // D9 deliberately exposes only the shared swap lock.
    const beforeBody = await before.json<GardenState>();
    const afterBody = await after.json<GardenState>();
    expect({ ...afterBody, swapLocked: false }).toEqual(beforeBody);
    expect(afterBody.swapLocked).toBe(true);
    expect(after.status).toBe(before.status);
    expect([...after.headers]).toEqual([...before.headers]);
    expect(JSON.stringify(afterBody)).not.toContain("SECRET");
    expect((await garden(a)).today?.mine).toBe("SECRET one");
  });

  it("R15 AC9: the second answer reveals both, own first, with only the flip day", async () => {
    const { a, b } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id, "An's words");
    const res = await answer(b, id, "Minh's words");
    expect(res.status).toBe(201);
    expect((await res.json<{ card: GardenCardState }>()).card).toMatchObject({ mine: "Minh's words", partner: "An's words", flippedDay: "2026-11-09" });
    expect((await garden(a)).today).toMatchObject({ mine: "An's words", partner: "Minh's words" });
  });

  it("R15: concurrent answers flip once and duplicate creation cannot overwrite", async () => {
    const { a, b, couple } = await paired();
    const id = (await garden(a)).today!.cardId;
    const responses = await Promise.all([answer(a, id, "A"), answer(b, id, "B")]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect((await garden(a)).today?.partner).toBe("B");
    expect((await answer(a, id, "overwrite")).status).toBe(409);
    expect(await env.DB.prepare("SELECT flipped FROM garden_days WHERE couple_id = ?").bind(couple.id).first("flipped")).toBe(1);
  });

  it("R7 R9 AC12: midnight moves on while a waiting answer stays on its original card", async () => {
    const { a, b, couple } = await paired();
    const old = (await garden(a)).today!.cardId;
    await answer(a, old, "Waiting across midnight");
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-10T00:00:00+07:00"));
    const next = await garden(b);
    expect(next.day).toBe("2026-11-10");
    expect(next.today!.cardId.split("-")[0]).not.toBe(old.split("-")[0]);
    expect(await env.DB.prepare("SELECT body FROM garden_answers WHERE couple_id = ? AND card_id = ? AND user_id = ?").bind(couple.id, old, a.id).first("body")).toBe("Waiting across midnight");
  });

  it("R18 R19 AC16 AC17: only the author edits; before-flip edits stay hidden and after-flip edits are marked", async () => {
    const { a, b } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id, "original");
    expect((await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: b.cookie, body: { text: "not mine", userId: a.id } })).status).toBe(404);
    expect((await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "before" } })).status).toBe(200);
    expect((await garden(b)).today).toMatchObject({ partner: null, partnerEdited: false });
    await answer(b, id, "B");
    expect((await garden(b)).today?.partnerEdited).toBe(false);
    await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "after" } });
    expect((await garden(b)).today).toMatchObject({ partner: "after", partnerEdited: true });
    expect((await garden(a)).today?.mineEdited).toBe(true);
  });

  it("R18 R19 R38: deleting before flip removes the answer; deleting after flip leaves a tombstone", async () => {
    const { a, b } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id);
    expect((await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: b.cookie })).status).toBe(404);
    expect((await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie })).status).toBe(200);
    expect((await garden(a)).today).toMatchObject({ mine: null, mineDeleted: false });
    expect((await garden(a)).swapLocked).toBe(false);
    await answer(a, id);
    await answer(b, id);
    await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie });
    expect((await garden(b)).today).toMatchObject({ partner: null, partnerDeleted: true, flippedDay: "2026-11-09" });
    expect((await answer(a, id, "revive")).status).toBe(409);
  });

  it("R12 AC7: validation trims, counts code points, rejects controls, bidi and oversized bodies", async () => {
    const { a } = await paired();
    const id = (await garden(a)).today!.cardId;
    for (const text of ["", "   ", "bad\ntext", "bad\u202etext", "bad\u2066text", 3, null]) {
      expect((await call("POST", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text } })).status).toBe(400);
    }
    expect((await answer(a, id, "💚".repeat(1001))).status).toBe(400);
    expect((await answer(a, id, "a".repeat(17000))).status).toBe(413);
    expect((await answer(a, "unknown-01")).status).toBe(404);
    expect((await answer(a, id, `  ${"💚".repeat(1000)}  `)).status).toBe(201);
    expect((await garden(a)).today?.mine).toBe("💚".repeat(1000));
  });

  it("R1 AC1: every route rejects unpaired users and foreign origins", async () => {
    const outsider = await user("Outsider");
    for (const [method, path] of [["GET", "/api/garden"], ["POST", "/api/garden/cards/money-01/answer"], ["PUT", "/api/garden/cards/money-01/answer"], ["DELETE", "/api/garden/cards/money-01/answer"]]) {
      const res = await call(method!, path!, { cookie: outsider.cookie, body: method === "GET" ? undefined : { text: "foreign" } });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "not_in_couple" });
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    const { a } = await paired();
    expect((await call("POST", "/api/garden/cards/money-01/answer", { cookie: a.cookie, origin: "https://evil.example", body: { text: "x" } })).status).toBe(403);
  });

  it("R1 R36 R37 AC1: another couple using the same card id cannot read or change our answers", async () => {
    const { a, couple } = await paired();
    await answer(a, "money-01", "OUR SECRET");
    const x = await user("X");
    const y = await user("Y");
    const created = await call("POST", "/api/couple", { cookie: x.cookie });
    const code = (await created.json<{ couple: { pendingCode: { code: string } } }>()).couple.pendingCode.code;
    await call("POST", "/api/couple/join", { cookie: y.cookie, body: { code } });
    expect(JSON.stringify(await garden(x))).not.toContain("OUR SECRET");
    expect(await (await call("GET", "/api/garden/decks/money", { cookie: x.cookie })).text()).not.toContain("OUR SECRET");
    expect((await call("DELETE", "/api/garden/cards/money-01/answer", { cookie: x.cookie })).status).toBe(404);
    expect((await call("PUT", "/api/garden/cards/money-01/answer", { cookie: x.cookie, body: { text: "stolen", coupleId: couple.id, userId: a.id } })).status).toBe(404);
    expect((await answer(x, "money-01", "their own" )).status).toBe(201);
    expect(await env.DB.prepare("SELECT body FROM garden_answers WHERE couple_id = ? AND user_id = ?").bind(couple.id, a.id).first("body")).toBe("OUR SECRET");
  });

  it("R36 R39: answer foreign keys cascade with the user and all garden data with the couple", async () => {
    const { a, couple } = await paired();
    await garden(a);
    await answer(a, "money-01");
    await env.DB.prepare("INSERT INTO garden_growth(couple_id, deck_id, day) VALUES (?, 'money', '2026-11-09')").bind(couple.id).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(a.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
    await env.DB.prepare("DELETE FROM couples WHERE id = ?").bind(couple.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_days WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_growth WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
  });

  it("R1 R37: couple-scoped day, answer and growth lookups use indexes", async () => {
    for (const sql of ["SELECT * FROM garden_days WHERE couple_id = ? AND day = '2026-11-09'", "SELECT * FROM garden_answers WHERE couple_id = ? AND card_id = 'money-01' AND round = 1", "SELECT * FROM garden_growth WHERE couple_id = ? GROUP BY deck_id"]) {
      expect((await explain(sql, "couple")).join(" ")).not.toMatch(/SCAN garden_/);
    }
  });
});
