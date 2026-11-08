import { vnDay } from "../../shared/days";
import { CARDS, DECKS, cardById, LEVEL_IDS, gateIds, levelRank, type GardenLevels, type LevelAction, type ResponseChoice, drawCard, freshness, plantStage, type GardenCardState, type GardenState, type GardenDeckState } from "../../shared/garden";

export const memberGuard = `EXISTS(SELECT 1 FROM couple_members WHERE couple_id = ? AND user_id = ?)
  AND (SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) = 2`;
export function cardAccess(card: { id: string; levelId: typeof LEVEL_IDS[number]; kind: string }) {
  return card.kind === "ordinary" && !card.id.startsWith("L") ? "1" :
    `EXISTS(SELECT 1 FROM garden_levels WHERE couple_id = ? AND furthest_level >= ${levelRank(card.levelId)})`;
}
interface LevelRow {
  initial_level: number | null; selected_level: number | null; furthest_level: number | null; revision: number;
  proposal_kind: "placement" | "target" | "revisit" | null; proposal_level: number | null;
  proposer_id: string | null; target_agreed: number; gate_ids: string;
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
  const ids = CARDS.filter((c) => c.kind === "decision" && row.furthest_level !== null && levelRank(c.levelId) <= row.furthest_level).map((c) => c.id);
  const completed = await db.prepare(`SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1
    AND flipped_day IS NOT NULL AND user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)
    GROUP BY card_id HAVING COUNT(*) = 2`).bind(couple, couple).all<{card_id: string}>();
  const level = (rank: number | null) => rank === null ? null : LEVEL_IDS[rank]!;
  return { revision: row.revision, initialLevelId: level(row.initial_level), selectedLevelId: level(row.selected_level),
    furthestLevelId: level(row.furthest_level), placementComplete: row.initial_level !== null,
    proposal: row.proposal_kind === null ? null : { kind: row.proposal_kind, levelId: level(row.proposal_level)!,
      agreed: !!row.target_agreed, proposedByMe: row.proposer_id === user },
    decisions: ids.map((cardId) => ({ cardId, complete: completed.results.some((r) => r.card_id === cardId) })) };
}
// Paired flip markers survive personal-response deletion; only current members count.
const gatesComplete = `json_array_length(gate_ids) > 0 AND NOT EXISTS(
  SELECT 1 FROM json_each(gate_ids) gate WHERE
    (SELECT COUNT(*) FROM garden_answers a WHERE a.couple_id = garden_levels.couple_id
      AND a.card_id = gate.value AND a.round = 1 AND a.flipped_day IS NOT NULL
      AND a.user_id IN (SELECT user_id FROM couple_members WHERE couple_id = garden_levels.couple_id)) <> 2)`;
const gateCatalog = JSON.stringify(LEVEL_IDS.map((_, i) => gateIds(i)));
export function advanceLevels(db: D1Database, couple: string, user: string, cardId: string) {
  return db.prepare(`UPDATE garden_levels SET selected_level = proposal_level, furthest_level = proposal_level,
    gate_ids = json_extract(?, '$[' || proposal_level || ']'), proposal_kind = NULL, proposal_level = NULL,
    proposer_id = NULL, target_agreed = 0, revision = revision + 1
    WHERE couple_id = ? AND proposal_kind = 'target' AND target_agreed = 1 AND proposal_level > furthest_level
    AND EXISTS(SELECT 1 FROM json_each(gate_ids) WHERE value = ?)
    AND EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND user_id = ? AND round = 1)
    AND ${gatesComplete} AND ${memberGuard}`)
    .bind(gateCatalog, couple, cardId, couple, cardId, user, couple, user, couple);
}

