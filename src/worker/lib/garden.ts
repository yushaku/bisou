import { vnDay } from "../../shared/days";
import { DECKS, drawCard, type GardenCardState, type GardenState } from "../../shared/garden";

export interface GardenDay { day: string; card_id: string; deck_id: string; swaps: number; flipped: number }

export async function drawInput(db: D1Database, coupleId: string, day: string) {
  const [played, previous] = await db.batch<{ card_id: string; deck_id: string }>([
    db.prepare("SELECT card_id FROM garden_answers WHERE couple_id = ? AND round = 1 GROUP BY card_id HAVING COUNT(*) = 2").bind(coupleId),
    db.prepare("SELECT deck_id FROM garden_days WHERE couple_id = ? AND day < ? ORDER BY day DESC LIMIT 1").bind(coupleId, day),
  ]);
  return { played: played!.results.map((r) => r.card_id), previousDeck: previous!.results[0]?.deck_id };
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
    db.prepare(`INSERT INTO garden_days(couple_id, day, deck_id, card_id, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(couple_id, day) DO NOTHING`).bind(coupleId, day, card.deckId, card.id, now),
    select(),
  ]);
  return results[1]!.results[0]!;
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
  return { day: vnDay(now), today: state, swapLocked: !!locked,
    plants: DECKS.map((deck) => ({ deckId: deck.id, stage: 0 })), freshness: "fresh" };
}

