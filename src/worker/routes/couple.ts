import { Hono } from "hono";
import { isValidDay, latestDay } from "../../shared/days";
import { isPairCode, normalizePairCode } from "../../shared/pairCode";
import type { AppEnv } from "../env";
import {
  findMembership,
  generatePairCode,
  isUniqueViolation,
  loadCouple,
  releaseJoinAttempt,
  reserveJoinAttempt,
} from "../lib/couples";
import { PAIR_CODE_TTL } from "../lib/time";

// Every query is keyed by the session user; a couple id never comes from the client.
export const couple = new Hono<AppEnv>();

const CODE_RETRIES = 5;

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

couple.get("/", async (c) => {
  return c.json({ couple: await loadCouple(c.env.DB, c.get("user").id, Date.now()) });
});

// Create a couple with the caller as the only member, plus a pair code.
couple.post("/", async (c) => {
  const user = c.get("user");
  if (user.displayName === null) return c.json({ error: "name_required" }, 400);
  const db = c.env.DB;
  const now = Date.now();
  if (await findMembership(db, user.id)) return c.json({ error: "already_in_couple" }, 409);

  const coupleId = crypto.randomUUID();
  for (let attempt = 0; ; attempt++) {
    try {
      await db.batch([
        db.prepare("DELETE FROM pair_codes WHERE expires_at <= ?").bind(now),
        db.prepare("INSERT INTO couples (id, start_date, created_by, created_at) VALUES (?, NULL, ?, ?)").bind(coupleId, user.id, now),
        db.prepare("INSERT INTO couple_members (couple_id, user_id, joined_at) VALUES (?, ?, ?)").bind(coupleId, user.id, now),
        db
          .prepare("INSERT INTO pair_codes (code, couple_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
          .bind(generatePairCode(), coupleId, now + PAIR_CODE_TTL, now),
      ]);
      break;
    } catch (err) {
      if (isUniqueViolation(err, "couple_members.user_id")) return c.json({ error: "already_in_couple" }, 409);
      if (!isUniqueViolation(err, "pair_codes.code") || attempt + 1 >= CODE_RETRIES) throw err;
    }
  }
  return c.json({ couple: await loadCouple(db, user.id, now) }, 201);
});

// New code for a couple that is still waiting, only once its code has expired.
couple.post("/code", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const now = Date.now();
  const mine = await findMembership(db, user.id);
  if (!mine) return c.json({ error: "not_in_couple" }, 404);
  if (mine.memberCount > 1) return c.json({ error: "already_paired" }, 409);

  for (let attempt = 0; ; attempt++) {
    try {
      const [, inserted] = await db.batch([
        // Clears this couple's code too once it has expired.
        db.prepare("DELETE FROM pair_codes WHERE expires_at <= ?").bind(now),
        // Only while still alone, in case the partner joined in the meantime. A code that is
        // still valid survives the delete, so UNIQUE (couple_id) refuses the insert.
        db
          .prepare(
            `INSERT INTO pair_codes (code, couple_id, expires_at, created_at)
             SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) = 1`,
          )
          .bind(generatePairCode(), mine.coupleId, now + PAIR_CODE_TTL, now, mine.coupleId),
      ]);
      if (!inserted?.meta.changes) return c.json({ error: "already_paired" }, 409);
      break;
    } catch (err) {
      if (isUniqueViolation(err, "pair_codes.couple_id")) return c.json({ error: "code_still_valid" }, 409);
      if (!isUniqueViolation(err, "pair_codes.code") || attempt + 1 >= CODE_RETRIES) throw err;
    }
  }
  return c.json({ couple: await loadCouple(db, user.id, now) });
});

