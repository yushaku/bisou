import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAIR_CODE_ALPHABET } from "../src/shared/pairCode";
import type { Couple } from "../src/shared/types";
import { HOUR, MINUTE } from "../src/worker/lib/time";
import { call, login } from "./helpers";

const T0 = new Date("2026-11-04T08:00:00Z").getTime();

async function resetDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM join_attempts"),
    env.DB.prepare("DELETE FROM pair_codes"),
    env.DB.prepare("DELETE FROM couple_members"),
    env.DB.prepare("DELETE FROM couples"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM otp_codes"),
    env.DB.prepare("DELETE FROM otp_requests"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface TestUser {
  cookie: string;
  id: string;
}

async function user(name: string): Promise<TestUser> {
  const { cookie, res } = await login(`${name.toLowerCase()}@example.com`);
  const { user: u } = await res.json<{ user: { id: string } }>();
  await call("PATCH", "/api/me", { cookie, body: { displayName: name } });
  return { cookie, id: u.id };
}

async function getCouple(u: TestUser): Promise<Couple | null> {
  const res = await call("GET", "/api/couple", { cookie: u.cookie });
  expect(res.status).toBe(200);
  return (await res.json<{ couple: Couple | null }>()).couple;
}

async function create(u: TestUser): Promise<Couple> {
  const res = await call("POST", "/api/couple", { cookie: u.cookie });
  expect(res.status).toBe(201);
  return (await res.json<{ couple: Couple }>()).couple;
}

function join(u: TestUser, code: string) {
  return call("POST", "/api/couple/join", { cookie: u.cookie, body: { code } });
}

async function paired(): Promise<{ a: TestUser; b: TestUser; couple: Couple; code: string }> {
  const a = await user("An");
  const b = await user("Minh");
  const created = await create(a);
  const code = created.pendingCode!.code;
  const res = await join(b, code);
  expect(res.status).toBe(200);
  return { a, b, couple: (await res.json<{ couple: Couple }>()).couple, code };
}

/** A valid-looking code that is not the given one. */
function otherCode(code: string): string {
  return code === "AAAAAA" ? "BBBBBB" : "AAAAAA";
}

const count = (table: string) => env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>("n");

describe("POST /api/couple (create)", () => {
  it("creates a couple with the caller alone and a 24 h code from the no look-alike alphabet", async () => {
    const a = await user("An");
    const couple = await create(a);
    expect(couple.members).toEqual([{ id: a.id, displayName: "An" }]);
    expect(couple.startDate).toBeNull();
    expect(couple.pendingCode!.code).toMatch(new RegExp(`^[${PAIR_CODE_ALPHABET}]{6}$`));
    expect(couple.pendingCode!.code).not.toMatch(/[01OIL]/);
    expect(couple.pendingCode!.expiresAt).toBe(T0 + 24 * HOUR);
    expect(await getCouple(a)).toEqual(couple);

    const me = await call("GET", "/api/me", { cookie: a.cookie });
    expect((await me.json<{ coupleId: string }>()).coupleId).toBe(couple.id);
  });

  it("refuses a second couple for the same user", async () => {
    const a = await user("An");
    await create(a);
    const res = await call("POST", "/api/couple", { cookie: a.cookie });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_in_couple" });
    expect(await count("couples")).toBe(1);
  });

  it("requires a session and a same-origin request", async () => {
    expect((await call("POST", "/api/couple")).status).toBe(401);
    const a = await user("An");
    expect((await call("POST", "/api/couple", { cookie: a.cookie, origin: "https://evil.example" })).status).toBe(403);
  });
});

describe("POST /api/couple/code (regenerate)", () => {
  it("replaces the code; the old one stops working", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const first = (await create(a)).pendingCode!;
    vi.setSystemTime(T0 + 5 * MINUTE);
    const res = await call("POST", "/api/couple/code", { cookie: a.cookie });
    expect(res.status).toBe(200);
    const second = (await res.json<{ couple: Couple }>()).couple.pendingCode!;
    expect(second.code).not.toBe(first.code);
    expect(second.expiresAt).toBe(T0 + 5 * MINUTE + 24 * HOUR);
    expect(await count("pair_codes")).toBe(1);

    const old = await join(b, first.code);
    expect(old.status).toBe(400);
    expect(await old.json()).toEqual({ error: "pair_code_invalid" });
    expect((await join(b, second.code)).status).toBe(200);
  });

  it("gives a new code after the old one expired", async () => {
    const a = await user("An");
    await create(a);
    vi.setSystemTime(T0 + 25 * HOUR);
    expect((await getCouple(a))!.pendingCode).toBeUndefined();
    const res = await call("POST", "/api/couple/code", { cookie: a.cookie });
    expect((await res.json<{ couple: Couple }>()).couple.pendingCode!.expiresAt).toBe(T0 + 49 * HOUR);
  });

  it("is refused without a couple and once paired", async () => {
    const lone = await user("Lan");
    const none = await call("POST", "/api/couple/code", { cookie: lone.cookie });
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual({ error: "not_in_couple" });

    const { a } = await paired();
    const res = await call("POST", "/api/couple/code", { cookie: a.cookie });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_paired" });
    expect(await count("pair_codes")).toBe(0);
  });
});

describe("DELETE /api/couple (cancel)", () => {
  it("deletes the couple and its code while the creator is alone", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    const res = await call("DELETE", "/api/couple", { cookie: a.cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ couple: null });
    expect(await getCouple(a)).toBeNull();
    expect(await count("couples")).toBe(0);
    expect(await count("pair_codes")).toBe(0);
    expect((await join(b, code)).status).toBe(400);
    // Free to create again.
    await create(a);
  });

  it("cannot unpair once paired, and needs a couple", async () => {
    const { a, b } = await paired();
    for (const u of [a, b]) {
      const res = await call("DELETE", "/api/couple", { cookie: u.cookie });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "already_paired" });
    }
    expect((await getCouple(a))!.members).toHaveLength(2);
    const lone = await user("Lan");
    expect((await call("DELETE", "/api/couple", { cookie: lone.cookie })).status).toBe(404);
  });
});

