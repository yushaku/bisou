CREATE TABLE avatar_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  pending INTEGER NOT NULL DEFAULT 1 CHECK (pending IN (0, 1))
);
CREATE INDEX avatar_uploads_user_created ON avatar_uploads (user_id, created_at);
