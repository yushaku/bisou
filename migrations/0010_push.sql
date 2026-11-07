CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (length(endpoint) <= 2048),
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  journal INTEGER NOT NULL CHECK (journal IN (0, 1)),
  reminders INTEGER NOT NULL CHECK (reminders IN (0, 1)),
  journal_slot TEXT,
  reminder_slot TEXT,
  failures INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_success_at INTEGER,
  CHECK (journal = 1 OR reminders = 1)
);
CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id, created_at);
CREATE INDEX push_subscriptions_reminders ON push_subscriptions(reminders, user_id);
CREATE INDEX journal_entries_created ON journal_entries(created_at);
