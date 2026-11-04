import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { User } from "../../shared/types";
import type { AppEnv, Env, SessionInfo } from "../env";
import { generateSessionToken, sha256Hex } from "./crypto";
import { SESSION_REFRESH_BELOW, SESSION_TTL } from "./time";
import { rowToUser, type UserRow } from "./users";

export const SESSION_COOKIE = "bisou_session";

/** Persistent cookie so the session survives closing an installed iOS PWA. */
export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL / 1000,
    expires: new Date(Date.now() + SESSION_TTL),
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true, httpOnly: true, sameSite: "Lax" });
}

export function readSessionToken(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE) || undefined;
}

export async function createSession(env: Env, userId: string, now = Date.now()): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, userId, now, now + SESSION_TTL)
    .run();
  return token;
}

export interface LoadedSession {
  user: User;
  session: SessionInfo;
  /** True when the expiry was pushed forward and the cookie must be sent again. */
  refreshed: boolean;
}

/** Loads the session for a raw token, deleting it when expired and sliding it when due. */
export async function loadSession(env: Env, token: string, now = Date.now()): Promise<LoadedSession | null> {
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.expires_at AS session_expires_at, u.id, u.email, u.display_name, u.locale, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
  )
    .bind(tokenHash)
    .first<UserRow & { session_expires_at: number }>();
  if (!row) return null;
  if (row.session_expires_at <= now) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  let expiresAt = row.session_expires_at;
  let refreshed = false;
  if (expiresAt - now < SESSION_REFRESH_BELOW) {
    expiresAt = now + SESSION_TTL;
    refreshed = true;
    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?").bind(expiresAt, tokenHash).run();
  }
  return { user: rowToUser(row), session: { tokenHash, expiresAt }, refreshed };
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}