export async function changeLevels(db: D1Database, couple: string, user: string, action: LevelAction) {
  await ensureLevels(db, couple, user);
  let sql: string;
  let values: unknown[];
  if (action.action === "propose") {
    const rank = levelRank(action.levelId);
    const eligible = action.kind === "placement" ? "initial_level IS NULL" : action.kind === "revisit"
      ? "furthest_level IS NOT NULL AND ? <= furthest_level" : "furthest_level < 4 AND ? > furthest_level AND json_array_length(gate_ids) > 0";
    sql = `UPDATE garden_levels SET proposal_kind = ?, proposal_level = ?, proposer_id = ?, target_agreed = 0, revision = revision + 1
      WHERE couple_id = ? AND revision = ? AND (proposal_kind IS NULL OR proposer_id = ?) AND ${eligible} AND ${memberGuard}`;
    values = [action.kind, rank, user, couple, action.revision, user, ...(action.kind !== "placement" ? [rank] : []), couple, user, couple];
  } else if (action.action === "accept") {
    sql = `WITH choice AS (SELECT *, (proposal_kind = 'placement' OR (proposal_kind = 'target' AND ${gatesComplete})) AS opens
      FROM garden_levels WHERE couple_id = ? AND revision = ? AND proposer_id <> ?
      AND ((proposal_kind = 'placement' AND initial_level IS NULL) OR (proposal_kind = 'revisit' AND proposal_level <= furthest_level)
        OR (proposal_kind = 'target' AND proposal_level > furthest_level AND furthest_level < 4 AND json_array_length(gate_ids) > 0))
      AND ${memberGuard})
      UPDATE garden_levels SET
        initial_level = CASE WHEN choice.proposal_kind = 'placement' THEN choice.proposal_level ELSE choice.initial_level END,
        furthest_level = CASE WHEN choice.opens THEN choice.proposal_level ELSE choice.furthest_level END,
        selected_level = CASE WHEN choice.opens OR choice.proposal_kind = 'revisit' THEN choice.proposal_level ELSE choice.selected_level END,
        gate_ids = CASE WHEN choice.opens THEN json_extract(?, '$[' || choice.proposal_level || ']') ELSE choice.gate_ids END,
        proposal_kind = CASE WHEN choice.proposal_kind = 'target' AND NOT choice.opens THEN 'target' ELSE NULL END,
        proposal_level = CASE WHEN choice.proposal_kind = 'target' AND NOT choice.opens THEN choice.proposal_level ELSE NULL END,
        proposer_id = CASE WHEN choice.proposal_kind = 'target' AND NOT choice.opens THEN choice.proposer_id ELSE NULL END,
        target_agreed = CASE WHEN choice.proposal_kind = 'target' AND NOT choice.opens THEN 1 ELSE 0 END,
        revision = garden_levels.revision + 1
      FROM choice WHERE garden_levels.couple_id = choice.couple_id`;
    values = [couple, action.revision, user, couple, user, couple, gateCatalog];
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
  const furthestLevel = await db.prepare("SELECT furthest_level FROM garden_levels WHERE couple_id = ?").bind(coupleId).first<number | null>("furthest_level");
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
  // The join prevents partner bodies and metadata from leaving SQL before the caller has answered.
  const rows = await db.prepare(`SELECT mine.card_id, mine.body AS mine, other.body AS partner, mine.response_choice AS mine_choice, other.response_choice AS partner_choice,
    mine.edited_after_flip AS mine_edited, COALESCE(other.edited_after_flip, 0) AS partner_edited,
    (mine.body IS NULL AND mine.response_choice IS NULL AND mine.flipped_day IS NOT NULL) AS mine_deleted,
    (other.body IS NULL AND other.response_choice IS NULL AND other.flipped_day IS NOT NULL) AS partner_deleted,
    CASE WHEN other.user_id IS NOT NULL THEN mine.flipped_day ELSE NULL END AS flipped_day
    FROM garden_answers mine LEFT JOIN garden_answers other
      ON other.couple_id = mine.couple_id AND other.card_id = mine.card_id AND other.round = mine.round
      AND other.user_id <> mine.user_id AND mine.flipped_day IS NOT NULL AND other.flipped_day IS NOT NULL
      AND other.user_id IN (SELECT user_id FROM couple_members WHERE couple_id = mine.couple_id)
    WHERE mine.couple_id = ? AND mine.user_id = ? AND mine.round = 1 AND mine.card_id IN (${cardIds.map(() => "?").join(",")}) AND ${memberGuard}`)
    .bind(coupleId, userId, ...cardIds, coupleId, userId, coupleId).all<{ card_id: string; mine: string | null; partner: string | null; mine_choice: ResponseChoice | null; partner_choice: ResponseChoice | null; mine_edited: number; partner_edited: number; mine_deleted: number; partner_deleted: number; flipped_day: string | null }>();
  return cardIds.map((cardId) => {
    const row = rows.results.find((r) => r.card_id === cardId);
    return { cardId, mine: row?.mine ?? null, partner: row?.partner ?? null, mineChoice: row?.mine_choice ?? null, partnerChoice: row?.partner_choice ?? null, mineEdited: !!row?.mine_edited,
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
    decisions: states.filter((state) => { const card = cardById(state.cardId)!; return card.kind === "decision" && input.furthestLevel !== null && levelRank(card.levelId) <= input.furthestLevel; }),
    locked: CARDS.filter((card) => card.deckId === deckId && (input.furthestLevel === null ? card.id.startsWith("L") : levelRank(card.levelId) > input.furthestLevel)).map((card) => card.id) };
}

