import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { runCleanup } from "../src/worker/lib/cleanup";
import { HOUR, MINUTE } from "../src/worker/lib/time";

const NOW = new Date("2026-11-05T20:00:00Z").getTime();

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

beforeEach(resetDb);

afterEach(() => {
  vi.restoreAllMocks();
});

async function keys(sql: string): Promise<string[]> {
  const { results } = await env.DB.prepare(sql).all<{ k: string | number }>();
  return results.map((r) => String(r.k)).sort();
}

async function count(table: string): Promise<number> {
  return (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>("n")) ?? 0;
}

/** For each table: rows already expired, one at exactly the cutoff (deleted) and live rows. */
async function seed() {
  const db = env.DB;
  const user = (id: string) =>
    db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").bind(id, `${id}@example.com`, NOW - 100 * HOUR);
  const otp = (email: string, expiresAt: number) =>
    db
      .prepare("INSERT INTO otp_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, 'h', ?, 0, ?)")
      .bind(email, expiresAt, expiresAt - 10 * MINUTE);
  const session = (token: string, expiresAt: number) =>
    db
      .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, 'u1', ?, ?)")
      .bind(token, NOW - 100 * HOUR, expiresAt);
  const otpRequest = (id: number, createdAt: number) =>
    db.prepare("INSERT INTO otp_requests (id, email, created_at) VALUES (?, 'a@example.com', ?)").bind(id, createdAt);
  const joinAttempt = (id: number, createdAt: number) =>
    db.prepare("INSERT INTO join_attempts (id, user_id, created_at) VALUES (?, 'u2', ?)").bind(id, createdAt);
  const coupleRow = (id: string) =>
    db.prepare("INSERT INTO couples (id, start_date, created_by, created_at) VALUES (?, NULL, NULL, ?)").bind(id, NOW - 100 * HOUR);
  const member = (coupleId: string, userId: string) =>
    db.prepare("INSERT INTO couple_members (couple_id, user_id, joined_at) VALUES (?, ?, ?)").bind(coupleId, userId, NOW - 99 * HOUR);
  const pairCode = (code: string, coupleId: string, expiresAt: number) =>
    db
      .prepare("INSERT INTO pair_codes (code, couple_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(code, coupleId, expiresAt, expiresAt - 24 * HOUR);

  await db.batch([
    user("u1"),
    user("u2"),
    user("u3"),
    user("u4"),
    user("u5"),
    otp("old@example.com", NOW - 1),
    otp("edge@example.com", NOW),
    otp("live@example.com", NOW + 1),
    session("old", NOW - HOUR),
    session("edge", NOW),
    session("live", NOW + 1),
    otpRequest(1, NOW - 2 * HOUR),
    otpRequest(2, NOW - HOUR),
    otpRequest(3, NOW - HOUR + 1),
    otpRequest(4, NOW),
    joinAttempt(1, NOW - 2 * HOUR),
    joinAttempt(2, NOW - HOUR),
    joinAttempt(3, NOW - HOUR + 1),
    // c1 and c2 wait with an expired code, c3 waits with a live one, c4 is paired.
    coupleRow("c1"),
    coupleRow("c2"),
    coupleRow("c3"),
    coupleRow("c4"),
    member("c1", "u1"),
    member("c2", "u2"),
    member("c3", "u3"),
    member("c4", "u4"),
    member("c4", "u5"),
    pairCode("OLDOLD", "c1", NOW - 1),
    pairCode("EDGEED", "c2", NOW),
    pairCode("LIVELV", "c3", NOW + 1),
  ]);
}

async function expectOnlyLiveRowsLeft() {
  expect(await keys("SELECT email AS k FROM otp_codes")).toEqual(["live@example.com"]);
  expect(await keys("SELECT token_hash AS k FROM sessions")).toEqual(["live"]);
  expect(await keys("SELECT id AS k FROM otp_requests")).toEqual(["3", "4"]);
  expect(await keys("SELECT id AS k FROM join_attempts")).toEqual(["3"]);
  expect(await keys("SELECT code AS k FROM pair_codes")).toEqual(["LIVELV"]);
  // Pairing data other than codes is never touched.
  expect(await keys("SELECT id AS k FROM couples")).toEqual(["c1", "c2", "c3", "c4"]);
  expect(await keys("SELECT couple_id || ':' || user_id AS k FROM couple_members")).toEqual([
    "c1:u1",
    "c2:u2",
    "c3:u3",
    "c4:u4",
    "c4:u5",
  ]);
  expect(await count("users")).toBe(5);
}

describe("runCleanup", () => {
  it("deletes only expired rows and reports the counts per table", async () => {
    await seed();
    const counts = await runCleanup(env.DB, NOW);
    expect(counts).toEqual({ otp_codes: 2, sessions: 2, otp_requests: 2, join_attempts: 2, pair_codes: 2 });
    await expectOnlyLiveRowsLeft();
  });

  it("deletes a session whose expiry is exactly now", async () => {
    await seed();
    await runCleanup(env.DB, NOW);
    const edge = await env.DB.prepare("SELECT 1 FROM sessions WHERE token_hash = 'edge'").first();
    expect(edge).toBeNull();
    const live = await env.DB.prepare("SELECT 1 FROM sessions WHERE token_hash = 'live'").first();
    expect(live).not.toBeNull();
  });

  it("deletes nothing on a second run", async () => {
    await seed();
    await runCleanup(env.DB, NOW);
    expect(await runCleanup(env.DB, NOW)).toEqual({
      otp_codes: 0,
      sessions: 0,
      otp_requests: 0,
      join_attempts: 0,
      pair_codes: 0,
    });
    await expectOnlyLiveRowsLeft();
  });
});

describe("scheduled handler", () => {
  it("runs the cleanup at the scheduled time inside waitUntil and logs the counts", async () => {
    await seed();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext;
    const controller = { scheduledTime: NOW, cron: "0 20 * * *", noRetry: () => {} } as ScheduledController;

    await worker.scheduled!(controller, env, ctx);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);

    await expectOnlyLiveRowsLeft();
    const lines = log.mock.calls.filter((args) => args[0] === "[bisou] cleanup");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(String(lines[0]?.[1]))).toEqual({
      otp_codes: 2,
      sessions: 2,
      otp_requests: 2,
      join_attempts: 2,
      pair_codes: 2,
    });
  });
});
