# Relationship stages

## Purpose

Partners want questions that fit where their relationship is now and help them talk about decisions ahead, such as preparing to share a home. Each garden question belongs to a stage named for a relationship status and to one of the garden's topics. Unlocking content does not establish that a move, marriage, pregnancy or birth happened, or that the couple is ready for it. It extends [garden](garden.md); stars on decision questions are in [garden-stars](garden-stars.md).

## Actors

- **Partner**: a member of a couple; both have the same rights.
- **Author**: the partner who wrote a given response.
- **Outsider**: anyone else, unpaired people included.

## User stories

- US1 (partner): start at the first stage and choose the next stage together with my partner, so that the questions fit where we are without either of us deciding alone. AC26, AC27, AC28, AC30, AC33
- US2 (partner): respond to decision questions with text or a neutral or deferred choice, so that we can prepare conversations about what is ahead without pressure or oversharing. AC24, AC25, AC32, AC35
- US3 (partner): stay at any stage as long as we like, so that we never feel pushed toward a milestone. AC29, AC31, AC34, AC36

## Business rules

- R40. The couple shares a selected stage named for a relationship status, from five: Getting acquainted, In love, Living together, Married and With children, with no claim that later statuses describe better relationships; With children is the last stage.
- R41. Each question belongs to exactly one stage and one of the six garden topics and is designated ordinary or decision, without deriving its stage from plant size or text depth; decision questions are optional conversations before a later stage and never gate it.
- R42. A decision question is complete as soon as both partners submit a response, with no discussion confirmation, agreement requirement, correctness assessment or shared decision text.
- R43. Each partner may respond to a decision question with text, a neutral no-details choice or a deferred or not applicable choice without explanation, and each choice counts equally toward completion.
- R44. Decision cards show no privacy notice before submitting; a neutral or deferred choice needs no text, and a partner may cancel without submitting.
- R45. Every new couple starts at Getting acquainted automatically, opening its ordinary and decision content without marking questions answered; later stage changes still require both partners to choose the same stage.
- R46. A couple that never chose a starting stage reads as Getting acquainted with all its history intact; the existing daily garden continues unchanged until both partners agree on a later stage.
- R47. A next stage opens only by a fresh mutual choice of the same applicable stage beyond the furthest opened one; one partner proposes and the other agrees or declines, the proposer can withdraw or replace the proposal, a different proposal from the other partner waits until the pending one ends, and a stale answer to a proposal changes nothing.
- R48. The mutually chosen stage opens immediately on acceptance, regardless of unanswered decision questions, with no decision quota, ordinary-question quota, plant threshold or waiting period.
- R49. Choosing a later applicable stage may skip stages; skipped content opens for optional use without marking it answered or recording a move, marriage, pregnancy, birth or agreement to them.
- R50. Either partner may leave a next stage unset or decline indefinitely while ordinary play, history and own-answer management stay available; a pending choice shows the proposer's name to the other partner, who can agree or decline, and the proposer can withdraw.
- R51. Opened content stays open and earlier stages remain available without losing answers; a later stage opens only by mutual choice and is then celebrated once with a small, motion-sensitive celebration.
- R52. Existing cards remain ordinary questions assigned to Getting acquainted, with all existing answers, waiting cards, plants and history preserved and no retroactive decision credit.
- R53. Ordinary daily draws, swaps and extra play use unplayed ordinary cards from all opened stages under the garden's rotation rules, and an already drawn daily card is unchanged by a stage change.
- R54. Decision cards of all opened stages remain answerable at any time; the couple sees the decisions of the furthest opened stage with each one's turn (my turn, nobody answered, waiting for my partner, discussed), a gentle count of those left to discuss, and can answer in place; the list never blocks choosing a next stage.
- R55. Decision questions stay out of the automatic daily draw, and completing them or changing stage adds no plant growth, watering or notification, while ordinary cards keep the garden's growth and freshness rules.
- R57. Saved responses follow [garden](garden.md) R4 and R12 to R19, with the neutral and deferred choices as the only exception to required free text, and the author alone may edit or delete their text or choice.
- R58. Deleting a response before the paired reveal removes that person's submission and leaves the question incomplete; after the reveal it leaves a deletion notice and preserves completion and opened stages, and the author may write a new response without restoring the deleted text.
- R59. A failed save changes nothing, a stale or repeated acceptance cannot open a stage twice, and every later change needs a fresh mutual choice; decision answers never advance a stage or cascade into another change.
- R60. Both see the same selected stage, shared completion and pending mutual choice with real display names and the answered flag ([garden](garden.md) R13), without response timestamps or blame.
- R61. Stage names, question stages, shared completion and the remaining discussion count may be shown, while unrelated points, streaks, rankings, percentages, compatibility scores and numeric plant levels remain excluded.
- R62. Questions use respectful adult language without requiring private financial or intimate details, and no response, deferral, unlocked stage or choice not to have children implies consent to intimacy, agreement about having children, medical advice, diagnosis or research-validated readiness; not wanting children is a valid response.
- R63. Bisou keeps submitted text or choices with their author, question and answer date for the reveal and later reading until the author deletes them, keeps chosen and proposed stages until replaced and opened-stage and completion records while the couple exists, and preserves those shared records after a personal answer is deleted without retaining the deleted text.
- R64. Decision cards have no first-response privacy notice; retention, author editing and deletion and surviving shared progress follow R57, R58 and R63, and no export or account controls are added.
- R79. Questions of stages not yet opened are neither shown nor answerable; when no opened ordinary question remains, the garden shows no today's card and does not fade until more ordinary content opens.

