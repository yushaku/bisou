import type { Locale, User } from "../shared/types";

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  /** "development" locally (from .dev.vars), "production" otherwise. */
  ENVIRONMENT?: string;
  /** Optional fixed login code for local development only. */
  DEV_LOGIN_CODE?: string;
  /** Secret: HMAC key for one-time codes. */
  OTP_PEPPER?: string;
  /** Secret: Resend API key. Missing locally, then codes are logged. */
  RESEND_API_KEY?: string;
  /** Secret: P-256 VAPID private JWK JSON. */
  VAPID_PRIVATE_KEY?: string;
}

export interface SessionInfo {
  tokenHash: string;
  expiresAt: number;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    user: User;
    session: SessionInfo;
  };
}

export type { Locale };
