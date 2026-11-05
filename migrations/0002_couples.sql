-- Pairing: couples, their members, live pair codes and failed join attempts for the rate limit.
-- Additive only. Times are Unix epoch milliseconds; start_date is a plain calendar day.

-- created_by is kept for history; it becomes NULL if that account is ever deleted.
CREATE TABLE couples (
  id TEXT PRIMARY KEY,
  start_date TEXT CHECK (start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
-- Lets ON DELETE SET NULL find a deleted user's couples without scanning.
CREATE INDEX couples_created_by ON couples (created_by);

-- UNIQUE user_id: a user belongs to at most one couple. At most 2 rows per couple is
-- enforced by the join statement (INSERT ... WHERE member count < 2) inside one batch.
CREATE TABLE couple_members (
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (couple_id, user_id)
);

-- One live code per couple, single use: deleted when a partner joins or a new code is made.
-- Lookups by couple_id use the index behind UNIQUE (couple_id); no second index needed.
CREATE TABLE pair_codes (
  code TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL UNIQUE REFERENCES couples (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX pair_codes_expires_at ON pair_codes (expires_at);

-- One row per failed join (wrong or expired code), for the per user hourly limit.
-- Rows older than 1 h are deleted on that user's next join.
CREATE TABLE join_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX join_attempts_user_created ON join_attempts (user_id, created_at);
