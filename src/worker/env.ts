import type { User } from "../shared/types";
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
  /** Secret: Resend API key. When absent, only development logs login codes. */
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
    /** The caller's couple, read in the same query as the session so /api/me needs one D1 round trip. */
    coupleId: string | null;
  };
}
