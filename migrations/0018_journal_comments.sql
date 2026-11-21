CREATE TABLE journal_comments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entries (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at INTEGER NOT NULL
);
CREATE INDEX journal_comments_entry ON journal_comments (entry_id, created_at);
