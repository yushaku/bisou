-- Wish jar: wishes, the partner's secret claims, spin times for the daily limit.
-- Additive only. Times are Unix epoch milliseconds; received_on is a plain calendar day.
CREATE TABLE wishes (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  price INTEGER CHECK (price IS NULL OR price > 0),
  link TEXT CHECK (link IS NULL OR length(link) <= 2048),
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'received')),
  received_on TEXT CHECK (received_on IS NULL OR received_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX wishes_owner ON wishes (owner_id, status, created_at, id);
-- shortcut: couples cannot be deleted yet, add a couple_id index with leaving.

-- One claim per wish. wish_id becomes NULL when the owner deletes the wish; the row then
-- carries the title for the claimer's notice (R16), until acknowledged or 30 days after deletion.
CREATE TABLE wish_claims (
  id TEXT PRIMARY KEY,
  wish_id TEXT UNIQUE REFERENCES wishes (id) ON DELETE SET NULL,
  claimer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  gone_title TEXT,
  gone_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX wish_claims_claimer ON wish_claims (claimer_id, created_at);
CREATE INDEX wish_claims_gone ON wish_claims (gone_at) WHERE wish_id IS NULL;

-- Spin times only, never which jar or wish (R24); rows older than 24 h are deleted.
CREATE TABLE wish_spins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX wish_spins_user_created ON wish_spins (user_id, created_at);
CREATE INDEX wish_spins_created_at ON wish_spins (created_at);

-- A wish photo is a photos row with wish_id set. Pending now means entry_id and wish_id both NULL.
ALTER TABLE photos ADD COLUMN wish_id TEXT REFERENCES wishes (id) ON DELETE SET NULL;
-- R6: one photo per wish; the sweep index excludes both kinds of attachment.
CREATE UNIQUE INDEX photos_wish ON photos (wish_id) WHERE wish_id IS NOT NULL;
CREATE INDEX photos_pending ON photos (created_at) WHERE entry_id IS NULL AND wish_id IS NULL;
