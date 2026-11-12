-- Existing drafts keep their manual reread-and-send flow.
ALTER TABLE notes ADD COLUMN scheduled_at INTEGER;
CREATE INDEX notes_scheduled ON notes (scheduled_at) WHERE sent_at IS NULL AND scheduled_at IS NOT NULL;
