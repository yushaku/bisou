import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wish, Claim, SpinWish } from "../src/shared/types";
import { pickWeighted, randomInt } from "../src/worker/lib/wishes";
import { DAY, HOUR } from "../src/worker/lib/time";
import { call, paired, resetDb, upload, user, type TestUser } from "./helpers";

beforeEach(resetDb);
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

async function create(owner: TestUser, input: Record<string, unknown> = {}) {
  const res = await call("POST", "/api/wishes", { cookie: owner.cookie, body: { title: "Scarf", price: 450000, ...input } });
  expect(res.status).toBe(201);
  return (await res.json<{ wish: Wish }>()).wish;
}
const spin = (u: TestUser, budget = 500000) => call("POST", "/api/wishes/spin", { cookie: u.cookie, body: { budget } });
const claim = (u: TestUser, id: string) => call("POST", `/api/wishes/${id}/claim`, { cookie: u.cookie });
const claims = async (u: TestUser) => (await (await call("GET", "/api/wishes/claims", { cookie: u.cookie })).json<{ claims: Claim[] }>()).claims;

describe("secret spins and claims", () => {
  it("wish-spin: partner's wish is drawable with price 5 tỷ", async () => {
    const { a, b } = await paired();
    const wish = await create(b, { title: "Five billion wish", price: 5_000_000_000 });
    expect(await (await spin(a, 5_000_000_000)).json()).toEqual({
      wish: { id: wish.id, title: wish.title, price: wish.price, link: null, photoId: null },
    });
  });

  it("wish-spin: unpriced partner wish is drawable", async () => {
    const { a, b } = await paired();
    const wish = await create(b, { title: "Unpriced wish", price: null });
    expect(await (await spin(a, 5_000_000_000)).json()).toEqual({
      wish: { id: wish.id, title: wish.title, price: null, link: null, photoId: null },
    });
    expect((await claim(a, wish.id)).status).toBe(201);
  });

  it("wish-spin: priced partner wish above budget is excluded", async () => {
    const { a, b } = await paired();
    await create(b, { title: "Over budget wish", price: 5_000_000_001 });
    expect(await (await spin(a, 5_000_000_000)).json()).toEqual({ wish: null });
  });

  it("wishes AC3, AC6 (R7-R9, R12): only eligible partner wishes and only the landed fields reach the spinner", async () => {
    const { a, b } = await paired();
    const photoId = await upload(b);
    const scarf = await create(b, { photoId });
    await create(b, { title: "Pottery", price: 900000 });
    await create(b, { title: "Da Lat", price: 900000 });
    const claimed = await create(b, { title: "Candle" });
    await claim(a, claimed.id);
    await create(a, { title: "Mine", price: 1 });
    const result = await spin(a);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ wish: { id: scarf.id, title: scarf.title, price: scarf.price, link: null, photoId } });
    const image = await call("GET", `/api/photos/${photoId}/thumb`, { cookie: a.cookie });
    expect(image.status).toBe(200);
    expect(image.headers.get("Cache-Control")).toBe("private, max-age=86400");
  });

  it("wishes AC4 (R10): nothing fits and an empty jar return identical bodies", async () => {
    const { a, b } = await paired();
    const empty = await (await spin(a)).text();
    await create(b);
    expect(await (await spin(a, 200000)).text()).toBe(empty);
    expect(JSON.parse(empty)).toEqual({ wish: null });
  });

  it("wishes AC5 (R11): rolling 24 hour limit counts empty spins and expires at the exact cutoff", async () => {
    const { a } = await paired();
    const start = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start);
    for (let i = 0; i < 20; i++) expect((await spin(a)).status).toBe(200);
    vi.setSystemTime(start + 13 * HOUR);
    const limited = await spin(a);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited", retryAfter: 11 * 60 * 60 });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM wish_spins WHERE user_id = ?").bind(a.id).first("n")).toBe(20);
    vi.setSystemTime(start + DAY);
    expect((await spin(a)).status).toBe(200);
  });

  it("wishes AC7, AC8 (R13-R16): one persistent claim, live edits, release and re-spin", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    const first = await claim(a, wish.id);
    expect(first.status).toBe(201);
    expect((await claim(a, wish.id)).status).toBe(409);
    expect(await (await spin(a)).json()).toEqual({ wish: null });
    expect((await call("PUT", `/api/wishes/${wish.id}`, { cookie: b.cookie, body: { title: "New scarf", price: 480000 } })).status).toBe(200);
    const mine = await claims(a);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ title: "New scarf", price: 480000, status: "open" });
    expect(mine[0]).not.toHaveProperty("priority");
    expect(await claims(b)).toEqual([]);
    expect((await call("DELETE", `/api/wishes/claims/${mine[0]!.id}`, { cookie: b.cookie })).status).toBe(404);
    expect((await call("DELETE", `/api/wishes/claims/${mine[0]!.id}`, { cookie: a.cookie })).status).toBe(200);
    expect((await (await spin(a)).json<{ wish: SpinWish }>()).wish.id).toBe(wish.id);
  });

  it("wishes AC9 (R16, R23): GET preserves notices until an owned notice is acknowledged by POST", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    await claim(a, wish.id);
    expect((await call("DELETE", `/api/wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
    const notices = await claims(a);
    expect(notices).toEqual([expect.objectContaining({ status: "gone", title: "Scarf", price: null, link: null, photoId: null })]);
    expect(await claims(a)).toEqual(notices);
    const path = `/api/wishes/claims/${notices[0]!.id}/ack`;
    expect((await call("POST", path, { cookie: a.cookie, origin: "https://outside.example" })).status).toBe(403);
    expect((await call("POST", path, { cookie: a.cookie, origin: null })).status).toBe(403);
    expect((await call("POST", path, { cookie: b.cookie })).status).toBe(200);
    expect(await claims(a)).toEqual(notices);
    expect((await call("POST", path, { cookie: a.cookie })).status).toBe(200);
    expect((await call("POST", path, { cookie: a.cookie })).status).toBe(200);
    expect(await claims(a)).toEqual([]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM wish_claims").first("n")).toBe(0);
  });

  it("wishes AC10 (R17, R24): owner body and headers never change with spin, claim or release", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    const before = await call("GET", "/api/wishes", { cookie: b.cookie });
    const body = await before.text();
    const headers = Array.from(before.headers);
    for (const action of [() => spin(a), () => claim(a, wish.id), async () => {
      const [mine] = await claims(a);
      return call("DELETE", `/api/wishes/claims/${mine!.id}`, { cookie: a.cookie });
    }]) {
      await action();
      const after = await call("GET", "/api/wishes", { cookie: b.cookie });
      expect(await after.text()).toBe(body);
      expect(Array.from(after.headers)).toEqual(headers);
    }
    expect((await env.DB.prepare("PRAGMA table_info(wish_spins)").all<{ name: string }>()).results.map((c) => c.name)).toEqual(["id", "user_id", "created_at"]);
  });

  it("wishes AC1, AC7 (R1, R12, R13): only the partner can claim an open wish", async () => {
    const { a, b } = await paired();
    const outsider = await user("Outside");
    const wish = await create(b);
    expect((await claim(b, wish.id)).status).toBe(404);
    expect((await claim(outsider, wish.id)).status).toBe(404);
    expect((await spin(outsider)).status).toBe(404);
    await call("PUT", `/api/wishes/${wish.id}`, { cookie: b.cookie, body: { title: "Scarf", price: null } });
    expect((await claim(a, wish.id)).status).toBe(201);
    expect(await claims(a)).toHaveLength(1);
  });

  it("wishes R16, R22: acknowledging a notice cannot remove an open or received claim", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    const { claim: mine } = await (await claim(a, wish.id)).json<{ claim: Claim }>();
    const path = `/api/wishes/claims/${mine.id}/ack`;
    expect((await call("POST", path, { cookie: a.cookie })).status).toBe(200);
    expect(await claims(a)).toHaveLength(1);
    await call("POST", `/api/wishes/${wish.id}/received`, { cookie: b.cookie, body: { date: "2023-02-12", note: "", photoIds: [] } });
    expect((await call("POST", path, { cookie: a.cookie })).status).toBe(200);
    expect(await claims(a)).toEqual([expect.objectContaining({ id: mine.id, status: "received" })]);
  });

  it("wishes AC3 (R7): refuses invalid budgets without consuming a spin", async () => {
    const { a } = await paired();
    for (const budget of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const res = await spin(a, budget);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_budget" });
    }
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM wish_spins").first("n")).toBe(0);
  });
});


it("wishes AC3 (R9): enumerates exact 1:2:2 weights without sampling", () => {
  const rows = [{ title: "Candle", priority: 1 }, { title: "Scarf", priority: 2 }, { title: "Mug", priority: 2 }];
  expect(Array.from({ length: 5 }, (_, r) => pickWeighted(rows, (total) => { expect(total).toBe(5); return r; })?.title))
    .toEqual(["Candle", "Scarf", "Scarf", "Mug", "Mug"]);
  expect(pickWeighted([], () => { throw new Error("no random draw for an empty jar"); })).toBeNull();
});

it("wishes AC3 (R9): rejects the biased tail of random integers", () => {
  const getRandom = vi.spyOn(crypto, "getRandomValues");
  getRandom.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 0xffffffff; return array; });
  getRandom.mockImplementationOnce((array) => { (array as Uint32Array)[0] = 7; return array; });
  expect(randomInt(5)).toBe(2);
  expect(getRandom).toHaveBeenCalledTimes(2);
});


it("wishes AC5, AC7 (R11, R13): simultaneous requests cannot exceed the spin quota or duplicate a claim", async () => {
  const { a, b } = await paired();
  const wish = await create(b);
  const claimed = await Promise.all([claim(a, wish.id), claim(a, wish.id)]);
  expect(claimed.map((r) => r.status).sort()).toEqual([201, 409]);
  const results = await Promise.all(Array.from({ length: 23 }, () => spin(a)));
  expect(results.filter((r) => r.status === 200)).toHaveLength(20);
  expect(results.filter((r) => r.status === 429)).toHaveLength(3);
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM wish_spins WHERE user_id = ?").bind(a.id).first("n")).toBe(20);
});
