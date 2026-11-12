import { isValidDay, latestDay } from "./days";
import type { ApiError, CloseInput, ClosedNoteInput, NoteInput, NotePick } from "./types";
export const NOTE_FIELD_MAX = 500;
export const NOTE_LINE_MAX = 500;
export const NOTE_COOLDOWN = 8 * 3_600_000;
export const NOTE_PICKS = ["try", "talk", "differ"] as const;
export const NOTE_FIELDS = ["happened", "feel", "need", "hope"] as const;
export function validateNote(raw: unknown): { input: NoteInput } | ApiError {
  if (!raw || typeof raw !== "object") return { error: "invalid_body" };
  const data = raw as Record<string, unknown>;
  if ("photoIds" in data) return { error: "invalid_body" };
  const input = {} as NoteInput;
  for (const field of NOTE_FIELDS) {
    const text = data[field];
    if (typeof text !== "string") return { error: "invalid_body" };
    if (!text.replace(/\p{Cf}/gu, "").trim()) return { error: "note_empty" };
    if (/[\p{Cc}\u202a-\u202e\u2066-\u2069]/u.test(text.replace(/[\n\r\t]/g, ""))) return { error: "invalid_body" };
    if (Array.from(text.trim()).length > NOTE_FIELD_MAX) return { error: "note_text_too_long" };
    input[field] = text.trim();
  }
  return { input };
}

export function validateClose(raw: unknown): { input: CloseInput } | ApiError {
  if (!raw || typeof raw !== "object") return { error: "invalid_body" };
  const { pick, line = "" } = raw as Record<string, unknown>;
  if (!NOTE_PICKS.includes(pick as NotePick) || typeof line !== "string") return { error: "invalid_body" };
  if (/[\p{Cc}\u202a-\u202e\u2066-\u2069]/u.test(line.replace(/[\n\r\t]/g, ""))) return { error: "invalid_body" };
  if (Array.from(line.trim()).length > NOTE_LINE_MAX) return { error: "note_text_too_long" };
  return { input: { pick: pick as NotePick, line: line.trim() } };
}

export function validateClosedNote(raw: unknown, now: number): { input: ClosedNoteInput } | ApiError {
  const parts = validateNote(raw);
  if ("error" in parts) return parts;
  const close = validateClose(raw);
  if ("error" in close) return close;
  const date = (raw as Record<string, unknown>).date;
  if (!isValidDay(date) || date > latestDay(now)) return { error: "invalid_entry_date" };
  return { input: { ...parts.input, ...close.input, date } };
}

export function validateNoteDelivery(raw: unknown, now: number): { scheduledAt?: number; immediate: boolean } | ApiError {
  const { delivery, sendAt } = raw as Record<string, unknown>;
  if (delivery === undefined) return { immediate: false };
  if (delivery === "now") return { immediate: true };
  if (delivery === "eightHours") return { immediate: false, scheduledAt: now + NOTE_COOLDOWN };
  if (delivery !== "custom" || typeof sendAt !== "number" || !Number.isSafeInteger(sendAt) || sendAt <= now || sendAt > 8.64e15) return { error: "invalid_note_schedule" };
  return { immediate: false, scheduledAt: sendAt };
}
