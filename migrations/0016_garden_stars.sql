-- Shared by the couple; who starred is never stored.
CREATE TABLE garden_stars (
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  starred_at INTEGER NOT NULL,
  PRIMARY KEY (couple_id, card_id)
);
