import type { Env } from "../env";
import { notifyNote } from "./notify";
import type { NoteInput, NoteLists, NotePick, ReceivedNote, WrittenNote } from "../../shared/types";
export interface NoteRow extends NoteInput {
  id: string; couple_id: string; writer_id: string; recipient_id: string;
  scheduled_at: number | null; created_at: number; updated_at: number; sent_at: number | null; opened_at: number | null;
  closed_at: number | null; reminded_at: number | null;
  pick: NotePick | null; line: string;
}
const parts = (row: NoteInput): NoteInput => ({ happened: row.happened, feel: row.feel, need: row.need, hope: row.hope });
export function toWritten(row: NoteRow): WrittenNote {
  return { id: row.id, ...parts(row), state: row.opened_at !== null ? "opened" : row.sent_at !== null ? "sent" : "draft", ...(row.scheduled_at !== null ? { scheduledAt: row.scheduled_at } : {}) };
}
export function toReceived(row: NoteRow): ReceivedNote {
  return row.opened_at === null ? { id: row.id, state: "waiting" } : { id: row.id, state: "opened", ...parts(row) };
}
export const WRITTEN_NOTES_SQL = "SELECT * FROM notes WHERE writer_id = ? AND couple_id = ? AND closed_at IS NULL ORDER BY created_at DESC, id DESC";
export const RECEIVED_NOTES_SQL = `SELECT id, opened_at, sent_at,
  CASE WHEN opened_at IS NOT NULL THEN happened END AS happened,
  CASE WHEN opened_at IS NOT NULL THEN feel END AS feel,
  CASE WHEN opened_at IS NOT NULL THEN need END AS need,
  CASE WHEN opened_at IS NOT NULL THEN hope END AS hope
  FROM notes WHERE recipient_id = ? AND couple_id = ? AND sent_at IS NOT NULL AND closed_at IS NULL ORDER BY sent_at, id`;
export async function noteLists(db: D1Database, user: string, couple: string): Promise<NoteLists> {
  const [written, received] = await db.batch<NoteRow>([
    db.prepare(WRITTEN_NOTES_SQL).bind(user, couple), db.prepare(RECEIVED_NOTES_SQL).bind(user, couple),
  ]);
  return { fromMe: written!.results.map(toWritten), toMe: received!.results.sort((a, b) =>
    Number(a.opened_at !== null) - Number(b.opened_at !== null) ||
    (a.opened_at !== null && b.opened_at !== null ? a.opened_at - b.opened_at : 0) || 0).map(toReceived) };
}

export async function sendScheduledNotes(env: Env, now: number): Promise<void> {
  const { results } = await env.DB.prepare(`UPDATE notes SET sent_at = ?, updated_at = ?
    WHERE sent_at IS NULL AND scheduled_at <= ? RETURNING writer_id, recipient_id`).bind(now, now, now)
    .all<{ writer_id: string; recipient_id: string }>();
  for (const row of results) {
    try { await notifyNote(env, row.writer_id, row.recipient_id); }
    catch { console.error("[bisou] scheduled note push failed"); }
  }
}
