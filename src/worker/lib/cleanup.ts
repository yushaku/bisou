import type { Env } from "../env";
import { photoKeys } from "./photos";
import { HOUR, PENDING_PHOTO_TTL } from "./time";

/**
 * Rate limit windows: otp_requests (routes/auth.ts) and join_attempts (lib/couples.ts) both
 * count rows of the last rolling hour, so older rows no longer matter.
 */
export const RATE_LIMIT_WINDOW = HOUR;

export interface CleanupCounts {
  otp_codes: number;
  sessions: number;
  otp_requests: number;
  join_attempts: number;
  pair_codes: number;
}

/**
 * Deletes expired rows in one D1 batch (one transaction). Every WHERE column has an index
 * (0002_couples.sql, 0003_cleanup_indexes.sql), so each delete is a SEARCH, not a SCAN.
 * Only pair codes are removed from the pairing tables: couples and members stay.
 */
export async function runCleanup(db: D1Database, now: number): Promise<CleanupCounts> {
  const windowStart = now - RATE_LIMIT_WINDOW;
  const [otpCodes, sessions, otpRequests, joinAttempts, pairCodes] = await db.batch([
    db.prepare("DELETE FROM otp_codes WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM otp_requests WHERE created_at <= ?").bind(windowStart),
    db.prepare("DELETE FROM join_attempts WHERE created_at <= ?").bind(windowStart),
    db.prepare("DELETE FROM pair_codes WHERE expires_at <= ?").bind(now),
  ]);
  return {
    otp_codes: otpCodes?.meta.changes ?? 0,
    sessions: sessions?.meta.changes ?? 0,
    otp_requests: otpRequests?.meta.changes ?? 0,
    join_attempts: joinAttempts?.meta.changes ?? 0,
    pair_codes: pairCodes?.meta.changes ?? 0,
  };
}

export async function sweepPhotos(env: Env, now: number): Promise<number> {
  // Expire the selected rows atomically so an already validated save cannot attach them during R2 deletion.
  const { results: rows } = await env.DB.prepare(`UPDATE photos SET created_at = 0
    WHERE id IN (SELECT id FROM photos WHERE entry_id IS NULL AND wish_id IS NULL AND created_at <= ? LIMIT 500)
    AND entry_id IS NULL AND wish_id IS NULL RETURNING id, couple_id`)
    .bind(now - PENDING_PHOTO_TTL).all<{ id: string; couple_id: string }>();
  if (!rows.length) return 0;
  await env.PHOTOS.delete(rows.flatMap(photoKeys));
  const deletes = [];
  // D1 allows at most 100 bound parameters per statement.
  for (let offset = 0; offset < rows.length; offset += 100) {
    const ids = rows.slice(offset, offset + 100).map((row) => row.id);
    deletes.push(env.DB.prepare(`DELETE FROM photos WHERE id IN (${ids.map(() => "?").join(",")}) AND entry_id IS NULL AND wish_id IS NULL`).bind(...ids));
  }
  const results = await env.DB.batch(deletes);
  return results.reduce((count, result) => count + result.meta.changes, 0);
}
