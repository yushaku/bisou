import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { runCleanup, sweepPhotos } from "../src/worker/lib/cleanup";
import { DAY, HOUR, MINUTE, PENDING_PHOTO_TTL } from "../src/worker/lib/time";
import { photoKey } from "../src/worker/lib/photos";
import { call, paired, resetDb, upload } from "./helpers";

const NOW = new Date("2026-11-05T20:00:00Z").getTime();

beforeEach(resetDb);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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
  it("R16, R23: expires unread titles 30 days after deletion, preserving recent notices and live claims", async () => {
    const { a, b } = await paired();
    for (const title of ["Deleted", "Live"]) {
      const res = await call("POST", "/api/wishes", { cookie: b.cookie, body: { title, price: 100 } });
      const { wish } = await res.json<{ wish: { id: string } }>();
      await call("POST", `/api/wishes/${wish.id}/claim`, { cookie: a.cookie });
      await env.DB.prepare("UPDATE wish_claims SET created_at = ? WHERE wish_id = ?").bind(NOW - 60 * DAY, wish.id).run();
      if (title === "Deleted") {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(NOW);
        await call("DELETE", `/api/wishes/${wish.id}`, { cookie: b.cookie });
        vi.useRealTimers();
      }
    }
    await runCleanup(env.DB, NOW + 30 * DAY - 1);
    expect(await count("wish_claims")).toBe(2);
    expect((await runCleanup(env.DB, NOW + 30 * DAY)).wish_notices).toBe(1);
    expect(await count("wish_claims")).toBe(1);
    expect(await env.DB.prepare("SELECT gone_title FROM wish_claims").first("gone_title")).toBeNull();
  });

  it("deletes only expired rows and reports the counts per table", async () => {
    await seed();
    const counts = await runCleanup(env.DB, NOW);
    expect(counts).toEqual({ otp_codes: 2, sessions: 2, otp_requests: 2, join_attempts: 2, pair_codes: 2, wish_spins: 0, wish_notices: 0 });
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
      wish_spins: 0,
      wish_notices: 0,
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
      wish_spins: 0,
      wish_notices: 0,
    });
    expect(log).toHaveBeenCalledWith("[bisou] photo cleanup", 0);
  });
});

async function scheduled() {
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise), passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
  await worker.scheduled({ scheduledTime: NOW, cron: "0 20 * * *", noRetry: () => {} } as ScheduledController, env, ctx);
  await Promise.all(pending);
}

