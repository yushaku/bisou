-- Shared couple events; past one-offs are retained for a future timeline.
CREATE TABLE couple_events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  event_date TEXT NOT NULL CHECK (event_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  repeats TEXT NOT NULL CHECK (repeats IN ('once', 'yearly')),
  icon TEXT NOT NULL CHECK (length(icon) BETWEEN 1 AND 20),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX couple_events_couple ON couple_events (couple_id);
