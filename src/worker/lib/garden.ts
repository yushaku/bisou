import { vnDay } from "../../shared/days";
import { CARDS, DECKS, cardById, FIRST_LEVEL, LEVEL_IDS, levelRank, type GardenLevels, type LevelAction, type RelationshipLevel, type ResponseChoice, drawCard, freshness, plantStage, type GardenCardState, type GardenState, type GardenDeckState } from "../../shared/garden";

export const memberGuard = `EXISTS(SELECT 1 FROM couple_members WHERE couple_id = ? AND user_id = ?)
  AND (SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) = 2`;
export function cardAccess(card: { id: string; levelId: typeof LEVEL_IDS[number]; kind: string }) {
  return card.kind === "ordinary" && !card.id.startsWith("L") ? "1" :
    `EXISTS(SELECT 1 FROM garden_levels WHERE couple_id = ? AND COALESCE(furthest_level, ${FIRST_LEVEL}) >= ${levelRank(card.levelId)})`;
}
interface LevelRow {
  initial_level: number | null; selected_level: number | null; furthest_level: number | null; revision: number;
  proposal_kind: "placement" | "target" | "revisit" | null; proposal_level: number | null;
  proposer_id: string | null; target_agreed: number;
}
export async function ensureLevels(db: D1Database, couple: string, user: string) {
  await db.prepare(`INSERT OR IGNORE INTO garden_levels(couple_id) SELECT ? WHERE ${memberGuard}`)
    .bind(couple, couple, user, couple).run();
}
export async function levelsState(db: D1Database, couple: string, user: string): Promise<GardenLevels> {
  await ensureLevels(db, couple, user);
  const row = await db.prepare(`SELECT * FROM garden_levels WHERE couple_id = ? AND ${memberGuard}`)
    .bind(couple, couple, user, couple).first<LevelRow>();
  if (!row) throw new Error("not_in_couple");
  const initial = row.initial_level ?? FIRST_LEVEL, selected = row.selected_level ?? FIRST_LEVEL, furthest = row.furthest_level ?? FIRST_LEVEL;
  const ids = CARDS.filter((c) => c.kind === "decision" && levelRank(c.levelId) <= furthest).map((c) => c.id);
  const completed = await db.prepare(`SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1
    AND flipped_day IS NOT NULL AND user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)
    GROUP BY card_id HAVING COUNT(*) = 2`).bind(couple, couple).all<{card_id: string}>();
  const level = (rank: number | null) => rank === null ? null : LEVEL_IDS[rank]!;
  let proposal: GardenLevels["proposal"] = null;
  if (row.proposal_kind !== null && !(row.proposal_kind === "placement" && row.initial_level === null)) {
    proposal = { kind: row.proposal_kind, levelId: level(row.proposal_level)!, agreed: !!row.target_agreed, proposedByMe: row.proposer_id === user };
  }
  return { revision: row.revision, initialLevelId: level(initial), selectedLevelId: level(selected),
    furthestLevelId: level(furthest), placementComplete: true, proposal,
    decisions: ids.map((cardId) => ({ cardId, complete: completed.results.some((r) => r.card_id === cardId) })) };
}
export async function changeLevels(db: D1Database, couple: string, user: string, action: LevelAction) {
  await ensureLevels(db, couple, user);
  let sql: string;
  let values: unknown[];
  if (action.action === "propose") {
    const rank = levelRank(action.levelId);
    const eligible = action.kind === "placement" ? "0" : action.kind === "revisit"
      ? `? <= COALESCE(furthest_level, ${FIRST_LEVEL})` : `COALESCE(furthest_level, ${FIRST_LEVEL}) < 4 AND ? > COALESCE(furthest_level, ${FIRST_LEVEL})`;
    sql = `UPDATE garden_levels SET proposal_kind = ?, proposal_level = ?, proposer_id = ?, target_agreed = 0, revision = revision + 1
      WHERE couple_id = ? AND revision = ? AND (proposal_kind IS NULL OR proposer_id = ? OR (initial_level IS NULL AND proposal_kind = 'placement')) AND ${eligible} AND ${memberGuard}`;
    values = [action.kind, rank, user, couple, action.revision, user, ...(action.kind !== "placement" ? [rank] : []), couple, user, couple];
  } else if (action.action === "accept") {
    sql = `WITH choice AS (SELECT *, (proposal_kind = 'target') AS opens
      FROM garden_levels WHERE couple_id = ? AND revision = ? AND proposer_id <> ?
      AND ((proposal_kind = 'revisit' AND proposal_level <= COALESCE(furthest_level, ${FIRST_LEVEL}))
        OR (proposal_kind = 'target' AND proposal_level > COALESCE(furthest_level, ${FIRST_LEVEL}) AND COALESCE(furthest_level, ${FIRST_LEVEL}) < 4))
      AND ${memberGuard})
      UPDATE garden_levels SET
        initial_level = COALESCE(choice.initial_level, ${FIRST_LEVEL}),
        furthest_level = CASE WHEN choice.opens THEN choice.proposal_level ELSE COALESCE(choice.furthest_level, ${FIRST_LEVEL}) END,
        selected_level = CASE WHEN choice.opens OR choice.proposal_kind = 'revisit' THEN choice.proposal_level ELSE COALESCE(choice.selected_level, ${FIRST_LEVEL}) END,
        proposal_kind = NULL, proposal_level = NULL, proposer_id = NULL, target_agreed = 0,
        revision = garden_levels.revision + 1
      FROM choice WHERE garden_levels.couple_id = choice.couple_id`;
    values = [couple, action.revision, user, couple, user, couple];
  } else {
    sql = `UPDATE garden_levels SET proposal_kind = NULL, proposal_level = NULL, proposer_id = NULL,
      target_agreed = 0, revision = revision + 1 WHERE couple_id = ? AND revision = ? AND proposal_kind IS NOT NULL
      AND ${action.action === "withdraw" ? "proposer_id = ?" : "(proposer_id <> ? OR target_agreed = 1)"} AND ${memberGuard}`;
    values = [couple, action.revision, user, couple, user, couple];
  }
  return (await db.prepare(sql).bind(...values).run()).meta.changes > 0;
}

