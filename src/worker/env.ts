import type { Locale, User } from "../shared/types";
import type { PushJob } from "./lib/pushQueue";

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  /** Queue `bisou`: one job per device, produced and consumed by this Worker (ADR 0010). */
  PUSH_QUEUE: Queue<PushJob>;
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
