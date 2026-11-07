CREATE TABLE garden_days (
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  swaps INTEGER NOT NULL DEFAULT 0,
  swapped_cards TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(swapped_cards)),
  flipped INTEGER NOT NULL DEFAULT 0 CHECK (flipped IN (0, 1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (couple_id, day)
);
CREATE INDEX garden_days_flipped ON garden_days(couple_id, day) WHERE flipped = 1;

CREATE TABLE garden_answers (
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT CHECK (body IS NULL OR length(body) BETWEEN 1 AND 1000),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  flipped_day TEXT DEFAULT NULL,
  edited_after_flip INTEGER NOT NULL DEFAULT 0 CHECK (edited_after_flip IN (0, 1)),
  PRIMARY KEY (couple_id, card_id, round, user_id)
);
CREATE INDEX garden_answers_user ON garden_answers(user_id);

CREATE TABLE garden_growth (
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  PRIMARY KEY (couple_id, deck_id, day)
);