describe("POST /api/couple/join", () => {
  it("joins with a valid code: both see the same couple, the code is gone", async () => {
    const { a, b, couple, code } = await paired();
    expect(couple.members).toEqual([
      { id: a.id, displayName: "An" },
      { id: b.id, displayName: "Minh" },
    ]);
    expect(couple.pendingCode).toBeUndefined();
    expect(await getCouple(a)).toEqual(couple);
    expect(await getCouple(b)).toEqual(couple);
    expect(await count("pair_codes")).toBe(0);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM pair_codes WHERE code = ?").bind(code).first("n")).toBe(0);
    const me = await call("GET", "/api/me", { cookie: b.cookie });
    expect((await me.json<{ coupleId: string }>()).coupleId).toBe(couple.id);
  });

  it("normalizes case, spaces and dashes", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    const messy = ` ${code.slice(0, 3).toLowerCase()}-${code.slice(3)} `;
    expect((await join(b, messy)).status).toBe(200);
  });

  it("rejects the caller's own code without counting it as a failure", async () => {
    const a = await user("An");
    const { code } = (await create(a)).pendingCode!;
    const res = await join(a, code);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "own_pair_code" });
    expect(await count("join_attempts")).toBe(0);
    expect((await getCouple(a))!.pendingCode!.code).toBe(code);
  });

  it("rejects a wrong code and a malformed one", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    const wrong = await join(b, otherCode(code));
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toEqual({ error: "pair_code_invalid" });
    for (const bad of ["", "ABC", "ABCDEF1", "0OIL1A", 42]) {
      const res = await call("POST", "/api/couple/join", { cookie: b.cookie, body: { code: bad } });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "pair_code_invalid" });
    }
    // Only the well formed wrong guess counts.
    expect(await count("join_attempts")).toBe(1);
    expect(await getCouple(b)).toBeNull();
  });

  it("rejects an expired code", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    vi.setSystemTime(T0 + 24 * HOUR);
    const res = await join(b, code);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "pair_code_expired" });
    expect(await getCouple(b)).toBeNull();
    expect((await getCouple(a))!.members).toHaveLength(1);
  });

  it("accepts a code just before it expires", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    vi.setSystemTime(T0 + 24 * HOUR - 1);
    expect((await join(b, code)).status).toBe(200);
  });

  it("is single use: a third user cannot reuse the code", async () => {
    const { code } = await paired();
    const c3 = await user("Lan");
    const res = await join(c3, code);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "pair_code_invalid" });
    expect(await getCouple(c3)).toBeNull();
  });

  it("never lets a third member in, even with a code planted on a full couple", async () => {
    const { couple } = await paired();
    await env.DB.prepare("INSERT INTO pair_codes (code, couple_id, expires_at, created_at) VALUES ('ZZZZZZ', ?, ?, ?)")
      .bind(couple.id, T0 + HOUR, T0)
      .run();
    const c3 = await user("Lan");
    const res = await join(c3, "ZZZZZZ");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "couple_full" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM couple_members WHERE couple_id = ?").bind(couple.id).first("n")).toBe(2);
  });

  it("rejects a user who is already paired", async () => {
    const { a, b } = await paired();
    const c3 = await user("Lan");
    const { code } = (await create(c3)).pendingCode!;
    for (const u of [a, b]) {
      const res = await join(u, code);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "already_paired" });
    }
    expect((await getCouple(c3))!.members).toHaveLength(1);
    expect((await getCouple(c3))!.pendingCode!.code).toBe(code);
  });

  it("lets a user who is still waiting with an own code join the partner's code instead", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const aCode = (await create(a)).pendingCode!.code;
    const bCouple = await create(b);
    const res = await join(a, bCouple.pendingCode!.code);
    expect(res.status).toBe(200);
    const couple = (await res.json<{ couple: Couple }>()).couple;
    expect(couple.id).toBe(bCouple.id);
    expect(couple.members.map((m) => m.id)).toEqual([b.id, a.id]);
    // A's waiting couple and its code are gone.
    expect(await count("couples")).toBe(1);
    expect(await count("pair_codes")).toBe(0);
    const lan = await user("Lan");
    expect((await join(lan, aCode)).status).toBe(400);
  });

  it("allows 10 failed attempts per hour, then answers 429 with retryAfter, even for the right code", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const { code } = (await create(a)).pendingCode!;
    const wrong = otherCode(code);
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(T0 + i * MINUTE);
      const res = await join(b, wrong);
      expect(res.status).toBe(400);
    }
    vi.setSystemTime(T0 + 15 * MINUTE);
    const limited = await join(b, code);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited", retryAfter: 45 * 60 });
    expect(await count("join_attempts")).toBe(10);

    // The first failure leaves the window after an hour.
    vi.setSystemTime(T0 + HOUR + 1);
    expect((await join(b, code)).status).toBe(200);
    expect(await count("join_attempts")).toBe(9);
  });

  it("counts the limit per user", async () => {
    const a = await user("An");
    const b = await user("Minh");
    const c3 = await user("Lan");
    const { code } = (await create(a)).pendingCode!;
    for (let i = 0; i < 10; i++) await join(b, otherCode(code));
    expect((await join(b, code)).status).toBe(429);
    expect((await join(c3, code)).status).toBe(200);
  });
});

