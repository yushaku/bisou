# ADR 0004: Journal photos are uploaded first as two square renditions and kept in private R2 under the couple

Status: proposed (November 2026)

## Context
Journal entries carry up to 4 photos, each a square the author frames ([journal spec](../product/journal.md), R18). The Worker has 10 ms CPU per request and cannot decode images; the client crops and compresses. Phones upload slowly and often fail midway, and the compose sheet must show progress and retry per photo. Feed cards need small images, the viewer a large one. Photos are private to the couple and deleted for good with their entry.

## Decision
- The client crops each photo to the chosen square and encodes two renditions: `full` (at most 1440 px) and `thumb` (at most 480 px), both re-encoded without metadata.
- Upload first: `POST /api/photos` takes one photo as a `multipart/form-data` request with parts `full` and `thumb`, stores both in R2 (binding `PHOTOS`, bucket `bisou`) and returns one photo id that is pending (`photos.entry_id` NULL). Saving or editing an entry attaches pending photos by id in one D1 batch.
- The server reads only headers: magic bytes, no EXIF or XMP blocks, and declared dimensions that are square and within each rendition's limit.
- Pending photos older than 24 h, and photos detached by an edit or delete, are removed from R2 and D1 by the daily cron; edit and delete also remove them right away, the cron is the fallback.
- One D1 row per photo, two R2 objects: `couples/<coupleId>/photos/<photoId>/full` and `.../thumb`, derived from the row, with ids made by the server, never from user input. The keys never change, so photo responses are `private, max-age=31536000, immutable`. Photos are served only by `GET /api/photos/:id/:size` (`full` or `thumb`) after a session and couple check.

## Consequences
- A failed photo is retried alone, both renditions together; there is no half uploaded photo state. The entry save stays a small JSON request.
- Each photo costs two R2 writes and about 300 to 650 KB of storage.
- Orphans exist for up to a day; the cron and a per user cap on pending photos bound them.
- The couple prefix lets a later account or couple deletion list and remove all photos of a couple.
- Header checks do not prove the pixels match; a crafted file only reaches the couple that uploaded it and is served with its allow listed type and `nosniff`.
- A partner's browser may keep a deleted photo in its private HTTP cache until evicted (accepted, R20).
- Changing the renditions, the upload shape or the key layout later means migrating stored objects.
