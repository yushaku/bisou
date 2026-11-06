# ADR 0006: Profile photos belong to the user, one private R2 object named by a column on users

Status: proposed (November 2026)

## Context
Each person sets, replaces or removes one profile photo ([profile photo spec](../product/avatar.md)). It shows to the person before pairing and to both partners after (R11), is stored as privately as journal photos (R12), is one 512 px square without metadata (R6), and replacing or removing deletes it for good (R7, R8). Journal and wish photos are `photos` rows under `couples/<coupleId>/` ([ADR 0004](0004-photos-upload-first-private-r2.md), [ADR 0005](0005-wish-jar-privacy-and-photo-reuse.md)), but a person may have no couple yet, and joining a partner deletes the joiner's empty couple, which cascades its `photos` rows.

## Decision
- No `photos` row. Migration 0008 adds `users.avatar_id TEXT` (NULL means the letter). The id is a server made UUID, new on every replace.
- One R2 object in the existing `PHOTOS` binding at `users/<userId>/avatar/<avatarId>`, derived from the row, never from user input.
- `PUT /api/me/avatar` takes one `multipart/form-data` part `photo` (JPEG or WebP, exactly 512 x 512, at most 256 KB), checked and stripped by the same `checkPhotoBytes`. Order: reserve one of 20 uploads per user per rolling 24 hours in `avatar_uploads` (migration 0009), write the new object, then a single `UPDATE ... RETURNING` sets the new id and returns the updated user while the reservation is still pending. Mark the reservation complete, list `users/<userId>/avatar/`, then re-read the current id and pending reservations from D1 before deleting other objects. `DELETE /api/me/avatar` sets the column to NULL and uses the same cleanup, preserving any newer committed or pending upload. A failed D1 write deletes the new object; a failed cleanup is logged and retried on a later change.
- `GET /api/avatars/:userId/:avatarId` serves the object only when `avatarId` is that user's current id and the caller is that user or shares a couple with them. Anything else is 404. Headers as ADR 0004: `private, max-age=86400`, allow listed type, `nosniff`.
- `User.avatarId` and `CoupleMember.avatarId` carry the id. `GET /api/couple` lists only the caller's couple members, so only the partner learns it.

## Consequences
- Avatars survive pairing, re-pairing and couple deletion; account deletion can remove the `users/<id>/` prefix.
- A replaced or removed photo stops being served at once, because the id no longer matches (AC6). A browser that already cached it may keep its private copy for up to one day, but the app never asks for an old URL again.
- Each validated upload reserves quota before writing R2, including uploads that later fail; refused uploads return 429 with `retryAfter`. Removal remains available at the limit. Pending reservations protect in-flight objects from concurrent cleanup; requests whose reservations expire cannot commit. The daily cron is unchanged.
- If the Worker dies after the R2 write and before D1, or cleanup fails, an unserved object stays until a later change. A pending reservation expires after 24 hours and is removed on the next upload; its orphan can then be purged. Cleanup preserves the current avatar even when an older request finishes later.
- Moving avatars into `photos` or under the couple prefix later means migrating objects and needs a new decision.