export interface GardenDay { day: string; card_id: string; deck_id: string; swaps: number; flipped: number }

export async function drawInput(db: D1Database, coupleId: string, day: string) {
  const [played, previous, growth, swapped, waiting] = await db.batch<{ card_id: string; deck_id: string; days: number }>([
    db.prepare("SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1 GROUP BY card_id HAVING COUNT(*) = 2").bind(coupleId),
    db.prepare("SELECT deck_id FROM garden_days WHERE couple_id = ? AND day < ? ORDER BY day DESC LIMIT 1").bind(coupleId, day),
    db.prepare("SELECT deck_id, COUNT(*) days FROM garden_growth WHERE couple_id = ? GROUP BY deck_id").bind(coupleId),
    db.prepare(`SELECT skipped.key AS card_id, MAX(skipped.value) AS position FROM garden_days d, json_each(d.swapped_cards) skipped
      WHERE d.couple_id = ? GROUP BY skipped.key ORDER BY position`).bind(coupleId),
    db.prepare("SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1 GROUP BY card_id HAVING COUNT(*) = 1").bind(coupleId),
  ]);
  const furthestLevel = (await db.prepare("SELECT furthest_level FROM garden_levels WHERE couple_id = ?").bind(coupleId).first<number | null>("furthest_level")) ?? FIRST_LEVEL;
  return { furthestLevel, waiting: waiting!.results.map((r) => r.card_id), played: played!.results.map((r) => r.card_id), previousDeck: previous!.results[0]?.deck_id,
    stages: Object.fromEntries(growth!.results.map((r) => [r.deck_id, plantStage(r.days)])),
    swapped: swapped!.results.map((r) => r.card_id) };
}

