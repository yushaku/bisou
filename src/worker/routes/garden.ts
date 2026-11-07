import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { vnDay } from "../../shared/days";
import { answerText, cardById, DECKS, drawCard } from "../../shared/garden";
import type { AppEnv } from "../env";
import { cardStates, drawInput, drawSeed, gardenDeck, gardenState, loadToday } from "../lib/garden";

type GardenEnv = AppEnv & { Variables: { gardenCoupleId: string } };
export const garden = new Hono<GardenEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });

garden.use("*", async (c, next) => {
  const membership = await c.env.DB.prepare(`SELECT m.couple_id FROM couple_members m WHERE m.user_id = ?
    AND (SELECT COUNT(*) FROM couple_members x WHERE x.couple_id = m.couple_id) = 2`)
    .bind(c.get("user").id).first<{ couple_id: string }>();
  if (!membership) return c.json({ error: "not_in_couple" }, 404);
  c.set("gardenCoupleId", membership.couple_id);
  await next();
});

garden.get("/", async (c) => c.json(await gardenState(c.env.DB, c.get("gardenCoupleId"), c.get("user").id, Date.now())));

garden.get("/decks/:deckId", async (c) => {
  const deck = DECKS.find((d) => d.id === c.req.param("deckId"));
  if (!deck) return c.json({ error: "not_found" }, 404);
  return c.json(await gardenDeck(c.env.DB, c.get("gardenCoupleId"), c.get("user").id, deck.id, Date.now()));
});

garden.post("/today/swap", limitBody, async (c) => {
  const body = await c.req.json().catch(() => null);
  const requested = typeof body?.cardId === "string" ? cardById(body.cardId) : undefined;
  if (!requested || requested.retired) return c.json({ error: "invalid_body" }, 400);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const now = Date.now();
  const today = await loadToday(db, couple, now);
  const state = () => gardenState(db, couple, user, now);
  if (!today || today.card_id !== requested.id) return c.json(await state());
  const locked = () => db.prepare("SELECT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) AS locked").bind(couple, today.card_id).first<number>("locked");
  if (await locked()) return c.json({ error: "swap_locked" }, 409);
  const card = drawCard({ ...await drawInput(db, couple, today.day), excludedCard: today.card_id, excludedDeck: today.deck_id }, await drawSeed(couple, today.day, today.swaps + 1));
  if (!card) return c.json({ error: "no_other_card" }, 409);
  const updated = await db.prepare(`UPDATE garden_days SET card_id = ?, deck_id = ?, swaps = swaps + 1,
    swapped_cards = json_set(swapped_cards, ?, ?) WHERE couple_id = ? AND day = ? AND card_id = ?
    AND NOT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1)
    AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) < 2`)
    .bind(card.id, card.deckId, `$."${today.card_id}"`, `${today.day}:${String(today.swaps + 1).padStart(12, "0")}`, couple, today.day, today.card_id, couple, today.card_id, couple, card.id).run();
  if (!updated.meta.changes) {
    const current = await loadToday(db, couple, now);
    if (current?.card_id === today.card_id && await locked()) return c.json({ error: "swap_locked" }, 409);
  }
  return c.json(await state());
});

const saveAnswer: Handler<GardenEnv> = async (c) => {
  const card = cardById(c.req.param("cardId") ?? "");
  if (!card || card.retired) return c.json({ error: "not_found" }, 404);
  const raw = await c.req.json().catch(() => null);
  const parsed = answerText(raw?.text);
  if ("error" in parsed) return c.json(parsed, 400);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const now = Date.now();
  const day = vnDay(now);
  const updating = c.req.method === "PUT";
  if (updating) {
    const result = await db.prepare(`UPDATE garden_answers SET body = ?, updated_at = ?,
      edited_after_flip = CASE WHEN flipped_day IS NOT NULL AND body <> ? THEN 1 ELSE edited_after_flip END
      WHERE couple_id = ? AND card_id = ? AND round = 1 AND user_id = ? AND body IS NOT NULL`)
      .bind(parsed.text, now, parsed.text, couple, card.id, user).run();
    if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  } else {
    // D1 batches run transactionally; concurrent saves can claim the daily flip only once.
    // https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
    const changes = await db.batch([
      db.prepare(`INSERT INTO garden_answers(couple_id, card_id, user_id, body, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(couple_id, card_id, round, user_id) DO NOTHING`)
        .bind(couple, card.id, user, parsed.text, now, now),
      db.prepare(`UPDATE garden_answers SET flipped_day = ? WHERE couple_id = ? AND card_id = ? AND round = 1
        AND flipped_day IS NULL AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) = 2`)
        .bind(day, couple, card.id, couple, card.id),
      db.prepare(`UPDATE garden_days SET flipped = 1 WHERE couple_id = ? AND day = ? AND card_id = ? AND flipped = 0
        AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) = 2 RETURNING day`)
        .bind(couple, day, card.id, couple, card.id),
      db.prepare(`INSERT OR IGNORE INTO garden_growth(couple_id, deck_id, day)
        SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND flipped_day = ?) = 2`)
        .bind(couple, card.deckId, day, couple, card.id, day),
    ]);
    if (!changes[0]!.meta.changes) return c.json({ error: "already_answered" }, 409);
  }
  const [state] = await cardStates(db, couple, user, [card.id]);
  return c.json({ card: state }, updating ? 200 : 201);
};
garden.post("/cards/:cardId/answer", limitBody, saveAnswer);
garden.put("/cards/:cardId/answer", limitBody, saveAnswer);

garden.delete("/cards/:cardId/answer", async (c) => {
  const card = cardById(c.req.param("cardId"));
  if (!card) return c.json({ error: "not_found" }, 404);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const changes = await db.batch([
    db.prepare(`UPDATE garden_answers SET body = NULL, updated_at = ? WHERE couple_id = ? AND card_id = ? AND round = 1
      AND user_id = ? AND flipped_day IS NOT NULL AND body IS NOT NULL`).bind(Date.now(), couple, card.id, user),
    db.prepare("DELETE FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND user_id = ? AND flipped_day IS NULL").bind(couple, card.id, user),
  ]);
  if (!changes.some((result) => result.meta.changes)) return c.json({ error: "not_found" }, 404);
  return c.json({ card: (await cardStates(db, couple, user, [card.id]))[0] });
});