## Main flows and exceptions

- Flow for US1: a new couple starts at Getting acquainted; one partner proposes the next stage, the other sees the proposer's name and agrees, and the stage opens at once with a small celebration. Exceptions: the other partner declines, the proposer withdraws, or a stale answer arrives, and nothing opens.
- Flow for US1 (skipping): a couple already living together or married proposes a later stage directly and opens it without answering earlier decisions or recording any real-world event.
- Flow for US2: each partner answers a decision question with text or a neutral or deferred choice; it completes when both have answered and the responses are revealed together. Exception: deleting a response before the reveal makes the question incomplete again.
- Flow for US3: a couple that does not want a next stage, or does not plan children, stays at any opened stage and keeps playing and rereading without penalty.

## Acceptance criteria

- AC24 (R40, R41, R42). Given a question about preparing to live together, when partners inspect it, then it belongs to In love and a garden topic, and both responses alone complete it regardless of agreement.
- AC25 (R42, R43, R44). Given A wrote an answer, when B chooses a neutral or deferred option, then no text is needed, submission completes the question and allows the reveal, without a notice, privacy hint or discussion step; cancelling submits nothing.
- AC26 (R45, R46, R52). Given a new couple or an existing couple with no chosen starting stage, when either opens the garden, then Getting acquainted is already selected and open, and saved history, waiting cards and plants stay intact.
- AC27 (R47, R48, R50). Given In love with unanswered decision cards, when one partner proposes Living together, then the other sees a pending choice naming the proposer; accepting opens Living together once, and unfinished questions remain optional.
- AC28 (R47, R48, R49). Given Living together, when both choose With children, then it opens immediately without answering current or Married decision sets and without recording marriage or pregnancy.
- AC29 (R50, R62). Given partners want no children or no next stage, when they leave the next stage unset, then their play and history continue without penalty, reminders or a claim of incomplete relationship development.
- AC30 (R51, R54). Given Married is the furthest opened stage, when partners revisit an earlier stage or a bypassed decision, then its answers stay usable; answering them cannot open With children, while a fresh mutual choice opens it without requiring any decision set.
- AC31 (R52, R53, R55). Given an existing daily card and plant state, when a stage opens or a decision response saves, then today's card, plant size and freshness stay unchanged, no notification is sent, and later ordinary draws may use the newly opened content.
- AC32 (R57, R58). Given only one response, when its author deletes it, then the question is incomplete and the partner cannot see its text; given a revealed pair, when an author edits or deletes, then the edited and deleted marks apply and completed questions and opened stages remain.
- AC33 (R47, R59). Given a declined, withdrawn or replaced choice, when a stale acceptance arrives, then nothing is saved; a valid acceptance consumes one mutual choice, repeats cannot reopen it or cascade, and the next change needs a new choice.
- AC34 (R60, R61, R62). Given partners view progression, when they see a stage or completed question, then it conveys only content access and response completion, without scores, blame or any claim of consent or real-world events.
- AC35 (R63, R64). Given a first decision response, when an author opens and submits it, then no privacy notice appears, while own editing and deletion and surviving completion remain unchanged and no download is promised.
- AC36 (R53, R79). Given all opened ordinary questions are played while later content is not opened, when the couple opens today's card, then no unopened question is drawn or shown and freshness does not fade.

## Glossary

- **Stage** (giai đoạn): a named relationship context, opened by default at Getting acquainted or chosen together for a later stage.
- **Getting acquainted** (Làm quen), **In love** (Yêu nhau), **Living together** (Sống chung), **Married** (Cưới), **With children** (Có con): the five stage names.
- **Opened stage** (giai đoạn đã mở): content the couple can use, without asserting a real-world event.
- **Target stage** (giai đoạn muốn mở tiếp): the later applicable stage both choose to unlock.
- **Topic** (chủ đề): one of the garden's six decks, separate from stage.
- **Decision question** (Điều cần bàn trước khi {stage}): an optional conversation whose paired responses complete it without opening a stage.
- **Neutral or deferred response** (không ghi chi tiết, để sau hoặc không phù hợp): an explicit response that counts without private disclosure or a claim of agreement.

## Out of scope

Discussion confirmations, shared agreement text, abstract depth levels separate from stages, extra topics, point systems, streaks, competition, mandatory life milestones, readiness diagnoses, repeated-answer rounds, export, account deletion or unpairing, AI, paid services and a new registration flow.

## Open questions

None.

Retired: R56