async function seedPhotos() {
  await seed();
  await env.DB.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, created_at, updated_at)
    VALUES ('entry', 'c4', 'u4', '2026-11-05', ?, ?)`).bind(NOW, NOW).run();
  for (const [id, createdAt, entryId] of [
    ["expired", NOW - 25 * HOUR, null], ["edge", NOW - 24 * HOUR, null], ["detached", 0, null],
    ["recent", NOW - HOUR, null], ["attached", NOW - 25 * HOUR, "entry"],
  ] as const) {
    await env.DB.prepare("INSERT INTO photos (id, couple_id, uploader_id, entry_id, created_at) VALUES (?, 'c4', 'u4', ?, ?)")
      .bind(id, entryId, createdAt).run();
    for (const size of ["full", "thumb"] as const) await env.PHOTOS.put(photoKey("c4", id, size), "fixture");
  }
}

describe("scheduled photo sweep", () => {
  it("AC3, AC12 (R3, R17): a save racing expiration cannot attach a photo whose objects the sweep removes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const { a } = await paired();
    const photoId = await upload(a);
    await env.DB.prepare("UPDATE photos SET created_at = ? WHERE id = ?").bind(NOW - PENDING_PHOTO_TTL + 1, photoId).run();
    const batch = env.DB.batch.bind(env.DB);
    const removeObjects = env.PHOTOS.delete.bind(env.PHOTOS);
    vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      let saved: D1Result[] = [];
      vi.spyOn(env.PHOTOS, "delete").mockImplementationOnce(async (keys) => {
        saved = await batch(statements);
        await removeObjects(keys);
      });
      await sweepPhotos(env, NOW + 2);
      return saved;
    });
    const res = await call("POST", "/api/journal", { cookie: a.cookie, body: { date: "2026-11-05", text: "", photoIds: [photoId] } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "photo_invalid" });
    expect(await count("journal_entries")).toBe(0);
  });

  it("AC10, AC12 (R11, R17): removes expired and detached photos, retains recent and attached photos, and logs row counts", async () => {
    await seedPhotos();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await scheduled();
    expect(await keys("SELECT id AS k FROM photos")).toEqual(["attached", "recent"]);
    for (const id of ["expired", "edge", "detached", "recent", "attached"]) {
      for (const size of ["full", "thumb"] as const) {
        const object = await env.PHOTOS.head(photoKey("c4", id, size));
        if (["recent", "attached"].includes(id)) expect(object).not.toBeNull();
        else expect(object).toBeNull();
      }
    }
    expect(log).toHaveBeenCalledWith("[bisou] photo cleanup", 3);
    await scheduled();
    expect(log).toHaveBeenLastCalledWith("[bisou] photo cleanup", 0);
  });

  it("sweeps photos even when D1 row cleanup fails and logs each outcome", async () => {
    await seedPhotos();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(env.DB, "batch").mockRejectedValueOnce(new Error("unavailable"));
    await scheduled();
    expect(await keys("SELECT id AS k FROM photos")).toEqual(["attached", "recent"]);
    expect(error).toHaveBeenCalledWith("[bisou] cleanup failed");
    expect(log).toHaveBeenCalledWith("[bisou] photo cleanup", 3);
    expect(await count("otp_codes")).toBe(3);
  });

  it("AC12 (R17): an R2 failure leaves pending rows for a later retry", async () => {
    await seedPhotos();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(env.PHOTOS, "delete").mockRejectedValueOnce(new Error("unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await scheduled();
    expect(error).toHaveBeenCalledWith("[bisou] photo cleanup failed");
    await expectOnlyLiveRowsLeft();
    expect(await count("photos")).toBe(5);
    await scheduled();
    expect(await keys("SELECT id AS k FROM photos")).toEqual(["attached", "recent"]);
  });

  it("AC12 (R17): limits each sweep to 500 photos and 1000 R2 keys within D1 parameter limits", async () => {
    await seed();
    const ids = Array.from({ length: 501 }, (_, i) => `pending-${i}`);
    await env.DB.batch(ids.map((id) => env.DB.prepare("INSERT INTO photos (id, couple_id, uploader_id, created_at) VALUES (?, 'c4', 'u4', 0)").bind(id)));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const deleted = vi.spyOn(env.PHOTOS, "delete");
    await scheduled();
    expect(await count("photos")).toBe(1);
    expect(deleted.mock.calls[0]?.[0]).toHaveLength(1000);
    expect(log).toHaveBeenLastCalledWith("[bisou] photo cleanup", 500);
    await scheduled();
    expect(await count("photos")).toBe(0);
    expect(deleted.mock.calls[1]?.[0]).toHaveLength(2);
    expect(log).toHaveBeenLastCalledWith("[bisou] photo cleanup", 1);
  });
});


it("AC10 (R24): daily cleanup retains only the last 24 hours of spin times", async () => {
  await seed();
  await env.DB.batch([NOW - 24 * HOUR - 1, NOW - 24 * HOUR, NOW - 24 * HOUR + 1].map((at) =>
    env.DB.prepare("INSERT INTO wish_spins (user_id, created_at) VALUES ('u1', ?)").bind(at)));
  expect((await runCleanup(env.DB, NOW)).wish_spins).toBe(2);
  expect(await count("wish_spins")).toBe(1);
});
