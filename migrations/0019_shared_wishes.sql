-- Shared wish jar ("Hai đứa"): wishes both partners read and write, owned by the couple (ADR 0017).
-- Additive only. Times are Unix epoch milliseconds; done_on is a plain calendar day.
CREATE TABLE shared_wishes (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples (id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  price INTEGER CHECK (price IS NULL OR price > 0),
  link TEXT CHECK (link IS NULL OR length(link) <= 2048),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  done_on TEXT CHECK (done_on IS NULL OR done_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX shared_wishes_couple ON shared_wishes (couple_id, status, created_at, id);

-- A shared wish photo is a photos row with shared_wish_id set. Pending now means entry_id, wish_id
-- and shared_wish_id all NULL; one photo per shared wish.
ALTER TABLE photos ADD COLUMN shared_wish_id TEXT REFERENCES shared_wishes (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX photos_shared_wish ON photos (shared_wish_id) WHERE shared_wish_id IS NOT NULL;
-- photos_pending (0005) stays: its predicate still covers every pending row, so the sweep keeps using it.
