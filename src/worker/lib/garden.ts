import { vnDay } from "../../shared/days";
import { CARDS, DECKS, drawCard, freshness, plantStage, type GardenCardState, type GardenState, type GardenDeckState } from "../../shared/garden";

export interface GardenDay { day: string; card_id: string; deck_id: string; swaps: number; flipped: number }

export async function drawInput(db: D1Database, coupleId: string, day: string) {
  const [played, previous, growth, swapped] = await db.batch<{ card_id: string; deck_id: string; days: number }>([
    db.prepare("SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1 GROUP BY card_id HAVING COUNT(*) = 2").bind(coupleId),
    db.prepare("SELECT deck_id FROM garden_days WHERE couple_id = ? AND day < ? ORDER BY day DESC LIMIT 1").bind(coupleId, day),
    db.prepare("SELECT deck_id, COUNT(*) days FROM garden_growth WHERE couple_id = ? GROUP BY deck_id").bind(coupleId),
    db.prepare(`SELECT skipped.key AS card_id, MAX(skipped.value) AS position FROM garden_days d, json_each(d.swapped_cards) skipped
      WHERE d.couple_id = ? GROUP BY skipped.key ORDER BY position`).bind(coupleId),
  ]);
  return { played: played!.results.map((r) => r.card_id), previousDeck: previous!.results[0]?.deck_id,
    stages: Object.fromEntries(growth!.results.map((r) => [r.deck_id, plantStage(r.days)])),
    swapped: swapped!.results.map((r) => r.card_id) };
}

export async function drawSeed(coupleId: string, day: string, swaps: number): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${coupleId}:${day}:${swaps}`));
  return new DataView(digest).getUint32(0);
}

export async function loadToday(db: D1Database, coupleId: string, now: number): Promise<GardenDay | null> {
  const day = vnDay(now);
  const select = () => db.prepare("SELECT day, card_id, deck_id, swaps, flipped FROM garden_days WHERE couple_id = ? AND day = ?").bind(coupleId, day);
  const current = await select().first<GardenDay>();
  if (current) return current;
  const card = drawCard(await drawInput(db, coupleId, day), await drawSeed(coupleId, day, 0));
  if (!card) return null;
  const results = await db.batch<GardenDay>([
    db.prepare(`INSERT INTO garden_days(couple_id, day, deck_id, card_id, created_at) SELECT ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) < 2
      ON CONFLICT(couple_id, day) DO NOTHING`).bind(coupleId, day, card.deckId, card.id, now, coupleId, card.id),
    select(),
  ]);
  return results[1]!.results[0] ?? loadToday(db, coupleId, now);
}

export async function cardStates(db: D1Database, coupleId: string, userId: string, cardIds: string[]): Promise<GardenCardState[]> {
  if (!cardIds.length) return [];
  // The join prevents partner bodies and metadata from leaving SQL before the caller has answered.
  const rows = await db.prepare(`SELECT mine.card_id, mine.body AS mine, other.body AS partner,
    mine.edited_after_flip AS mine_edited, COALESCE(other.edited_after_flip, 0) AS partner_edited,
    (mine.body IS NULL AND mine.flipped_day IS NOT NULL) AS mine_deleted,
    (other.body IS NULL AND other.flipped_day IS NOT NULL) AS partner_deleted,
    CASE WHEN other.user_id IS NOT NULL THEN mine.flipped_day ELSE NULL END AS flipped_day
    FROM garden_answers mine LEFT JOIN garden_answers other
      ON other.couple_id = mine.couple_id AND other.card_id = mine.card_id AND other.round = mine.round
      AND other.user_id <> mine.user_id AND mine.flipped_day IS NOT NULL
    WHERE mine.couple_id = ? AND mine.user_id = ? AND mine.round = 1 AND mine.card_id IN (${cardIds.map(() => "?").join(",")})`)
    .bind(coupleId, userId, ...cardIds).all<{ card_id: string; mine: string | null; partner: string | null; mine_edited: number; partner_edited: number; mine_deleted: number; partner_deleted: number; flipped_day: string | null }>();
  return cardIds.map((cardId) => {
    const row = rows.results.find((r) => r.card_id === cardId);
    return { cardId, mine: row?.mine ?? null, partner: row?.partner ?? null, mineEdited: !!row?.mine_edited,
      partnerEdited: !!row?.partner_edited, mineDeleted: !!row?.mine_deleted, partnerDeleted: !!row?.partner_deleted,
      flippedDay: row?.flipped_day ?? null };
  });
}

export async function gardenState(db: D1Database, coupleId: string, userId: string, now: number): Promise<GardenState> {
  const today = await loadToday(db, coupleId, now);
  const state = today ? (await cardStates(db, coupleId, userId, [today.card_id]))[0]! : null;
  const locked = today ? await db.prepare("SELECT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) AS locked").bind(coupleId, today.card_id).first<number>("locked") : false;
  const [growth, last] = await db.batch<{ deck_id: string; days: number; day: string | null }>([
    db.prepare("SELECT deck_id, COUNT(*) days FROM garden_growth WHERE couple_id = ? GROUP BY deck_id").bind(coupleId),
    db.prepare(`SELECT COALESCE((SELECT MAX(day) FROM garden_days WHERE couple_id = ? AND flipped = 1),
      (SELECT MIN(day) FROM garden_days WHERE couple_id = ?)) AS day`).bind(coupleId, coupleId),
  ]);
  return { day: vnDay(now), today: state, swapLocked: !!locked,
    plants: DECKS.map((deck) => ({ deckId: deck.id, stage: plantStage(growth!.results.find((r) => r.deck_id === deck.id)?.days ?? 0) })),
    freshness: today ? freshness(last!.results[0]?.day ?? vnDay(now), vnDay(now)) : "fresh" };
}

export async function gardenDeck(db: D1Database, coupleId: string, userId: string, deckId: string, now: number): Promise<GardenDeckState> {
  const today = await loadToday(db, coupleId, now);
  const input = await drawInput(db, coupleId, vnDay(now));
  const states = await cardStates(db, coupleId, userId, CARDS.filter((card) => card.deckId === deckId).map((card) => card.id));
  const activeId = today?.deck_id === deckId && !input.played.includes(today.card_id) ? today.card_id
    : drawCard({ ...input, previousDeck: undefined, played: [...input.played, ...CARDS.filter((c) => c.deckId !== deckId).map((c) => c.id)] }, 0)?.id;
  const [drawn, answered] = await db.batch<{ card_id: string; stamp: number }>([
    db.prepare("SELECT card_id, MAX(created_at) stamp FROM garden_days WHERE couple_id = ? AND deck_id = ? GROUP BY card_id").bind(coupleId, deckId),
    db.prepare("SELECT card_id, MAX(created_at) stamp FROM garden_answers WHERE couple_id = ? AND round = 1 AND (user_id = ? OR flipped_day IS NOT NULL) GROUP BY card_id").bind(coupleId, userId),
  ]);
  const stamp = (cardId: string) => answered!.results.find((row) => row.card_id === cardId)?.stamp ?? drawn!.results.find((row) => row.card_id === cardId)?.stamp ?? 0;
  // Past daily cards stay accessible to both even when untouched, so their presence cannot expose a waiting answer.
  const history = states.filter((card) => card.cardId !== activeId && (card.mine !== null || card.mineDeleted || card.flippedDay || drawn!.results.some((row) => row.card_id === card.cardId)))
    .sort((a, b) => stamp(b.cardId) - stamp(a.cardId) || b.cardId.localeCompare(a.cardId));
  return { active: states.find((card) => card.cardId === activeId) ?? null, history };
}

