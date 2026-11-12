# ADR 0004: Journal photos are uploaded first as two square renditions and kept in private R2 under the couple

Status: accepted (November 2026)

## Context
Journal entries carry up to 4 photos, each a square the author frames ([journal spec](../product/journal.md), R18). The Worker has 10 ms CPU per request and cannot decode images; the client crops and compresses. Phones upload slowly and often fail midway, and the compose sheet must show progress and retry per photo. Feed cards need small images, the viewer a large one. Photos are private to the couple and deleted for good with their entry.

## Decision
- The client crops each photo to the chosen square and encodes two renditions: `full` (at most 1440 px) and `thumb` (at most 480 px), both re-encoded without metadata.
- Upload first: `POST /api/photos` takes one photo as a `multipart/form-data` request with parts `full` and `thumb`, stores both in R2 (binding `PHOTOS`, bucket `bisou`) and returns one photo id that is pending (`photos.entry_id IS NULL AND photos.wish_id IS NULL`, extended by [ADR 0005](0005-wish-jar-privacy-and-photo-reuse.md)). Saving or editing an entry attaches pending photos by id in one D1 batch.
- The server checks magic bytes and square dimensions within each rendition's limit without decoding pixels. Before the first JPEG scan it keeps APP0 (JFIF), ICC_PROFILE APP2 and APP14 (Adobe), dropping other APPn and COM segments; after that it refuses any APPn or COM marker or an end marker before the final two bytes. WebP EXIF and XMP blocks are refused.
- Pending photos older than 24 h, and photos detached by an edit or delete, are removed from R2 and D1 by the daily cron; edit and delete also remove them right away, the cron is the fallback.
- One D1 row per photo, two R2 objects: `couples/<coupleId>/photos/<photoId>/full` and `.../thumb`, derived from the row, with ids made by the server, never from user input. Photo responses use `private, max-age=86400` so cached photos become stale within one day of an entry's deletion (R20). Photos are served only by `GET /api/photos/:id/:size` (`full` or `thumb`) after a session and couple check.

## Consequences
- A failed photo is retried alone, both renditions together; there is no half uploaded photo state in the client. Entry create and edit requests are limited to 16 KB of JSON.
- Each photo costs two R2 writes; rendition size and byte limits are defined in [shared journal limits](../../src/shared/journal.ts).
- Pending rows expire after 24 h and are swept daily; each user can have at most 12 live pending photos. If the Worker dies between an R2 write and the D1 insert, those objects have no row and are not swept. There is no per-couple storage cap.
- The couple prefix lets a later account or couple deletion list and remove all photos of a couple.
- Header checks do not prove the pixels match; a crafted file only reaches the couple that uploaded it and is served with its allow listed type and `nosniff`.
- A partner's browser may display a deleted photo from its private cache for up to one day before it becomes stale; an already open view can persist until refreshed (R20).
- Changing the renditions, the upload shape or the key layout later means migrating stored objects.
