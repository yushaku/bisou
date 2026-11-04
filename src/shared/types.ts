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
  | "server_error";

export interface ApiError {
  error: ApiErrorCode;
  /** Seconds until a new code can be requested (rate_limited only). */
  retryAfter?: number;
  /** Attempts left for the current code (invalid_code only). */
  attemptsLeft?: number;
}

export interface RequestCodeResponse {
  ok: true;
  /** Only present when ENVIRONMENT is development and no mail provider is configured. */
  devNote?: string;
}

export const DISPLAY_NAME_MAX = 50;
