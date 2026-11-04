import { Hono } from "hono";
import { isLocale, type Locale, type RequestCodeResponse } from "../../shared/types";
import type { AppEnv } from "../env";
import { generateOtpCode, hashOtp, verifyOtp } from "../lib/crypto";
import { normalizeEmail } from "../lib/email";
import { sendOtpMail } from "../lib/mail";
import { clearSessionCookie, createSession, deleteSession, readSessionToken, setSessionCookie } from "../lib/session";
import { HOUR, OTP_MAX_ATTEMPTS, OTP_MAX_PER_HOUR, OTP_MIN_INTERVAL, OTP_TTL } from "../lib/time";
import { findOrCreateUser } from "../lib/users";

export const auth = new Hono<AppEnv>();

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function pepper(env: AppEnv["Bindings"]): string {
  if (!env.OTP_PEPPER) throw new Error("OTP_PEPPER is not configured");
  return env.OTP_PEPPER;
}

auth.post("/request", async (c) => {
  const body = await readJson(c.req.raw);
  const email = normalizeEmail(body?.email);
  if (!email) return c.json({ error: "invalid_email" }, 400);
  const lang: Locale = isLocale(body?.lang) ? body.lang : "vi";
  const now = Date.now();
  const db = c.env.DB;

  // Rate limit per email (same rule for known and unknown addresses, so it reveals nothing).
  await db.prepare("DELETE FROM otp_requests WHERE email = ? AND created_at <= ?").bind(email, now - HOUR).run();
  const recent = await db
    .prepare("SELECT COUNT(*) AS n, MAX(created_at) AS last FROM otp_requests WHERE email = ?")
    .bind(email)
    .first<{ n: number; last: number | null }>();
  const count = recent?.n ?? 0;
  const last = recent?.last ?? null;
  if (last !== null && now - last < OTP_MIN_INTERVAL) {
    return c.json({ error: "rate_limited", retryAfter: Math.ceil((last + OTP_MIN_INTERVAL - now) / 1000) }, 429);
  }
  if (count >= OTP_MAX_PER_HOUR) {
    const oldest = await db
      .prepare("SELECT MIN(created_at) AS t FROM otp_requests WHERE email = ?")
      .bind(email)
      .first<{ t: number }>();
    const retryAfter = Math.max(1, Math.ceil(((oldest?.t ?? now) + HOUR - now) / 1000));
    return c.json({ error: "rate_limited", retryAfter }, 429);
  }

  const code = generateOtpCode();
  const codeHash = await hashOtp(pepper(c.env), email, code);
  await db.batch([
    db.prepare("INSERT INTO otp_requests (email, created_at) VALUES (?, ?)").bind(email, now),
    db
      .prepare(
        `INSERT INTO otp_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
         ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         attempts = 0, created_at = excluded.created_at`,
      )
      .bind(email, codeHash, now + OTP_TTL, now),
  ]);

  const result = await sendOtpMail(c.env, email, code, lang);
  const response: RequestCodeResponse = { ok: true };
  if (result === "logged" && c.env.ENVIRONMENT === "development") {
    response.devNote = "RESEND_API_KEY is not set: the code was printed to the dev server log.";
  }
  return c.json(response);
});

auth.post("/verify", async (c) => {
  const body = await readJson(c.req.raw);
  const email = normalizeEmail(body?.email);
  if (!email) return c.json({ error: "invalid_email" }, 400);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return c.json({ error: "invalid_code" }, 400);
  const lang: Locale = isLocale(body?.lang) ? body.lang : "vi";
  const now = Date.now();
  const db = c.env.DB;

  const existing = await db
    .prepare("SELECT expires_at, attempts FROM otp_codes WHERE email = ?")
    .bind(email)
    .first<{ expires_at: number; attempts: number }>();
  if (!existing) return c.json({ error: "code_expired" }, 400);
  if (existing.attempts >= OTP_MAX_ATTEMPTS) return c.json({ error: "too_many_attempts" }, 429);
  if (existing.expires_at <= now) {
    await db.prepare("DELETE FROM otp_codes WHERE email = ?").bind(email).run();
    return c.json({ error: "code_expired" }, 400);
  }

  // Count the attempt before checking, atomically, so parallel guesses cannot exceed the limit.
  const row = await db
    .prepare(
      "UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ? AND attempts < ? RETURNING code_hash, attempts",
    )
    .bind(email, OTP_MAX_ATTEMPTS)
    .first<{ code_hash: string; attempts: number }>();
  if (!row) return c.json({ error: "too_many_attempts" }, 429);

  const ok = await verifyOtp(pepper(c.env), email, code, row.code_hash);
  if (!ok) {
    const attemptsLeft = OTP_MAX_ATTEMPTS - row.attempts;
    if (attemptsLeft <= 0) return c.json({ error: "too_many_attempts" }, 429);
    return c.json({ error: "invalid_code", attemptsLeft }, 400);
  }

  const consumed = await db
    .prepare("DELETE FROM otp_codes WHERE email = ? AND code_hash = ? RETURNING email")
    .bind(email, row.code_hash)
    .first();
  if (!consumed) return c.json({ error: "code_expired" }, 400);

  const user = await findOrCreateUser(c.env, email, lang, now);
  const token = await createSession(c.env, user.id, now);
  setSessionCookie(c, token);
  return c.json({ user });
});

auth.post("/logout", async (c) => {
  const token = readSessionToken(c);
  if (token) await deleteSession(c.env, token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});
