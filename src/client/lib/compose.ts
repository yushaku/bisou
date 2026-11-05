// Compose rules for a journal entry, as pure functions shared by the sheet and its tests.
// The server checks the same rules again; these only keep Save honest and messages specific.
import { isValidDay, latestDay, toDayString } from "../../shared/days";
import { ENTRY_PHOTOS_MAX, ENTRY_TEXT_MAX, entryText } from "../../shared/journal";
import type { ApiErrorCode } from "../../shared/types";
import type { MessageKey } from "../i18n/vi";

export type PhotoState = "queued" | "uploading" | "done" | "failed";

/** The newest day an entry may have: today in the earliest time zone (R8). */
export const maxDay = latestDay;

/** The device's today, or the latest allowed day if the device runs ahead of every time zone. */
export function defaultDay(nowMs: number): string {
  const local = toDayString(new Date(nowMs));
  const max = maxDay(nowMs);
  return local < max ? local : max;
}

/** Characters as the server counts them: code points after trimming outer spaces (R4). */
export function textLength(raw: string): number {
  return Array.from(entryText(raw)).length;
}

export type SaveBlock = "tooLong" | "date" | "photos" | "empty";

/** Why Save is off, or null when the entry can be saved; the first reason wins. */
export function saveBlock(
  form: { date: string; text: string; photos: { state: PhotoState }[] },
  nowMs: number,
): SaveBlock | null {
  const length = textLength(form.text);
  if (length > ENTRY_TEXT_MAX) return "tooLong";
  if (!isValidDay(form.date) || form.date > maxDay(nowMs)) return "date";
  if (form.photos.some((p) => p.state !== "done")) return "photos";
  if (length === 0 && form.photos.length === 0) return "empty";
  return null;
}

/** How many of the picked files fit beside the photos already there (R5). */
export function takeRoom(have: number, picked: number): { take: number; refused: boolean } {
  const take = Math.max(0, Math.min(picked, ENTRY_PHOTOS_MAX - have));
  return { take, refused: take < picked };
}

const IN_FLIGHT = 2;

/** Queued photos to start now, in picked order, keeping at most two uploads running. */
export function startable(items: { localId: string; state: PhotoState }[]): string[] {
  const running = items.filter((i) => i.state === "uploading").length;
  return items
    .filter((i) => i.state === "queued")
    .slice(0, Math.max(0, IN_FLIGHT - running))
    .map((i) => i.localId);
}

const SAVE_ERRORS: Partial<Record<ApiErrorCode, MessageKey>> = {
  entry_empty: "compose.emptyHint",
  entry_text_too_long: "compose.tooLong",
  invalid_entry_date: "compose.dateError",
  too_many_photos: "compose.limit",
  photo_invalid: "compose.photoExpired",
  not_author: "compose.notAuthor",
  not_found: "compose.gone",
};

/** Message for a refused save; anything unexpected keeps the form and asks to try again. */
export function saveErrorKey(code: ApiErrorCode | undefined): MessageKey {
  return (code && SAVE_ERRORS[code]) ?? "compose.saveError";
}

const UPLOAD_ERRORS: Partial<Record<ApiErrorCode, MessageKey>> = {
  photo_too_large: "compose.photoTooLarge",
  photo_invalid: "compose.photoRejected",
  unsupported_photo_type: "compose.photoRejected",
  too_many_pending_photos: "compose.photoTooMany",
};

/** Message under a failed photo; network drops and server errors offer retry. */
export function uploadErrorKey(code: ApiErrorCode | undefined): MessageKey {
  return (code && UPLOAD_ERRORS[code]) ?? "compose.photoFailed";
}
