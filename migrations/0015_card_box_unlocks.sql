CREATE TABLE card_box_unlocks (
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  box_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (couple_id, box_id)
);