couple.post("/join", async (c) => {
  const user = c.get("user");
  if (user.displayName === null) return c.json({ error: "name_required" }, 400);
  const db = c.env.DB;
  const now = Date.now();
  const body = await readJson(c.req.raw);
  const code = typeof body?.code === "string" ? normalizePairCode(body.code) : "";
  // A malformed value cannot match any code, so it does not count as a guess.
  if (!isPairCode(code)) return c.json({ error: "pair_code_invalid" }, 400);

  const mine = await findMembership(db, user.id);
  if (mine && mine.memberCount > 1) return c.json({ error: "already_paired" }, 409);

  const reservation = await reserveJoinAttempt(db, user.id, now);
  if (!reservation.ok) return c.json({ error: "rate_limited", retryAfter: reservation.retryAfter }, 429);
  const release = () => releaseJoinAttempt(db, reservation.id);

  // Failed guesses keep their reservation and count towards the limit.
  const target = await db
    .prepare("SELECT couple_id, expires_at FROM pair_codes WHERE code = ?")
    .bind(code)
    .first<{ couple_id: string; expires_at: number }>();
  if (!target) return c.json({ error: "pair_code_invalid" }, 400);
  if (mine && target.couple_id === mine.coupleId) {
    await release();
    return c.json({ error: "own_pair_code" }, 400);
  }
  if (target.expires_at <= now) return c.json({ error: "pair_code_expired" }, 400);

  // One transaction: the conditions are re-checked inside each statement, so a code used or
  // regenerated in the meantime, or a couple that just filled up, makes the insert a no-op.
  const live = "EXISTS (SELECT 1 FROM pair_codes WHERE code = ? AND couple_id = ? AND expires_at > ?)";
  const roomLeft = "(SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) < 2";
  const statements: D1PreparedStatement[] = [];
  if (mine) {
    // A caller who is still waiting with an own code leaves that empty couple for this one.
    statements.push(
      db
        .prepare(
          `DELETE FROM couples WHERE id = ? AND (SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) = 1
           AND ${live} AND ${roomLeft}`,
        )
        .bind(mine.coupleId, mine.coupleId, code, target.couple_id, now, target.couple_id),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO couple_members (couple_id, user_id, joined_at) SELECT ?, ?, ? WHERE ${live} AND ${roomLeft}`,
      )
      .bind(target.couple_id, user.id, now, code, target.couple_id, now, target.couple_id),
    db
      .prepare(
        "DELETE FROM pair_codes WHERE code = ? AND EXISTS (SELECT 1 FROM couple_members WHERE couple_id = ? AND user_id = ?)",
      )
      .bind(code, target.couple_id, user.id),
  );

  let joined = false;
  try {
    const results = await db.batch(statements);
    joined = Boolean(results[statements.length - 2]?.meta.changes);
  } catch (err) {
    if (!isUniqueViolation(err, "couple_members.user_id")) throw err;
    // The caller's own couple got a partner in the meantime.
    await release();
    return c.json({ error: "already_paired" }, 409);
  }
  await release();
  if (!joined) {
    const full = await db
      .prepare("SELECT COUNT(*) AS n FROM couple_members WHERE couple_id = ?")
      .bind(target.couple_id)
      .first<number>("n");
    return full !== null && full >= 2
      ? c.json({ error: "couple_full" }, 409)
      : c.json({ error: "pair_code_invalid" }, 400);
  }
  return c.json({ couple: await loadCouple(db, user.id, now) });
});

// Either partner sets or changes the first day together.
couple.patch("/", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const body = await readJson(c.req.raw);
  const startDate = body?.startDate;
  // The client limits the picker to the device's today; the server allows the furthest zone's today.
  if (!isValidDay(startDate) || startDate > latestDay(Date.now())) {
    return c.json({ error: "invalid_start_date" }, 400);
  }
  const res = await db
    .prepare("UPDATE couples SET start_date = ? WHERE id = (SELECT couple_id FROM couple_members WHERE user_id = ?)")
    .bind(startDate, user.id)
    .run();
  if (!res.meta.changes) return c.json({ error: "not_in_couple" }, 404);
  return c.json({ couple: await loadCouple(db, user.id, Date.now()) });
});
