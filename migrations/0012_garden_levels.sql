ALTER TABLE garden_answers ADD COLUMN response_choice TEXT DEFAULT NULL
  CHECK(response_choice IS NULL OR response_choice IN ('no_details', 'later_not_applicable'));
CREATE TRIGGER garden_response_insert BEFORE INSERT ON garden_answers
  WHEN NEW.body IS NOT NULL AND NEW.response_choice IS NOT NULL
  BEGIN SELECT RAISE(ABORT, 'invalid_response'); END;
CREATE TRIGGER garden_response_update BEFORE UPDATE ON garden_answers
  WHEN NEW.body IS NOT NULL AND NEW.response_choice IS NOT NULL
  BEGIN SELECT RAISE(ABORT, 'invalid_response'); END;

CREATE TABLE garden_levels (
  couple_id TEXT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  initial_level INTEGER CHECK(initial_level BETWEEN 0 AND 4),
  selected_level INTEGER CHECK(selected_level BETWEEN 0 AND 4),
  furthest_level INTEGER CHECK(furthest_level BETWEEN 0 AND 4),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  proposal_kind TEXT CHECK(proposal_kind IN ('placement', 'target', 'revisit')),
  proposal_level INTEGER CHECK(proposal_level BETWEEN 0 AND 4),
  proposer_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  target_agreed INTEGER NOT NULL DEFAULT 0 CHECK(target_agreed IN (0, 1)),
  gate_ids TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(gate_ids) AND json_type(gate_ids) = 'array'),
  CHECK((initial_level IS NULL AND selected_level IS NULL AND furthest_level IS NULL)
    OR (initial_level IS NOT NULL AND selected_level IS NOT NULL AND furthest_level IS NOT NULL
      AND initial_level <= furthest_level AND selected_level <= furthest_level)),
  CHECK((proposal_kind IS NULL AND proposal_level IS NULL AND proposer_id IS NULL)
    OR (proposal_kind IS NOT NULL AND proposal_level IS NOT NULL AND proposer_id IS NOT NULL)),
  CHECK(target_agreed = 0 OR (proposal_kind IS NOT NULL AND proposal_kind = 'target'))
);
