import { isValidDay, latestDay } from "../../shared/days";
import { ENTRY_PHOTOS_MAX, ENTRY_TEXT_MAX, entryText } from "../../shared/journal";
import type { ApiErrorCode, EntryInput, JournalEntry } from "../../shared/types";

export interface EntryRow {
  id: string;
  couple_id: string;
  author_id: string;
  entry_date: string;
  body: string;
  source: JournalEntry["source"];
  created_at: number;
  updated_at: number;
}

export function validateEntry(raw: unknown, now: number): { input: EntryInput } | { error: ApiErrorCode } {
  if (!raw || typeof raw !== "object" || !("date" in raw) || typeof raw.date !== "string"
    || !("text" in raw) || typeof raw.text !== "string" || !("photoIds" in raw)
    || !Array.isArray(raw.photoIds) || !raw.photoIds.every((id): id is string => typeof id === "string")
    || new Set(raw.photoIds).size !== raw.photoIds.length) return { error: "invalid_body" };
  if (!isValidDay(raw.date) || raw.date > latestDay(now)) return { error: "invalid_entry_date" };
  const text = entryText(raw.text);
  if (Array.from(text).length > ENTRY_TEXT_MAX) return { error: "entry_text_too_long" };
  if (raw.photoIds.length > ENTRY_PHOTOS_MAX) return { error: "too_many_photos" };
  if (!text && !raw.photoIds.length) return { error: "entry_empty" };
  return { input: { date: raw.date, text, photoIds: raw.photoIds } };
}

export function readCursor(raw: string): [string, number, string] | null {
  if (raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const value: unknown = JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
    if (!Array.isArray(value) || value.length !== 3 || !isValidDay(value[0])
      || !Number.isSafeInteger(value[1]) || typeof value[2] !== "string") return null;
    return [value[0], value[1], value[2]];
  } catch { return null; }
}

export function entryCursor(row: EntryRow): string {
  return btoa(JSON.stringify([row.entry_date, row.created_at, row.id])).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function entriesWithPhotos(db: D1Database, rows: EntryRow[]): Promise<JournalEntry[]> {
  if (!rows.length) return [];
  const { results } = await db.prepare(`SELECT id, entry_id FROM photos WHERE entry_id IN (${rows.map(() => "?").join(",")}) ORDER BY entry_id, position`)
    .bind(...rows.map((row) => row.id)).all<{ id: string; entry_id: string }>();
  const photos = new Map<string, string[]>();
  for (const photo of results) {
    const ids = photos.get(photo.entry_id) ?? [];
    ids.push(photo.id);
    photos.set(photo.entry_id, ids);
  }
  return rows.map((row) => ({
    id: row.id, authorId: row.author_id, date: row.entry_date, text: row.body, source: row.source,
    photoIds: photos.get(row.id) ?? [], createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}

export function findEntry(db: D1Database, id: string, userId: string): Promise<EntryRow | null> {
  return db.prepare(`SELECT e.* FROM journal_entries e
    WHERE e.id = ? AND e.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?)`)
    .bind(id, userId).first<EntryRow>();
}
