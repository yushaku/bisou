import { PAIR_CODE_ALPHABET, PAIR_CODE_LENGTH } from "../../shared/pairCode";
import { earliestDay } from "../../shared/days";
import type { Couple, CoupleEvent } from "../../shared/types";
import { HOUR, JOIN_MAX_FAILED_PER_HOUR } from "./time";

/** Uniform random code from the no look-alike alphabet (rejection sampling avoids modulo bias). */
export function generatePairCode(): string {
  const size = PAIR_CODE_ALPHABET.length;
  const limit = Math.floor(256 / size) * size;
  const out: string[] = [];
  const buf = new Uint8Array(16);
  while (out.length < PAIR_CODE_LENGTH) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit && out.length < PAIR_CODE_LENGTH) out.push(PAIR_CODE_ALPHABET[b % size]!);
    }
  }
  return out.join("");
}

export interface Membership {
  coupleId: string;
  memberCount: number;
}

/** The caller's couple and how many members it has, or null. Always keyed by the session user. */
export async function findMembership(db: D1Database, userId: string): Promise<Membership | null> {
  const row = await db
    .prepare(
      `SELECT m.couple_id AS couple_id, (SELECT COUNT(*) FROM couple_members x WHERE x.couple_id = m.couple_id) AS n
       FROM couple_members m WHERE m.user_id = ?`,
    )
    .bind(userId)
    .first<{ couple_id: string; n: number }>();
  return row ? { coupleId: row.couple_id, memberCount: row.n } : null;
}

/** GET /api/couple payload for the session user, in one round trip. */
export async function loadCouple(db: D1Database, userId: string, now: number): Promise<Couple | null> {
  const mine = "(SELECT couple_id FROM couple_members WHERE user_id = ?)";
  const [coupleRes, membersRes, codeRes, eventsRes] = await db.batch([
    db.prepare(`SELECT id, start_date FROM couples WHERE id = ${mine}`).bind(userId),
    db
      .prepare(
        `SELECT u.id AS id, u.display_name AS display_name, u.birth_date AS birth_date, u.avatar_id FROM couple_members m JOIN users u ON u.id = m.user_id
         WHERE m.couple_id = ${mine} ORDER BY m.joined_at, m.rowid`,
      )
      .bind(userId),
    db.prepare(`SELECT code, expires_at FROM pair_codes WHERE couple_id = ${mine} AND expires_at > ?`).bind(userId, now),
    db.prepare(`SELECT id, title, event_date AS date, repeats AS repeat, icon, created_at AS createdAt
      FROM couple_events WHERE couple_id = ${mine} AND (repeats = 'yearly' OR event_date >= ?)`).bind(userId, earliestDay(now)),
  ]);
  const row = (coupleRes?.results as { id: string; start_date: string | null }[] | undefined)?.[0];
  if (!row) return null;
  const members = ((membersRes?.results ?? []) as { id: string; display_name: string | null; birth_date: string | null; avatar_id: string | null }[]).map((m) => ({
    id: m.id,
    displayName: m.display_name,
    birthDate: m.birth_date,
    avatarId: m.avatar_id,
  }));
  const couple: Couple = { id: row.id, startDate: row.start_date, members, events: (eventsRes?.results ?? []) as unknown as CoupleEvent[] };
  const code = (codeRes?.results as { code: string; expires_at: number }[] | undefined)?.[0];
  if (members.length === 1 && code) couple.pendingCode = { code: code.code, expiresAt: code.expires_at };
  return couple;
}

/** True when a D1 error is a UNIQUE or PRIMARY KEY violation on the given "table.column". */
export function isUniqueViolation(err: unknown, column: string): boolean {
  const message = err instanceof Error ? `${err.message} ${String(err.cause ?? "")}` : String(err);
  return message.includes("UNIQUE constraint failed") && message.includes(column);
}

export type AttemptReservation = { ok: true; id: number } | { ok: false; retryAfter: number };

/**
 * Reserves a join attempt before the code is checked: insert first, then count, in one
 * transaction, so parallel guesses cannot exceed the limit. Keep the row when the guess
 * fails; release it when the attempt should not count (success, own code, races).
 */
export async function reserveJoinAttempt(db: D1Database, userId: string, now: number): Promise<AttemptReservation> {
  const [, inserted, counted] = await db.batch([
    db.prepare("DELETE FROM join_attempts WHERE user_id = ? AND created_at <= ?").bind(userId, now - HOUR),
    db.prepare("INSERT INTO join_attempts (user_id, created_at) VALUES (?, ?) RETURNING id").bind(userId, now),
    db.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM join_attempts WHERE user_id = ?").bind(userId),
  ]);
  const id = (inserted?.results as { id: number }[] | undefined)?.[0]?.id;
  const stats = (counted?.results as { n: number; oldest: number }[] | undefined)?.[0];
  if (id === undefined || !stats) throw new Error("join attempt reservation failed");
  if (stats.n > JOIN_MAX_FAILED_PER_HOUR) {
    await releaseJoinAttempt(db, id);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((stats.oldest + HOUR - now) / 1000)) };
  }
  return { ok: true, id };
}

export async function releaseJoinAttempt(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM join_attempts WHERE id = ?").bind(id).run();
}
