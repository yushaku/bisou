import type { EventIcon } from "./events";

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
  birthDate: string | null;
  avatarId: string | null;
  locale: Locale;
  createdAt: number;
}

/** Error codes returned by the API as { error: ApiErrorCode }. */
export type ApiErrorCode =
  | "invalid_answer"
  | "answer_too_long"
  | "already_answered"
  | "swap_locked"
  | "invalid_subscription"
  | "push_unavailable"
  | "body_too_large"
  | "event_title_invalid"
  | "event_date_invalid"
  | "too_many_events"
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
  | "name_required"
  | "already_in_couple"
  | "already_paired"
  | "not_in_couple"
  | "code_still_valid"
  | "pair_code_invalid"
  | "pair_code_expired"
  | "own_pair_code"
  | "couple_full"
  | "invalid_start_date"
  | "invalid_birth_date"
  | "entry_empty"
  | "entry_text_too_long"
  | "invalid_entry_date"
  | "too_many_photos"
  | "photo_invalid"
  | "photo_too_large"
  | "unsupported_photo_type"
  | "too_many_pending_photos"
  | "not_author"
  | "wish_title_invalid"
  | "wish_price_invalid"
  | "wish_link_invalid"
  | "invalid_budget"
  | "already_claimed"
  | "wish_received";

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
  birthDate: string | null;
  avatarId: string | null;
}

export interface CoupleEventInput {
  title: string;
  date: string;
  repeat: "once" | "yearly";
  icon: EventIcon;
}

export interface CoupleEvent extends CoupleEventInput {
  id: string;
  createdAt: number;
}

export interface Couple {
  events: CoupleEvent[];
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

export type PhotoSize = "full" | "thumb";

export interface JournalEntry {
  id: string;
  authorId: string;
  date: string;
  text: string;
  source: "partner" | "wish";
  /** Ordered by position. */
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface JournalPage {
  entries: JournalEntry[];
  nextCursor: string | null;
}

export interface EntryInput {
  date: string;
  text: string;
  photoIds: string[];
}

export interface PhotoUploadResponse {
  photo: { id: string };
}

export type WishPriority = 1 | 2 | 3;

export interface WishInput {
  title: string;
  price: number | null;
  link: string | null;
  priority?: WishPriority;
  photoId: string | null;
}

export interface Wish extends WishInput {
  id: string;
  priority: WishPriority;
  status: "open" | "received";
  receivedOn: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SpinWish {
  id: string;
  title: string;
  price: number;
  link: string | null;
  photoId: string | null;
}

export interface Claim {
  id: string;
  status: "open" | "received" | "gone";
  title: string;
  price: number | null;
  link: string | null;
  photoId: string | null;
  createdAt: number;
}

export interface ReceiveWishInput {
  locale: Locale;
  date: string;
  note: string;
  photoIds: string[];
}

export interface PushDevice {
  endpoint: string;
  journal: boolean;
  reminders: boolean;
}

export interface PushState {
  publicKey: string | null;
  devices: PushDevice[];
}

export interface PushSubscriptionInput extends PushDevice {
  keys: { p256dh: string; auth: string };
}
