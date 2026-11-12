import { vnDay } from "../../shared/days";
import { notifyNote } from "../lib/notify";
import { entriesWithPhotos, findEntry } from "../lib/journal";
import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { validateClose, validateClosedNote, validateNote, validateNoteDelivery } from "../../shared/notes";
import type { AppEnv } from "../env";
import { noteLists, toWritten, type NoteRow } from "../lib/notes";
type NoteEnv = AppEnv & { Variables: { noteCouple: string; notePartner: string } };
export const notes = new Hono<NoteEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });
notes.use("*", async (c, next) => {
  const mine = await c.env.DB.prepare(`SELECT m.couple_id,
    (SELECT x.user_id FROM couple_members x WHERE x.couple_id = m.couple_id AND x.user_id != m.user_id) AS partner_id
    FROM couple_members m WHERE m.user_id = ?`).bind(c.get("user").id).first<{ couple_id: string; partner_id: string | null }>();
  if (!mine?.partner_id) return c.json({ error: "not_found" }, 404);
  c.set("noteCouple", mine.couple_id); c.set("notePartner", mine.partner_id);
  await next();
});
// shortcut: notes list unpaginated; notes leave on close, add a cursor past ~100 open notes per couple.
notes.get("/", async (c) => c.json(await noteLists(c.env.DB, c.get("user").id, c.get("noteCouple"))));
const save: Handler<NoteEnv> = async (c) => {
  const db = c.env.DB, user = c.get("user").id, couple = c.get("noteCouple"), now = Date.now();
  const updating = c.req.method === "PUT";
  const id = updating ? c.req.param("id")! : crypto.randomUUID();
  // Check ownership before validation so a hidden id behaves like a missing id even with invalid input.
  const current = updating ? await db.prepare("SELECT * FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<NoteRow>() : null;
  if (updating && !current) return c.json({ error: "not_found" }, 404);
  const raw = await c.req.json().catch(() => null);
  const parsed = validateNote(raw);
  if ("error" in parsed) return c.json(parsed, 400);
  const delivery = validateNoteDelivery(raw, now, !updating);
  if ("error" in delivery) return c.json(delivery, 400);
  const changingDelivery = delivery.immediate || delivery.scheduledAt !== undefined;
  if (current?.sent_at != null && changingDelivery) return c.json({ error: "note_sent" }, 409);
  const { happened, feel, need, hope } = parsed.input;
  const statement = updating
    ? db.prepare(`UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ?, scheduled_at = CASE WHEN ? THEN ? ELSE scheduled_at END, sent_at = COALESCE(sent_at, ?) WHERE id = ? AND writer_id = ? AND couple_id = ? AND opened_at IS NULL AND (? = 0 OR sent_at IS NULL) RETURNING *`).bind(happened, feel, need, hope, now, Number(changingDelivery), delivery.scheduledAt ?? null, delivery.immediate ? now : null, id, user, couple, Number(changingDelivery))
    : db.prepare(`INSERT INTO notes (id, couple_id, writer_id, recipient_id, happened, feel, need, hope, created_at, updated_at, scheduled_at, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(id, couple, user, c.get("notePartner"), happened, feel, need, hope, now, now, delivery.scheduledAt ?? null, delivery.immediate ? now : null);
  const row = await statement.first<NoteRow>();
  if (!row) {
    const latest = await db.prepare("SELECT * FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<NoteRow>();
    if (!latest) return c.json({ error: "not_found" }, 404);
    return c.json({ error: changingDelivery ? "note_sent" : "note_opened" }, 409);
  }
  if (delivery.immediate) c.executionCtx.waitUntil(notifyNote(c.env, user, row.recipient_id).catch(() => console.error("[bisou] note push failed")));
  return c.json({ note: toWritten(row) }, updating ? 200 : 201);
};
notes.post("/", limitBody, save);
notes.put("/:id", limitBody, save);
notes.delete("/:id", async (c) => {
  const db = c.env.DB, id = c.req.param("id"), user = c.get("user").id, couple = c.get("noteCouple");
  const removed = await db.prepare("DELETE FROM notes WHERE id = ? AND couple_id = ? AND ((writer_id = ? AND opened_at IS NULL) OR closed_at IS NOT NULL)").bind(id, couple, user).run();
  if (removed.meta.changes) return c.json({ ok: true });
  const row = await db.prepare("SELECT opened_at FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<{ opened_at: number | null }>();
  return row?.opened_at != null ? c.json({ error: "note_opened" }, 409) : c.json({ error: "not_found" }, 404);
});

export const OPEN_NOTE_SQL = `UPDATE notes SET opened_at = COALESCE(opened_at, ?) WHERE id = ? AND recipient_id = ? AND couple_id = ? AND sent_at IS NOT NULL AND closed_at IS NULL RETURNING id, happened, feel, need, hope`;
notes.post("/:id/open", async (c) => {
  const row = await c.env.DB.prepare(OPEN_NOTE_SQL).bind(Date.now(), c.req.param("id"), c.get("user").id, c.get("noteCouple")).first();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ note: { ...row, state: "opened" } });
});

export const CLOSE_NOTE_SQL = "UPDATE notes SET pick = ?, line = ?, closed_at = ?, updated_at = ? WHERE id = ? AND recipient_id = ? AND couple_id = ? AND opened_at IS NOT NULL AND closed_at IS NULL";
export const CLOSE_ENTRY_SQL = `INSERT INTO journal_entries (id, couple_id, author_id, entry_date, body, note_id, created_at, updated_at) SELECT ?, couple_id, writer_id, ?, '', id, ?, ? FROM notes WHERE id = ? AND recipient_id = ? AND couple_id = ? AND closed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_entries WHERE note_id = ?)`;
notes.post("/:id/close", limitBody, async (c) => {
  const db = c.env.DB, id = c.req.param("id"), user = c.get("user").id, couple = c.get("noteCouple"), now = Date.now();
  const parsed = validateClose(await c.req.json().catch(() => null));
  if ("error" in parsed) {
    const visible = await db.prepare("SELECT id FROM notes WHERE id = ? AND recipient_id = ? AND couple_id = ? AND opened_at IS NOT NULL AND closed_at IS NULL").bind(id, user, couple).first();
    return visible ? c.json(parsed, 400) : c.json({ error: "not_found" }, 404);
  }
  const entryId = crypto.randomUUID();
  const [closed] = await db.batch([
    db.prepare(CLOSE_NOTE_SQL).bind(parsed.input.pick, parsed.input.line, now, now, id, user, couple),
    db.prepare(CLOSE_ENTRY_SQL).bind(entryId, vnDay(now), now, now, id, user, couple, id),
  ]);
  if (!closed!.meta.changes) return c.json({ error: "not_found" }, 404);
  const row = await findEntry(db, entryId, user);
  const [entry] = await entriesWithPhotos(db, [row!]);
  return c.json({ entry }, 201);
});

export const UPDATE_CLOSED_NOTE_SQL = "UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, pick = ?, line = ?, updated_at = ? WHERE id = ? AND couple_id = ? AND closed_at IS NOT NULL";
notes.put("/:id/closed", limitBody, async (c) => {
  const db = c.env.DB, id = c.req.param("id"), user = c.get("user").id, couple = c.get("noteCouple"), now = Date.now();
  const parsed = validateClosedNote(await c.req.json().catch(() => null), now);
  if ("error" in parsed) {
    const visible = await db.prepare("SELECT id FROM notes WHERE id = ? AND couple_id = ? AND closed_at IS NOT NULL").bind(id, couple).first();
    return visible ? c.json(parsed, 400) : c.json({ error: "not_found" }, 404);
  }
  const { happened, feel, need, hope, pick, line, date } = parsed.input;
  const [updated] = await db.batch([
    db.prepare(UPDATE_CLOSED_NOTE_SQL).bind(happened, feel, need, hope, pick, line, now, id, couple),
    db.prepare("UPDATE journal_entries SET entry_date = ?, updated_at = ? WHERE note_id = ? AND couple_id = ?").bind(date, now, id, couple),
  ]);
  if (!updated!.meta.changes) return c.json({ error: "not_found" }, 404);
  const row = await db.prepare("SELECT id FROM journal_entries WHERE note_id = ? AND couple_id = ?").bind(id, couple).first<{ id: string }>();
  const found = row && await findEntry(db, row.id, user);
  if (!found) return c.json({ error: "not_found" }, 404);
  const [entry] = await entriesWithPhotos(db, [found]);
  return c.json({ entry });
});
