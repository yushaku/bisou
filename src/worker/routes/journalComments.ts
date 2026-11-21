import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { COMMENT_TEXT_MAX } from "../../shared/journal";
import type { JournalComment } from "../../shared/types";
import type { AppEnv } from "../env";
import { notifyJournal } from "../lib/notify";

export const journalComments = new Hono<AppEnv & { Variables: { journalCoupleId: string } }>();
const limitCommentBody = bodyLimit({
  maxSize: 16 * 1024,
  onError: (c) => c.json({ error: "body_too_large" }, 413),
});

const SCOPED_ENTRY = "SELECT id FROM journal_entries WHERE id = ? AND couple_id = ?";
const OWN_COMMENT = `id = ? AND entry_id IN (${SCOPED_ENTRY}) AND author_id = ?`;

function commentText(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || !("text" in raw) || typeof raw.text !== "string") return null;
  const text = raw.text.trim();
  return text && !text.includes("\0") && Array.from(text).length <= COMMENT_TEXT_MAX ? text : null;
}

journalComments.use("*", async (c, next) => {
  const entry = await c.env.DB.prepare(SCOPED_ENTRY).bind(c.req.param("entryId"), c.get("journalCoupleId")).first();
  if (!entry) return c.json({ error: "not_found" }, 404);
  await next();
});

journalComments.get("/", async (c) => {
  const { results: comments } = await c.env.DB.prepare(
    `SELECT jc.id, jc.body AS text, jc.author_id AS authorId, u.display_name AS authorName, jc.created_at AS createdAt
    FROM journal_comments jc JOIN users u ON u.id = jc.author_id
    WHERE jc.entry_id = ? ORDER BY jc.created_at, jc.rowid`,
  )
    .bind(c.req.param("entryId"))
    .all<JournalComment>();
  return c.json({ comments });
});

journalComments.post("/", limitCommentBody, async (c) => {
  const text = commentText(await c.req.json().catch(() => null));
  if (text === null) return c.json({ error: "invalid_body" }, 400);
  const user = c.get("user");
  const coupleId = c.get("journalCoupleId");
  const entryId = c.req.param("entryId");
  const comment = {
    id: crypto.randomUUID(),
    text,
    authorId: user.id,
    authorName: user.displayName,
    createdAt: Date.now(),
  };
  const result = await c.env.DB.prepare(
    `INSERT INTO journal_comments (id, entry_id, author_id, body, created_at)
    SELECT ?, id, ?, ?, ? FROM (${SCOPED_ENTRY})`,
  )
    .bind(comment.id, user.id, text, comment.createdAt, entryId, coupleId)
    .run();
  if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  c.executionCtx.waitUntil(notifyJournal(c.env, coupleId, user.id, entryId));
  return c.json({ comment }, 201);
});

journalComments.use("/:commentId", async (c, next) => {
  const comment = await c.env.DB.prepare("SELECT author_id FROM journal_comments WHERE id = ? AND entry_id = ?")
    .bind(c.req.param("commentId"), c.req.param("entryId"))
    .first<{ author_id: string }>();
  if (!comment) return c.json({ error: "not_found" }, 404);
  if (comment.author_id !== c.get("user").id) return c.json({ error: "not_author" }, 403);
  await next();
});

journalComments.put("/:commentId", limitCommentBody, async (c) => {
  const text = commentText(await c.req.json().catch(() => null));
  if (text === null) return c.json({ error: "invalid_body" }, 400);
  const result = await c.env.DB.prepare(`UPDATE journal_comments SET body = ? WHERE ${OWN_COMMENT}`)
    .bind(text, c.req.param("commentId"), c.req.param("entryId"), c.get("journalCoupleId"), c.get("user").id)
    .run();
  if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

journalComments.delete("/:commentId", async (c) => {
  const result = await c.env.DB.prepare(`DELETE FROM journal_comments WHERE ${OWN_COMMENT}`)
    .bind(c.req.param("commentId"), c.req.param("entryId"), c.get("journalCoupleId"), c.get("user").id)
    .run();
  if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});
