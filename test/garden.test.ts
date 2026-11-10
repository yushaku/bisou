import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, explain, paired, resetDb, user, type TestUser } from "./helpers";
import { drawInput, drawSeed, loadToday } from "../src/worker/lib/garden";
import { drawCard, CARDS, gateIds, type GardenState, type GardenCardState, type GardenDeckState } from "../src/shared/garden";

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

  it("R10a: daily draws and swaps avoid waiting answers when that deck has another card", async () => {
    const { a, b, couple } = await paired();
    const input = await drawInput(env.DB, couple.id, "2026-11-09");
    const candidate = drawCard(input, await drawSeed(couple.id, "2026-11-09", 0))!;
    const wait = (id: string) => env.DB.prepare("INSERT INTO garden_answers(couple_id, card_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, 'waiting', ?, ?)").bind(couple.id, id, b.id, NOW, NOW).run();
    await wait(candidate.id);
    const state = await garden(a);
    expect(state.today!.cardId).not.toBe(candidate.id);
    expect(state.swapLocked).toBe(false);
    const current = CARDS.find((c) => c.id === state.today!.cardId)!;
    const swapCandidate = drawCard({ ...await drawInput(env.DB, couple.id, state.day), excludedCard: current.id, excludedDeck: current.deckId }, await drawSeed(couple.id, state.day, 1))!;
    await wait(swapCandidate.id);
    const swapped = await (await call("POST", "/api/garden/today/swap", { cookie: a.cookie, body: { cardId: current.id } })).json<GardenState>();
    expect(swapped.today!.cardId).not.toBe(swapCandidate.id);
    expect(swapped.swapLocked).toBe(false);
  });

  it("R10a: waiting cards remain drawable when their deck has no alternative", () => {
    expect(drawCard({ played: CARDS.filter((c) => c.id !== "money-01").map((c) => c.id), waiting: ["money-01"] }, 0)?.id).toBe("money-01");
  });

  it("R12: DELETE rejects oversized request bodies", async () => {
    const { a } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id);
    expect((await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "x".repeat(17000) } })).status).toBe(413);
    expect((await garden(a)).today?.mine).toBe("a private answer");
  });

  it("R6: drawing retries a lost insertion only once", async () => {
    const { a, couple } = await paired();
    const original = env.DB.batch.bind(env.DB);
    const batch = vi.spyOn(env.DB, "batch");
    let attempts = 0;
    batch.mockImplementation(async (statements) => {
      if (statements.length !== 2) return original(statements);
      if (++attempts > 2) throw new Error("unbounded retry");
      return original(statements.map(() => env.DB.prepare("SELECT 1 WHERE 0")));
    });
    expect(await loadToday(env.DB, couple.id, NOW, a.id)).toBeNull();
    expect(attempts).toBe(2);
  });

  it("migration 0011: round has no CHECK", async () => {
    const { a, couple } = await paired();
    await env.DB.prepare("INSERT INTO garden_answers(couple_id, card_id, round, user_id, body, created_at, updated_at) VALUES (?, 'money-01', 2, ?, 'future', ?, ?)").bind(couple.id, a.id, NOW, NOW).run();
    expect(await env.DB.prepare("SELECT round FROM garden_answers WHERE couple_id = ?").bind(couple.id).first("round")).toBe(2);
  });

  it("R12: line breaks save and CRLF is normalized, while NUL and bidi controls are rejected", async () => {
    const { a } = await paired();
    const id = (await garden(a)).today!.cardId;
    for (const text of ["a\u0000b", "a\u202eb", "a\rb"]) expect((await answer(a, id, text)).status).toBe(400);
    expect((await answer(a, id, "a\nb")).status).toBe(201);
    expect((await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "a\r\nb" } })).status).toBe(200);
    expect((await garden(a)).today?.mine).toBe("a\nb");
  });

  it("R3 R21 D8: only today's card or a deck's active card accepts POST", async () => {
    const { a, b, couple } = await paired();
    await garden(a);
    expect((await answer(a, "money-10")).status).toBe(404);
    const deck = await (await call("GET", "/api/garden/decks/money", { cookie: a.cookie })).json<GardenDeckState>();
    expect((await answer(a, deck.active!.cardId)).status).toBe(201);
    await env.DB.prepare("INSERT INTO garden_answers(couple_id, card_id, user_id, body, created_at, updated_at) VALUES (?, 'money-09', ?, 'waiting', ?, ?)").bind(couple.id, b.id, NOW, NOW).run();
    expect((await answer(a, "money-09")).status).toBe(404);
  });

  it("R13: POST to an unavailable card does not reveal a partner waiting answer", async () => {
    const { a, b, couple } = await paired();
    const today = (await garden(a)).today!.cardId;
    const deck = await (await call("GET", "/api/garden/decks/money", { cookie: a.cookie })).json<GardenDeckState>();
    const id = CARDS.find((card) => card.deckId === "money" && card.id !== today && card.id !== deck.active!.cardId)!.id;
    const unanswered = await answer(a, id);
    expect(unanswered.status).toBe(404);
    const body = await unanswered.json();
    expect(body).toEqual({ error: "not_found" });
    await env.DB.prepare("INSERT INTO garden_answers(couple_id, card_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, 'waiting', ?, ?)").bind(couple.id, id, b.id, NOW, NOW).run();
    const waiting = await answer(a, id);
    expect(waiting.status).toBe(unanswered.status);
    expect(await waiting.json()).toEqual(body);
  });

  it("R38: retired cards still allow authors to edit and delete existing answers", async () => {
    const { a } = await paired();
    const id = (await garden(a)).today!.cardId;
    await answer(a, id);
    const card = CARDS.find((card) => card.id === id)!;
    card.retired = true;
    try {
      expect((await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "edited" } })).status).toBe(200);
      expect((await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie })).status).toBe(200);
      expect((await answer(a, id)).status).toBe(404);
    } finally { delete card.retired; }
  });

  it("R12 AC7: validation trims, counts code points, rejects controls, bidi and oversized bodies", async () => {
    const { a } = await paired();
    const id = (await garden(a)).today!.cardId;
    for (const text of ["", "   ", "bad\u202etext", "bad\u2066text", 3, null]) {
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


describe("Relationship placement", () => {
  it("R45 R46 AC26 AC33: placement is mutual, stale acceptance cannot consume a replacement", async () => {
    const { a, b, couple } = await paired();
    const initial = await garden(a);
    const action = (who: TestUser, body: unknown) => call("POST", "/api/garden/levels", { cookie: who.cookie, body });
    expect((await action(a, { action: "propose", kind: "placement", levelId: "married", revision: 0 })).status).toBe(200);
    expect((await action(a, { action: "accept", revision: 1 })).status).toBe(409);
    expect((await action(a, { action: "propose", kind: "placement", levelId: "in_love", revision: 1 })).status).toBe(200);
    expect((await action(b, { action: "accept", revision: 1 })).status).toBe(409);
    expect((await action(b, { action: "accept", revision: 2 })).status).toBe(200);
    const state = await garden(a);
    expect(state).toMatchObject({ levels: { initialLevelId: "in_love", selectedLevelId: "in_love", furthestLevelId: "in_love" } });
    expect(state.today).toEqual(initial.today);
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
    expect((await action(a, { action: "propose", kind: "placement", levelId: "married", revision: 3 })).status).toBe(409);
  });
  it("R46 R56 AC36: unplaced couples keep legacy play and cannot forge a locked ordinary answer", async () => {
    const { a } = await paired();
    expect((await answer(a, "L2-02")).status).toBe(404);
    expect((await garden(a)).today?.cardId).not.toMatch(/^L/);
  });
});

it("R45 R51 R52 AC26 AC30 AC31: Married starting placement preserves waiting cards and growth; mutual revisit keeps access", async () => {
  const { a, b, couple } = await paired();
  const before = await garden(a);
  await answer(a, before.today!.cardId);
  await env.DB.prepare("INSERT INTO garden_growth VALUES (?, 'money', '2026-11-08')").bind(couple.id).run();
  const act = (who: TestUser, body: unknown) => call("POST", "/api/garden/levels", { cookie: who.cookie, body });
  expect((await act(a, { action: "propose", kind: "placement", levelId: "married", revision: 0 })).status).toBe(200);
  expect((await act(b, { action: "accept", revision: 1 })).status).toBe(200);
  const state = await garden(b);
  expect(state.today!.cardId).toBe(before.today!.cardId);
  expect(state.plants.find((p) => p.deckId === "money")!.stage).toBe(1);
  expect(state.levels.decisions.every((d) => !d.complete)).toBe(true);
  expect((await act(a, { action: "propose", kind: "revisit", levelId: "in_love", revision: 2 })).status).toBe(200);
  expect((await act(b, { action: "accept", revision: 3 })).status).toBe(200);
  expect((await garden(a)).levels).toMatchObject({ selectedLevelId: "in_love", furthestLevelId: "married", initialLevelId: "married" });
  expect((await answer(b, before.today!.cardId)).status).toBe(201);
});
it("R1 R46 AC33: only current paired members mutate levels; pending proposals require decline before counterproposal", async () => {
  const { a, b, couple } = await paired(); const outsider = await user("Outside");
  const act = (who: TestUser, body: unknown) => call("POST", "/api/garden/levels", { cookie: who.cookie, body });
  expect((await act(outsider, { action: "accept", revision: 1 })).status).toBe(404);
  await act(a, { action: "propose", kind: "placement", levelId: "married", revision: 0 });
  expect((await act(b, { action: "propose", kind: "placement", levelId: "in_love", revision: 1 })).status).toBe(409);
  expect((await act(b, { action: "decline", revision: 1 })).status).toBe(200);
  expect((await act(b, { action: "propose", kind: "placement", levelId: "in_love", revision: 2 })).status).toBe(200);
  await env.DB.prepare("DELETE FROM couple_members WHERE couple_id = ? AND user_id = ?").bind(couple.id, a.id).run();
  expect((await act(b, { action: "accept", revision: 3 })).status).toBe(404);
});

async function place(a: TestUser, b: TestUser, levelId = "in_love") {
  expect((await call("POST", "/api/garden/levels", { cookie: a.cookie, body: { action: "propose", kind: "placement", levelId, revision: 0 } })).status).toBe(200);
  expect((await call("POST", "/api/garden/levels", { cookie: b.cookie, body: { action: "accept", revision: 1 } })).status).toBe(200);
}
it.each(["no_details", "later_not_applicable"])("R42 R43 R44 AC24 AC25 AC32: %s reveals text only on paired submission and retains completion on deletion", async (choice) => {
  const { a, b, couple } = await paired(); await place(a, b);
  expect((await answer(a, "L2-01", "PRIVATE RENT TEXT")).status).toBe(201);
  let res = await call("GET", "/api/garden/decks/money", { cookie: b.cookie });
  let raw = await res.text(); expect(raw).not.toContain("PRIVATE RENT TEXT"); expect(raw).not.toContain('"partnerChoice":"');
  expect((await call("POST", "/api/garden/cards/L2-01/answer", { cookie: b.cookie, body: { choice } })).status).toBe(201);
  res = await call("GET", "/api/garden/decks/money", { cookie: a.cookie });
  let state = await res.json<GardenDeckState>();
  expect(state.decisions.find((d) => d.cardId === "L2-01")).toMatchObject({ mine: "PRIVATE RENT TEXT", partner: null, partnerChoice: choice, partnerDeleted: false, flippedDay: "2026-11-09" });
  expect((await call("DELETE", "/api/garden/cards/L2-01/answer", { cookie: b.cookie })).status).toBe(200);
  state = await (await call("GET", "/api/garden/decks/money", { cookie: a.cookie })).json<GardenDeckState>();
  expect(state.decisions.find((d) => d.cardId === "L2-01")).toMatchObject({ partnerChoice: null, partnerDeleted: true, flippedDay: "2026-11-09" });
  expect((await garden(a)).levels.decisions.find((d) => d.cardId === "L2-01")!.complete).toBe(true);
  expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_growth WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
});

it("R43 R57 AC25 AC32: invalid alternatives reject; edits switch response type and pre-reveal deletion clears submission", async () => {
  const { a, b } = await paired(); await place(a, b);
  const post = (id: string, body: unknown) => call("POST", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body });
  for (const body of [{}, { text: "x", choice: "no_details" }, { choice: "unknown" }, { choice: null }, { text: "x", userId: b.id }]) expect((await post("L2-01", body)).status).toBe(400);
  const ordinary = (await garden(a)).today!.cardId;
  expect((await post(ordinary, { choice: "no_details" })).status).toBe(400);
  expect((await post("L4-01", { choice: "no_details" })).status).toBe(404);
  expect((await post("L2-01", { text: "private before" })).status).toBe(201);
  expect((await call("PUT", "/api/garden/cards/L2-01/answer", { cookie: a.cookie, body: { choice: "no_details" } })).status).toBe(200);
  let state = await (await call("GET", "/api/garden/decks/money", { cookie: b.cookie })).text();
  expect(state).not.toContain("private before"); expect(state).not.toContain('"partnerChoice":"no_details"');
  expect((await call("DELETE", "/api/garden/cards/L2-01/answer", { cookie: a.cookie })).status).toBe(200);
  expect((await answer(b, "L2-01", "partner words")).status).toBe(201);
  expect((await garden(a)).levels.decisions.find((d) => d.cardId === "L2-01")!.complete).toBe(false);
  expect((await post("L2-01", { choice: "later_not_applicable" })).status).toBe(201);
  const edited = await call("PUT", "/api/garden/cards/L2-01/answer", { cookie: a.cookie, body: { text: "changed after" } });
  expect((await edited.json<{card: GardenCardState}>()).card).toMatchObject({ mine: "changed after", mineChoice: null, mineEdited: true, partner: "partner words" });
});
it("R42 R58 AC24 AC32: different texts and paired choices complete equally; delete racing reveal never leaks an orphan", async () => {
  const { a, b } = await paired(); await place(a, b);
  await answer(a, "L2-01", "yes"); expect((await answer(b, "L2-01", "no")).status).toBe(201);
  for (const who of [a, b]) expect((await call("POST", "/api/garden/cards/L2-03/answer", { cookie: who.cookie, body: { choice: "no_details" } })).status).toBe(201);
  await answer(a, "L2-05", "ORPHAN SECRET");
  await Promise.all([call("DELETE", "/api/garden/cards/L2-05/answer", { cookie: a.cookie }), answer(b, "L2-05")]);
  const state = await (await call("GET", "/api/garden/decks/everyday", { cookie: b.cookie })).json<GardenDeckState>();
  const card = state.decisions.find((d) => d.cardId === "L2-05")!;
  expect(card.partner).toBeNull();
  expect(card.flippedDay === null || card.partnerDeleted).toBe(true);
});

const levelAction = (who: TestUser, body: unknown) => call("POST", "/api/garden/levels", { cookie: who.cookie, body });
it("R47 R48 R49 R55 R59 AC27 AC28 AC31 AC33: final paired decision opens one mutual skipped target, without cascade or growth", async () => {
  const { a, b, couple } = await paired(); await place(a, b, "living_together");
  const before = await garden(a);
  expect((await levelAction(a, { action: "propose", kind: "target", levelId: "with_children", revision: 2 })).status).toBe(200);
  expect((await levelAction(b, { action: "accept", revision: 3 })).status).toBe(200);
  const gates = gateIds(2);
  for (const id of gates) {
    expect((await answer(a, id, "my view")).status).toBe(201);
    if (id !== gates.at(-1)) expect((await answer(b, id, "a different view")).status).toBe(201);
  }
  expect((await garden(a)).levels.furthestLevelId).toBe("living_together");
  const last = gates.at(-1)!;
  const saved = await call("POST", `/api/garden/cards/${last}/answer`, { cookie: b.cookie, body: { choice: "later_not_applicable" } });
  expect(saved.status).toBe(201);
  const after = await garden(a);
  expect(after.levels).toMatchObject({ selectedLevelId: "with_children", furthestLevelId: "with_children", proposal: null });
  expect(after.today).toEqual(before.today); expect(after.plants).toEqual(before.plants); expect(after.freshness).toBe(before.freshness);
  expect((await answer(b, last)).status).toBe(409);
  expect((await garden(a)).levels.revision).toBe(after.levels.revision);
  expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ? AND card_id LIKE 'L4-%'").bind(couple.id).first("n")).toBe(0);
});

it("R48 R58 R59 AC27 AC32 AC33: answers before target and post-reveal deletions still open only once on later acceptance", async () => {
  const { a, b } = await paired(); await place(a, b, "acquainted");
  for (const id of gateIds(0)) { await answer(a, id); await answer(b, id, "different"); }
  await call("DELETE", `/api/garden/cards/${gateIds(0)[0]}/answer`, { cookie: a.cookie });
  expect((await garden(a)).levels.furthestLevelId).toBe("acquainted");
  await levelAction(a, { action: "propose", kind: "target", levelId: "in_love", revision: 2 });
  expect((await levelAction(b, { action: "accept", revision: 3 })).status).toBe(200);
  const state = await garden(a);
  expect(state.levels).toMatchObject({ revision: 4, selectedLevelId: "in_love", proposal: null });
  expect((await levelAction(b, { action: "accept", revision: 3 })).status).toBe(409);
  await call("DELETE", `/api/garden/cards/${gateIds(0)[1]}/answer`, { cookie: b.cookie });
  expect((await garden(b)).levels.furthestLevelId).toBe("in_love");
});
it("R47 R59 AC33: stale acceptance after target replacement/decline saves nothing and agreement can be withdrawn by either member", async () => {
  const { a, b } = await paired(); await place(a, b);
  await levelAction(a, { action: "propose", kind: "target", levelId: "living_together", revision: 2 });
  await levelAction(a, { action: "propose", kind: "target", levelId: "married", revision: 3 });
  expect((await levelAction(b, { action: "accept", revision: 3 })).status).toBe(409);
  await levelAction(b, { action: "decline", revision: 4 });
  expect((await levelAction(b, { action: "accept", revision: 4 })).status).toBe(409);
  await levelAction(b, { action: "propose", kind: "target", levelId: "living_together", revision: 5 });
  await levelAction(a, { action: "accept", revision: 6 });
  expect((await garden(a)).levels.proposal!.agreed).toBe(true);
  expect((await levelAction(b, { action: "decline", revision: 7 })).status).toBe(200);
  expect((await garden(a)).levels).toMatchObject({ revision: 8, furthestLevelId: "in_love", proposal: null });
});
it("R48 R59 AC27 AC33: concurrent final responses serialize to one opening and a duplicate batch cannot mutate progress", async () => {
  const { a, b, couple } = await paired(); await place(a, b, "acquainted");
  await levelAction(a, { action: "propose", kind: "target", levelId: "in_love", revision: 2 });
  await levelAction(b, { action: "accept", revision: 3 });
  const ids = gateIds(0); for (const id of ids) await answer(a, id);
  for (const id of ids.slice(0, -2)) await answer(b, id);
  expect((await Promise.all(ids.slice(-2).map((id) => answer(b, id)))).map((r) => r.status)).toEqual([201, 201]);
  expect((await garden(a)).levels).toMatchObject({ revision: 5, selectedLevelId: "in_love", proposal: null });
  expect((await Promise.all([answer(b, ids.at(-1)!), answer(b, ids.at(-1)!)])).map((r) => r.status)).toEqual([409, 409]);
  expect(await env.DB.prepare("SELECT revision FROM garden_levels WHERE couple_id = ?").bind(couple.id).first("revision")).toBe(5);
  expect((await garden(b)).levels).toEqual((await garden(a)).levels);
});
it("R50 R51 R54 AC29 AC30: revisiting earlier decisions cannot bypass the furthest snapshot; ordinary play needs no target", async () => {
  const { a, b } = await paired(); await place(a, b, "married");
  await levelAction(a, { action: "propose", kind: "revisit", levelId: "acquainted", revision: 2 });
  await levelAction(b, { action: "accept", revision: 3 });
  for (const id of gateIds(0)) { await answer(a, id); await answer(b, id); }
  const state = await garden(a); expect(state.levels.selectedLevelId).toBe("acquainted");
  expect((await answer(a, state.today!.cardId)).status).toBe(201);
  expect((await answer(b, state.today!.cardId)).status).toBe(201);
  await levelAction(a, { action: "propose", kind: "target", levelId: "with_children", revision: 4 });
  await levelAction(b, { action: "accept", revision: 5 });
  expect((await garden(a)).levels.furthestLevelId).toBe("married");
  for (const id of gateIds(3)) { await answer(a, id); await answer(b, id); }
  expect((await garden(a)).levels.furthestLevelId).toBe("with_children");
});
it("stage answers list only the caller's answered cards in that stage and hide locked stages", async () => {
  const { a, b } = await paired(); await place(a, b, "in_love");
  await answer(a, "L1-01", "my acquainted answer");
  await answer(a, "L2-01", "my in-love answer");
  await answer(b, "L2-01", "partner in-love answer");
  const stage = (who: TestUser, id: string) => call("GET", `/api/garden/stages/${id}`, { cookie: who.cookie });
  const mine = await (await stage(a, "in_love")).json<{ cards: GardenCardState[] }>();
  expect(mine.cards.map((card) => card.cardId)).toEqual(["L2-01"]);
  expect(mine.cards[0]).toMatchObject({ mine: "my in-love answer", partner: "partner in-love answer", flippedDay: "2026-11-09" });
  const partner = await (await stage(b, "in_love")).json<{ cards: GardenCardState[] }>();
  expect(partner.cards.map((card) => card.cardId)).toEqual(["L2-01"]);
  expect((await (await stage(a, "acquainted")).json<{ cards: GardenCardState[] }>()).cards.map((card) => card.cardId)).toEqual(["L1-01"]);
  expect((await (await stage(b, "acquainted")).json<{ cards: GardenCardState[] }>()).cards).toEqual([]);
  expect((await stage(a, "living_together")).status).toBe(404);
  expect((await stage(a, "unknown")).status).toBe(404);
});
it("R1 R57 AC32: cross-couple and unpaired callers cannot read or mutate decision responses", async () => {
  const { a, b, couple } = await paired(); await place(a, b);
  await answer(a, "L2-01", "OUR SECRET");
  const x = await user("OtherA"), y = await user("OtherB");
  const created = await (await call("POST", "/api/couple", { cookie: x.cookie })).json<{couple: {pendingCode: {code: string}}}>();
  await call("POST", "/api/couple/join", { cookie: y.cookie, body: { code: created.couple.pendingCode.code } });
  await place(x, y);
  expect(await (await call("GET", "/api/garden/decks/money", { cookie: x.cookie })).text()).not.toContain("OUR SECRET");
  for (const method of ["PUT", "DELETE"]) expect((await call(method, "/api/garden/cards/L2-01/answer", { cookie: x.cookie, ...(method === "PUT" ? { body: { text: "changed" } } : {}) })).status).toBe(404);
  expect((await answer(x, "L2-01", "their own")).status).toBe(201);
  expect(await env.DB.prepare("SELECT body FROM garden_answers WHERE couple_id = ? AND user_id = ? AND card_id = 'L2-01'").bind(couple.id, a.id).first("body")).toBe("OUR SECRET");
  const lone = await user("Alone"); expect((await answer(lone, "L2-01")).status).toBe(404);
});
it("R1 R59 AC33: removal between middleware and decision batch prevents insertion, completion and advancement", async () => {
  const { a, b, couple } = await paired(); await place(a, b, "acquainted");
  await levelAction(a, { action: "propose", kind: "target", levelId: "in_love", revision: 2 });
  await levelAction(b, { action: "accept", revision: 3 });
  for (const id of gateIds(0)) { await answer(a, id); if (id !== gateIds(0).at(-1)) await answer(b, id); }
  const original = env.DB.batch.bind(env.DB);
  const spy = vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
    await env.DB.prepare("DELETE FROM couple_members WHERE couple_id = ? AND user_id = ?").bind(couple.id, b.id).run();
    return original(statements);
  });
  expect((await answer(b, gateIds(0).at(-1)!)).status).toBe(404);
  spy.mockRestore();
  expect(await env.DB.prepare("SELECT furthest_level FROM garden_levels WHERE couple_id = ?").bind(couple.id).first("furthest_level")).toBe(0);
  expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ? AND card_id = ? AND user_id = ?").bind(couple.id, gateIds(0).at(-1)!, b.id).first("n")).toBe(0);
});

