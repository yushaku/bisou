export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const OTP_TTL = 10 * MINUTE;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MIN_INTERVAL = 60 * SECOND;
export const OTP_MAX_PER_HOUR = 5;

export const PAIR_CODE_TTL = 24 * HOUR;
/** Failed join attempts (wrong or expired code) allowed per user per rolling hour. */
export const JOIN_MAX_FAILED_PER_HOUR = 10;
export { MAX_UTC_OFFSET } from "../../shared/days";

export const PENDING_PHOTO_TTL = 24 * HOUR;
export const MAX_PENDING_PHOTOS_PER_USER = 12;

export const SESSION_TTL = 90 * DAY;
/** Extend the session when less than this much time is left. */
export const SESSION_REFRESH_BELOW = 60 * DAY;
