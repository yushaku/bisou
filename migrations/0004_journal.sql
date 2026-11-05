CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  body TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'partner' CHECK (source IN ('partner', 'wish')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX journal_entries_feed ON journal_entries (couple_id, entry_date DESC, created_at DESC, id DESC);
-- shortcut: users cannot be deleted yet, add an author_id index with account deletion.

-- Each photo has full and thumb objects at couples/<couple_id>/photos/<id>/<size>.
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  uploader_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  entry_id TEXT REFERENCES journal_entries (id) ON DELETE SET NULL,
  position INTEGER CHECK (position IS NULL OR position BETWEEN 0 AND 3),
  created_at INTEGER NOT NULL
);
-- Positions are not unique because an edit rewrites them one photo at a time.
-- Exclude pending rows so the sweep uses photos_unattached for its age range.
CREATE INDEX photos_entry ON photos (entry_id, position) WHERE entry_id IS NOT NULL;
CREATE INDEX photos_uploader ON photos (uploader_id, entry_id);
CREATE INDEX photos_couple ON photos (couple_id);
CREATE INDEX photos_unattached ON photos (created_at) WHERE entry_id IS NULL;