it("R52 AC26 AC31: additive 0012 preserves populated legacy waiting/flipped/edited/deleted/swapped records", async () => {
  const { a, b, couple } = await paired();
  const old = env.TEST_MIGRATIONS.find((m) => m.name.startsWith("0011"))!;
  const added = env.TEST_MIGRATIONS.find((m) => m.name.startsWith("0012"))!;
  const renamed = (sql: string) => sql.replaceAll("garden_", "legacy_garden_");
  for (const query of old.queries) await env.DB.prepare(renamed(query)).run();
  for (const [index, body, flipped, edited] of [[0, "waiting", null, 0], [1, "revealed", "2026-11-08", 0], [2, "edited", "2026-11-08", 1], [3, null, "2026-11-08", 0]] as const) {
    await env.DB.prepare(`INSERT INTO legacy_garden_answers(couple_id, card_id, user_id, body, created_at, updated_at, flipped_day, edited_after_flip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(couple.id, `money-0${index + 1}`, index % 2 ? a.id : b.id, body, NOW, NOW, flipped, edited).run();
  }
  await env.DB.prepare(`INSERT INTO legacy_garden_days(couple_id, day, deck_id, card_id, swaps, swapped_cards, flipped, created_at)
    VALUES (?, '2026-11-08', 'money', 'money-02', 1, '{"money-01":"2026-11-08:1"}', 1, ?)`).bind(couple.id, NOW).run();
  await env.DB.prepare("INSERT INTO legacy_garden_growth VALUES (?, 'money', '2026-11-08')").bind(couple.id).run();
  const before = await env.DB.prepare("SELECT * FROM legacy_garden_answers ORDER BY card_id").all();
  const day = await env.DB.prepare("SELECT * FROM legacy_garden_days").all();
  for (const query of added.queries) await env.DB.prepare(renamed(query)).run();
  const after = await env.DB.prepare("SELECT * FROM legacy_garden_answers ORDER BY card_id").all();
  expect(after.results.map(({response_choice, ...row}) => { expect(response_choice).toBeNull(); return row; })).toEqual(before.results);
  expect((await env.DB.prepare("SELECT * FROM legacy_garden_days").all()).results).toEqual(day.results);
  expect(await env.DB.prepare("SELECT COUNT(*) n FROM legacy_garden_growth").first("n")).toBe(1);
  expect(await env.DB.prepare("SELECT COUNT(*) n FROM legacy_garden_levels").first("n")).toBe(0);
  await env.DB.batch(["levels", "answers", "growth", "days"].map((name) => env.DB.prepare(`DROP TABLE legacy_garden_${name}`)));
});
it("R56 AC36: opened ordinary exhaustion remains fresh with locked and decision cards still unanswered", async () => {
  const { a, b, couple } = await paired(); await place(a, b, "acquainted");
  const ordinary = CARDS.filter((card) => card.kind === "ordinary" && card.levelId === "acquainted");
  await env.DB.batch(ordinary.flatMap((card) => [a,b].map((who) => env.DB.prepare(`INSERT INTO garden_answers
    (couple_id, card_id, user_id, body, created_at, updated_at, flipped_day) VALUES (?, ?, ?, 'played', ?, ?, '2026-10-01')`).bind(couple.id, card.id, who.id, NOW, NOW))));
  const state = await garden(a); expect(state.today).toBeNull(); expect(state.freshness).toBe("fresh");
  expect(state.levels.decisions.every((d) => !d.complete)).toBe(true);
});

it("R48 R59 AC27 AC33: target acceptance racing both final answers has one serial outcome", async () => {
  const { a, b } = await paired(); await place(a, b, "acquainted");
  const ids = gateIds(0); for (const id of ids.slice(0, -1)) { await answer(a, id); await answer(b, id); }
  await levelAction(a, { action: "propose", kind: "target", levelId: "in_love", revision: 2 });
  const result = await Promise.all([levelAction(b, { action: "accept", revision: 3 }), answer(a, ids.at(-1)!), answer(b, ids.at(-1)!)]);
  expect(result.map((r) => r.status)).toEqual([200, 201, 201]);
  const state = await garden(a); expect(state.levels.furthestLevelId).toBe("in_love"); expect(state.levels.proposal).toBeNull();
  expect([4, 5]).toContain(state.levels.revision);
});
