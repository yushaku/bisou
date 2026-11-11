-- Kind notes ("Lời nhắn nhỏ"). Times are epoch ms; states are derived (ADR 0009).
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  writer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  happened TEXT NOT NULL CHECK (length(happened) BETWEEN 1 AND 500),
  feel TEXT NOT NULL CHECK (length(feel) BETWEEN 1 AND 500),
  need TEXT NOT NULL CHECK (length(need) BETWEEN 1 AND 500),
  hope TEXT NOT NULL CHECK (length(hope) BETWEEN 1 AND 500),
  pick TEXT CHECK (pick IN ('try', 'talk', 'differ')),
  line TEXT NOT NULL DEFAULT '' CHECK (length(line) <= 500),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sent_at INTEGER,
  opened_at INTEGER,
  closed_at INTEGER,
  notified_at INTEGER,
  reminded_at INTEGER,
  CHECK (writer_id <> recipient_id),
  CHECK (opened_at IS NULL OR sent_at IS NOT NULL),
  CHECK (closed_at IS NULL OR opened_at IS NOT NULL),
  CHECK ((closed_at IS NULL) = (pick IS NULL))
);
-- Open notes only; closed notes are read through their journal entry.
CREATE INDEX notes_writer ON notes (writer_id, created_at, id) WHERE closed_at IS NULL;
CREATE INDEX notes_recipient ON notes (recipient_id, sent_at, id) WHERE closed_at IS NULL;
-- 07:00 claims: notes sent in quiet hours, and unopened notes due a reminder.
CREATE INDEX notes_held ON notes (sent_at) WHERE notified_at IS NULL;
CREATE INDEX notes_unopened ON notes (sent_at) WHERE reminded_at IS NULL AND opened_at IS NULL;
-- A closed note's journal entry; deleting the note deletes the entry.
ALTER TABLE journal_entries ADD COLUMN note_id TEXT REFERENCES notes (id) ON DELETE CASCADE;
CREATE UNIQUE INDEX journal_entries_note ON journal_entries (note_id) WHERE note_id IS NOT NULL;
