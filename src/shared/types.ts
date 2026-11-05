// Types shared by the client and the Worker API.

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  locale: Locale;
  createdAt: number;
}

/** Error codes returned by the API as { error: ApiErrorCode }. */
export type ApiErrorCode =
  | "invalid_email"
  | "invalid_body"
  | "rate_limited"
  | "invalid_code"
  | "too_many_attempts"
  | "code_expired"
  | "unauthorized"
  | "forbidden_origin"
  | "not_found"
  | "server_error"
  | "already_in_couple"
  | "already_paired"
  | "not_in_couple"
  | "code_still_valid"
  | "pair_code_invalid"
  | "pair_code_expired"
  | "own_pair_code"
  | "couple_full"
  | "invalid_start_date";

export interface ApiError {
  error: ApiErrorCode;
  /** Seconds until the action is allowed again (rate_limited only). */
  retryAfter?: number;
  /** Attempts left for the current code (invalid_code only). */
  attemptsLeft?: number;
}

export interface RequestCodeResponse {
  ok: true;
  /** Only present when ENVIRONMENT is development and no mail provider is configured. */
  devNote?: string;
}

export const DISPLAY_NAME_MAX = 40;

export interface CoupleMember {
  id: string;
  displayName: string | null;
}

export interface Couple {
  id: string;
  /** First day together, "YYYY-MM-DD", or null until a partner sets it. */
  startDate: string | null;
  /** Ordered by join time: the creator first. */
  members: CoupleMember[];
  /** Live pair code, only while the caller is alone in the couple. */
  pendingCode?: { code: string; expiresAt: number };
}

export interface CoupleResponse {
  couple: Couple | null;
}

export interface MeResponse {
  user: User;
  coupleId: string | null;
}