export async function drawSeed(coupleId: string, day: string, swaps: number): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${coupleId}:${day}:${swaps}`));
  return new DataView(digest).getUint32(0);
}

export async function loadToday(db: D1Database, coupleId: string, now: number, userId: string, retry = true): Promise<GardenDay | null> {
  const day = vnDay(now);
  const select = () => db.prepare("SELECT day, card_id, deck_id, swaps, flipped FROM garden_days WHERE couple_id = ? AND day = ?").bind(coupleId, day);
  const current = await select().first<GardenDay>();
  if (current) return current;
  const card = drawCard(await drawInput(db, coupleId, day), await drawSeed(coupleId, day, 0));
  if (!card) return null;
  const results = await db.batch<GardenDay>([
    db.prepare(`INSERT INTO garden_days(couple_id, day, deck_id, card_id, created_at) SELECT ?, ?, ?, ?, ?
      WHERE ${cardAccess(card)} AND ${memberGuard}
      AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) < 2
      ON CONFLICT(couple_id, day) DO NOTHING`).bind(coupleId, day, card.deckId, card.id, now, ...(cardAccess(card) === "1" ? [] : [coupleId]), coupleId, userId, coupleId, coupleId, card.id),
    select(),
  ]);
  return results[1]!.results[0] ?? (retry ? loadToday(db, coupleId, now, userId, false) : null);
}

export async function cardStates(db: D1Database, coupleId: string, userId: string, cardIds: string[]): Promise<GardenCardState[]> {
  if (!cardIds.length) return [];
  // Only the answered boolean crosses the reveal boundary before both submit.
  const rows = await db.prepare(`SELECT requested.value AS card_id, mine.body AS mine, other.body AS partner,
    EXISTS(SELECT 1 FROM garden_stars s WHERE s.couple_id = ? AND s.card_id = requested.value) AS starred,
    mine.response_choice AS mine_choice, other.response_choice AS partner_choice,
    EXISTS(SELECT 1 FROM garden_answers answered WHERE answered.couple_id = ? AND answered.card_id = requested.value
      AND answered.round = 1 AND answered.user_id <> ?
      AND answered.user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)
      AND (answered.body IS NOT NULL OR answered.response_choice IS NOT NULL)) AS partner_answered,
    mine.edited_after_flip AS mine_edited, COALESCE(other.edited_after_flip, 0) AS partner_edited,
    (mine.body IS NULL AND mine.response_choice IS NULL AND mine.flipped_day IS NOT NULL) AS mine_deleted,
    (other.body IS NULL AND other.response_choice IS NULL AND other.flipped_day IS NOT NULL) AS partner_deleted,
    CASE WHEN other.user_id IS NOT NULL THEN mine.flipped_day ELSE NULL END AS flipped_day
    FROM json_each(?) requested LEFT JOIN garden_answers mine
      ON mine.couple_id = ? AND mine.user_id = ? AND mine.round = 1 AND mine.card_id = requested.value
    LEFT JOIN garden_answers other
      ON other.couple_id = mine.couple_id AND other.card_id = mine.card_id AND other.round = mine.round
      AND other.user_id <> mine.user_id AND mine.flipped_day IS NOT NULL AND other.flipped_day IS NOT NULL
      AND other.user_id IN (SELECT user_id FROM couple_members WHERE couple_id = mine.couple_id)
    WHERE ${memberGuard}`)
    .bind(coupleId, coupleId, userId, coupleId, JSON.stringify(cardIds), coupleId, userId, coupleId, userId, coupleId)
    .all<{ card_id: string; starred: number; mine: string | null; partner: string | null; partner_answered: number; mine_choice: ResponseChoice | null; partner_choice: ResponseChoice | null; mine_edited: number; partner_edited: number; mine_deleted: number; partner_deleted: number; flipped_day: string | null }>();
  return cardIds.map((cardId) => {
    const row = rows.results.find((r) => r.card_id === cardId);
    return { cardId, starred: !!row?.starred, partnerAnswered: !!row?.partner_answered, mine: row?.mine ?? null, partner: row?.partner ?? null, mineChoice: row?.mine_choice ?? null, partnerChoice: row?.partner_choice ?? null, mineEdited: !!row?.mine_edited,
      partnerEdited: !!row?.partner_edited, mineDeleted: !!row?.mine_deleted, partnerDeleted: !!row?.partner_deleted,
      flippedDay: row?.flipped_day ?? null };
  });
}

export async function gardenState(db: D1Database, coupleId: string, userId: string, now: number): Promise<GardenState> {
  const today = await loadToday(db, coupleId, now, userId);
  const state = today ? (await cardStates(db, coupleId, userId, [today.card_id]))[0]! : null;
  const locked = today ? await db.prepare("SELECT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) AS locked").bind(coupleId, today.card_id).first<number>("locked") : false;
  const [growth, last] = await db.batch<{ deck_id: string; days: number; day: string | null }>([
    db.prepare("SELECT deck_id, COUNT(*) days FROM garden_growth WHERE couple_id = ? GROUP BY deck_id").bind(coupleId),
    db.prepare(`SELECT COALESCE((SELECT MAX(day) FROM garden_days WHERE couple_id = ? AND flipped = 1),
      (SELECT MIN(day) FROM garden_days WHERE couple_id = ?)) AS day`).bind(coupleId, coupleId),
  ]);
  return { levels: await levelsState(db, coupleId, userId), day: vnDay(now), today: state, swapLocked: !!locked,
    plants: DECKS.map((deck) => ({ deckId: deck.id, stage: plantStage(growth!.results.find((r) => r.deck_id === deck.id)?.days ?? 0) })),
    freshness: today ? freshness(last!.results[0]?.day ?? vnDay(now), vnDay(now)) : "fresh" };
}

/* Cards the caller has answered in one stage, newest answer first. */
export async function stageAnswers(db: D1Database, coupleId: string, userId: string, levelId: RelationshipLevel): Promise<GardenCardState[]> {
  const cardIds = CARDS.filter((card) => card.levelId === levelId).map((card) => card.id);
  if (!cardIds.length) return [];
  const rows = await db.prepare(`SELECT card_id, MAX(COALESCE(flipped_day, '')) AS flipped, MAX(updated_at) AS updated
    FROM garden_answers WHERE couple_id = ? AND user_id = ? AND round = 1
    AND card_id IN (${cardIds.map(() => "?").join(",")})
    GROUP BY card_id ORDER BY flipped DESC, updated DESC`)
    .bind(coupleId, userId, ...cardIds).all<{ card_id: string }>();
  return cardStates(db, coupleId, userId, rows.results.map((row) => row.card_id));
}

export async function gardenDeck(db: D1Database, coupleId: string, userId: string, deckId: string, now: number): Promise<GardenDeckState> {
  const today = await loadToday(db, coupleId, now, userId);
  const input = await drawInput(db, coupleId, vnDay(now));
  const states = await cardStates(db, coupleId, userId, CARDS.filter((card) => card.deckId === deckId).map((card) => card.id));
  const activeId = today?.deck_id === deckId && !input.played.includes(today.card_id) ? today.card_id
    : drawCard({ ...input, waiting: undefined, previousDeck: undefined, played: [...input.played, ...CARDS.filter((c) => c.deckId !== deckId).map((c) => c.id)] }, 0)?.id;
  const [drawn, answered] = await db.batch<{ card_id: string; stamp: number }>([
    db.prepare("SELECT card_id, MAX(created_at) stamp FROM garden_days WHERE couple_id = ? AND deck_id = ? GROUP BY card_id").bind(coupleId, deckId),
    db.prepare("SELECT card_id, MAX(created_at) stamp FROM garden_answers WHERE couple_id = ? AND round = 1 AND (user_id = ? OR flipped_day IS NOT NULL) GROUP BY card_id").bind(coupleId, userId),
  ]);
  const stamp = (cardId: string) => answered!.results.find((row) => row.card_id === cardId)?.stamp ?? drawn!.results.find((row) => row.card_id === cardId)?.stamp ?? 0;
  // Past daily cards stay accessible to both even when untouched, so their presence cannot expose a waiting answer.
  const history = states.filter((card) => cardById(card.cardId)?.kind === "ordinary" && card.cardId !== activeId && (card.mine !== null || card.mineChoice !== null || card.mineDeleted || card.flippedDay || drawn!.results.some((row) => row.card_id === card.cardId)))
    .sort((a, b) => stamp(b.cardId) - stamp(a.cardId) || b.cardId.localeCompare(a.cardId));
  return { active: states.find((card) => card.cardId === activeId) ?? null, history,
    decisions: states.filter((state) => { const card = cardById(state.cardId)!; return card.kind === "decision" && input.furthestLevel !== null && levelRank(card.levelId) <= input.furthestLevel; }) };
}