describe("PATCH /api/couple (start date)", () => {
  it("lets either partner set and change the start date", async () => {
    const { a, b } = await paired();
    const set = await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2023-02-14" } });
    expect(set.status).toBe(200);
    expect((await set.json<{ couple: Couple }>()).couple.startDate).toBe("2023-02-14");
    const change = await call("PATCH", "/api/couple", { cookie: b.cookie, body: { startDate: "2024-02-29" } });
    expect(change.status).toBe(200);
    expect((await getCouple(a))!.startDate).toBe("2024-02-29");
  });

  it("validates the format and real calendar dates", async () => {
    const { a } = await paired();
    for (const startDate of ["2023-2-14", "14/02/2023", "2023-02-30", "2023-13-01", "2025-02-29", "1899-12-31", "", null, 20230214]) {
      const res = await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate } });
      expect(res.status, String(startDate)).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_start_date" });
    }
    expect((await call("PATCH", "/api/couple", { cookie: a.cookie, body: {} })).status).toBe(400);
    expect((await getCouple(a))!.startDate).toBeNull();
  });

  it("rejects a future date, allowing today in the furthest time zone", async () => {
    const { a } = await paired();
    // T0 is 08:00 UTC on 2026-11-04, already 22:00 on the same day at UTC+14.
    expect((await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2026-11-04" } })).status).toBe(200);
    expect((await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2026-11-05" } })).status).toBe(400);
    vi.setSystemTime(T0 + 2 * HOUR); // 10:00 UTC: 2026-11-05 has begun at UTC+14.
    expect((await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2026-11-05" } })).status).toBe(200);
    expect((await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2027-01-01" } })).status).toBe(400);
  });

  it("needs a couple", async () => {
    const lone = await user("Lan");
    const res = await call("PATCH", "/api/couple", { cookie: lone.cookie, body: { startDate: "2023-02-14" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_in_couple" });
  });
});

describe("GET /api/couple", () => {
  it("returns null for a user without a couple, and coupleId null in /api/me", async () => {
    const lone = await user("Lan");
    expect(await getCouple(lone)).toBeNull();
    const me = await call("GET", "/api/me", { cookie: lone.cookie });
    expect(await me.json()).toMatchObject({ coupleId: null, user: { id: lone.id } });
  });

  it("shapes: alone with a pending code, paired without one", async () => {
    const a = await user("An");
    const alone = await create(a);
    expect(Object.keys(alone).sort()).toEqual(["id", "members", "pendingCode", "startDate"]);
    const b = await user("Minh");
    await join(b, alone.pendingCode!.code);
    const both = await getCouple(a);
    expect(Object.keys(both!).sort()).toEqual(["id", "members", "startDate"]);
    expect(both!.members).toHaveLength(2);
  });

  it("only ever shows the caller's own couple", async () => {
    const { a, couple } = await paired();
    const c3 = await user("Lan");
    const d4 = await user("Hoa");
    const other = await create(c3);
    await join(d4, other.pendingCode!.code);
    await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2023-02-14" } });

    const theirs = await getCouple(c3);
    expect(theirs!.id).toBe(other.id);
    expect(theirs!.id).not.toBe(couple.id);
    expect(theirs!.startDate).toBeNull();
    expect(theirs!.members.map((m) => m.displayName)).toEqual(["Lan", "Hoa"]);
    expect(JSON.stringify(theirs)).not.toContain(a.id);

    // An outsider sees nothing, and cannot address a couple by id.
    const outsider = await user("Tuan");
    expect(await getCouple(outsider)).toBeNull();
    const byId = await call("GET", `/api/couple/${couple.id}`, { cookie: outsider.cookie });
    expect(byId.status).toBe(404);
    const patch = await call("PATCH", "/api/couple", { cookie: outsider.cookie, body: { startDate: "2020-01-01", id: couple.id } });
    expect(patch.status).toBe(404);
    expect((await getCouple(a))!.startDate).toBe("2023-02-14");
  });

  it("requires a session", async () => {
    expect((await call("GET", "/api/couple")).status).toBe(401);
  });
});
