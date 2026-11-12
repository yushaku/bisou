# ADR 0012: Kind notes are delivered at a time the writer chooses, by a minute cron

Status: accepted (November 2026). Supersedes the send, cool-down and push parts of [ADR 0009](0009-kind-notes-gated-in-sql-and-closed-into-journal.md).

## Context
The writer now picks send now, in 8 hours or a custom time ([notes](../product/notes.md) R63 to R68). The mandatory 8-hour wait, the manual reread and send, and quiet hours are gone.

## Decision
- Creating or first scheduling a note requires a delivery choice; `scheduled_at` holds the due time. A draft with no choice is never delivered on its own. `POST /api/notes/:id/send` no longer exists.
- A cron every minute claims due notes with `sent_at IS NULL`, records delivery in `sent_at` and queues one arrival push per note ([ADR 0010](0010-push-sending-through-queues.md)).
- The 07:00 Vietnam run keeps only the reminder claim, on the third Vietnam day after delivery; reminders due together for one writer combine.
- `notified_at`, `push_subscriptions.journal_slot` and the `journal_entries_created` index stay in the schema, unused (migrations are additive only).

## Consequences
- An installed client older than the delivery choice gets 404 or 400 when it sends; reopening the app updates it.
