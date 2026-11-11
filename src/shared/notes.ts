import type { ApiError, NoteInput } from "./types";
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
