import type { Locale, User } from "../shared/types";

export interface Env {
  DB: D1Database;
  /** "development" locally (from .dev.vars), "production" otherwise. */
  ENVIRONMENT?: string;
  /** Secret: HMAC key for one-time codes. */
  OTP_PEPPER?: string;
  /** Secret: Resend API key. Missing locally, then codes are logged. */
  RESEND_API_KEY?: string;
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
