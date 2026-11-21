# Journal comments

## Purpose

Partners can respond to a shared journal entry and keep their conversation with the memory it belongs to.

## Actors

- **Partner** (người ấy): one of the two members of the couple.
- **Comment author** (người viết bình luận): the partner who wrote a given comment.

## User stories

- US1 (partner): read and write comments on a shared entry, so that I can respond to a memory where it was recorded. AC1, AC2, AC3, AC4
- US2 (comment author): change or remove my own comment, so that I can fix or take back what I wrote. AC5
- US3 (partner): hear when my partner comments, so that I can open the entry directly. AC7

## Business rules

- R1. Only the two partners of the couple can read or write comments, and anyone outside the couple learns nothing about them.
- R2. Both partners can comment on ordinary entries, received-wish entries and entries from closed kind notes.
- R3. Comments form a flat list of text-only messages, each with 1 to 1000 characters after trimming outer whitespace.
- R4. Only the comment author can edit or delete their comment, with confirmation before deletion.
- R5. The feed shows only the count on entries with comments, and the full view lists comments oldest first with each author's display name and time written.
- R6. Deleting an entry permanently removes all its comments.
- R7. New comments send a notification to the other partner's devices under the existing partner's journal switch, using `<name> vừa bình luận bài nhật ký` or `<name> commented on a journal entry` with no comment or entry text, and following it opens the entry's full view.
- R8. Editing or deleting a comment sends no notification.

## Main flows and exceptions

- Flow for US1. Open an entry, read its comments, write a comment and send it. Blank comments and comments over the limit are refused.
- Flow for US2. Open your comment's actions and save a correction or confirm its deletion. The other partner has no actions for that comment.
- Flow for US3. Follow the notification to the entry's full view.

## Acceptance criteria

- AC1 (R1). Given an entry belongs to a couple, when someone outside that couple tries to read, add, edit or delete its comments, then the attempt is refused and reveals nothing.
- AC2 (R2). Given an ordinary entry, a received-wish entry and an entry from a closed kind note, when either partner comments on any of them, then the comment is accepted.
- AC3 (R3). Given a comment with outer spaces, when it is sent, then the spaces are trimmed and an empty result or a result above 1000 characters is refused.
- AC4 (R5). Given an entry has comments, when a partner views the feed, then only the count appears, and when they open the entry, then they see the comments oldest first with author display names and writing times.
- AC5 (R4). Given A wrote a comment, when A edits it or confirms deletion, then it changes or disappears for both partners, and when B attempts either action the comment stays as it was.
- AC6 (R6). Given an entry has comments, when the entry is deleted, then all its comments are permanently gone.
- AC7 (R7, R8). Given a partner comments, then [notifications](notifications.md) AC25 applies.

## Glossary

- **Comment** (bình luận): a text response to a journal entry.
- **Comment count** (số bình luận): the number of comments on a journal entry.
- **Partner's journal** (nhật ký của người ấy): the notification switch that includes journal comments.

## Out of scope

- Reactions, photos in comments and nested replies.

## Open questions

None.
