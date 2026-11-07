import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, explain, paired, resetDb, user, type TestUser } from "./helpers";
import type { GardenState, GardenCardState } from "../src/shared/garden";

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
    expect((await call("PUT", "/api/garden/cards/money-01/answer", { cookie: x.cookie, body: { text: "stolen", coupleId: couple.id, userId: a.id } })).status).toBe(404);
    expect((await answer(x, "money-01", "their own" )).status).toBe(201);
    expect(await env.DB.prepare("SELECT body FROM garden_answers WHERE couple_id = ? AND user_id = ?").bind(couple.id, a.id).first("body")).toBe("OUR SECRET");
  });

  it("R36 R39: answer foreign keys cascade with the user and all garden data with the couple", async () => {
    const { a, couple } = await paired();
    await garden(a);
    await answer(a, "money-01");
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(a.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
    await env.DB.prepare("DELETE FROM couples WHERE id = ?").bind(couple.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) n FROM garden_days WHERE couple_id = ?").bind(couple.id).first("n")).toBe(0);
  });

  it("R1 R37: couple-scoped day, answer and growth lookups use indexes", async () => {
    for (const sql of ["SELECT * FROM garden_days WHERE couple_id = ? AND day = '2026-11-09'", "SELECT * FROM garden_answers WHERE couple_id = ? AND card_id = 'money-01' AND round = 1", "SELECT * FROM garden_growth WHERE couple_id = ? GROUP BY deck_id"]) {
      expect((await explain(sql, "couple")).join(" ")).not.toMatch(/SCAN garden_/);
    }
  });
});
