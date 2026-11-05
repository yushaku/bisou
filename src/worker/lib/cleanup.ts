import { HOUR } from "./time";

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
