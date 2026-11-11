import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { NOTE_COOLDOWN, validateNote } from "../../shared/notes";
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
  const updating = c.req.method === "PUT", sending = c.req.path.endsWith("/send");
  const id = updating || sending ? c.req.param("id")! : crypto.randomUUID();
  // Check ownership before validation so a hidden id behaves like a missing id even with invalid input.
  const current = updating || sending ? await db.prepare("SELECT * FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<NoteRow>() : null;
  if ((updating || sending) && !current) return c.json({ error: "not_found" }, 404);
  const parsed = validateNote(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json(parsed, 400);
  const { happened, feel, need, hope } = parsed.input;
  const statement = sending
    ? db.prepare(`UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ?, sent_at = ? WHERE id = ? AND writer_id = ? AND couple_id = ? AND sent_at IS NULL AND created_at <= ? RETURNING *`).bind(happened, feel, need, hope, now, now, id, user, couple, now - NOTE_COOLDOWN)
    : updating
    ? db.prepare(`UPDATE notes SET happened = ?, feel = ?, need = ?, hope = ?, updated_at = ? WHERE id = ? AND writer_id = ? AND couple_id = ? AND opened_at IS NULL RETURNING *`).bind(happened, feel, need, hope, now, id, user, couple)
    : db.prepare(`INSERT INTO notes (id, couple_id, writer_id, recipient_id, happened, feel, need, hope, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(id, couple, user, c.get("notePartner"), happened, feel, need, hope, now, now);
  const row = await statement.first<NoteRow>();
  if (!row) {
    const latest = await db.prepare("SELECT * FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<NoteRow>();
    if (!latest) return c.json({ error: "not_found" }, 404);
    return c.json({ error: sending ? latest.sent_at !== null ? "note_sent" : "note_cooling" : "note_opened" }, 409);
  }
  return c.json({ note: toWritten(row) }, updating || sending ? 200 : 201);
};
notes.post("/", limitBody, save);
notes.put("/:id", limitBody, save);
notes.post("/:id/send", limitBody, save);
notes.delete("/:id", async (c) => {
  const db = c.env.DB, id = c.req.param("id"), user = c.get("user").id, couple = c.get("noteCouple");
  const removed = await db.prepare("DELETE FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND opened_at IS NULL").bind(id, user, couple).run();
  if (removed.meta.changes) return c.json({ ok: true });
  const row = await db.prepare("SELECT opened_at FROM notes WHERE id = ? AND writer_id = ? AND couple_id = ? AND closed_at IS NULL").bind(id, user, couple).first<{ opened_at: number | null }>();
  return row?.opened_at != null ? c.json({ error: "note_opened" }, 409) : c.json({ error: "not_found" }, 404);
});
