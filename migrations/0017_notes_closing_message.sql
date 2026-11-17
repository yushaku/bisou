-- PO-approved empty-table replacement; refuse to drop notes or linked journal data.
-- D1 rejects TEMP tables; this transactional guard is dropped before commit.
CREATE TABLE IF NOT EXISTS notes_empty_guard (n INTEGER NOT NULL CHECK (n = 0));
INSERT INTO notes_empty_guard SELECT COUNT(*) FROM notes;
INSERT INTO notes_empty_guard SELECT COUNT(*) FROM journal_entries WHERE note_id IS NOT NULL;
PRAGMA defer_foreign_keys = ON;
DROP TABLE notes;
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  writer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  happened TEXT NOT NULL CHECK (length(happened) BETWEEN 1 AND 500),
  feel TEXT NOT NULL CHECK (length(feel) BETWEEN 1 AND 500),
  need TEXT NOT NULL CHECK (length(need) BETWEEN 1 AND 500),
  hope TEXT NOT NULL CHECK (length(hope) BETWEEN 1 AND 500),
  line TEXT CHECK (length(line) BETWEEN 1 AND 500),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sent_at INTEGER,
  opened_at INTEGER,
  closed_at INTEGER,
  reminded_at INTEGER,
  scheduled_at INTEGER,
  CHECK (writer_id <> recipient_id),
  CHECK (opened_at IS NULL OR sent_at IS NOT NULL),
  CHECK (closed_at IS NULL OR opened_at IS NOT NULL),
  CHECK (reminded_at IS NULL OR sent_at IS NOT NULL),
  CHECK ((closed_at IS NULL) = (line IS NULL))
);
CREATE INDEX notes_writer ON notes (writer_id, created_at, id) WHERE closed_at IS NULL;
CREATE INDEX notes_recipient ON notes (recipient_id, sent_at, id) WHERE closed_at IS NULL;
-- 07:00 claims: notes sent in quiet hours, and unopened notes due a reminder.
CREATE INDEX notes_unopened ON notes (sent_at) WHERE reminded_at IS NULL AND opened_at IS NULL;
CREATE INDEX notes_scheduled ON notes (scheduled_at) WHERE sent_at IS NULL AND scheduled_at IS NOT NULL;
PRAGMA defer_foreign_keys = OFF;
DROP TABLE notes_empty_guard;
