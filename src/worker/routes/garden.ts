import { Hono, type Handler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { vnDay } from "../../shared/days";
import { answerText, CARDS, cardById, DECKS, drawCard, LEVEL_IDS, levelRank, type LevelAction, type RelationshipLevel, type ResponseChoice } from "../../shared/garden";
import type { AppEnv } from "../env";
import { changeLevels, levelsState, memberGuard, cardAccess, cardStates, drawInput, drawSeed, gardenDeck, gardenState, loadToday, stageAnswers } from "../lib/garden";
import { notifyGarden } from "../lib/notify";

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
  const current = await c.env.DB.prepare(`SELECT 1 FROM couple_members WHERE couple_id = ? AND user_id = ?
    AND (SELECT COUNT(*) FROM couple_members WHERE couple_id = ?) = 2`).bind(membership.couple_id, c.get("user").id, membership.couple_id).first();
  if (!current) return c.json({ error: "not_in_couple" }, 404);
});

garden.get("/", async (c) => c.json(await gardenState(c.env.DB, c.get("gardenCoupleId"), c.get("user").id, Date.now())));

garden.post("/levels", limitBody, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0
    || !["propose", "accept", "decline", "withdraw"].includes(body.action)
    || (body.action === "propose" && (!["placement", "revisit", "target"].includes(body.kind) || !LEVEL_IDS.includes(body.levelId)))
    || Object.keys(body).some((key) => !(body.action === "propose" ? ["action", "kind", "levelId", "revision"] : ["action", "revision"]).includes(key))) return c.json({ error: "invalid_body" }, 400);
  const couple = c.get("gardenCoupleId"), user = c.get("user").id;
  if (!await changeLevels(c.env.DB, couple, user, body as LevelAction)) return c.json({ error: "stale_levels" }, 409);
  return c.json({ levels: await levelsState(c.env.DB, couple, user) });
});

garden.get("/decks/:deckId", async (c) => {
  const deck = DECKS.find((d) => d.id === c.req.param("deckId"));
  if (!deck) return c.json({ error: "not_found" }, 404);
  return c.json(await gardenDeck(c.env.DB, c.get("gardenCoupleId"), c.get("user").id, deck.id, Date.now()));
});

garden.get("/stages/:levelId", async (c) => {
  const levelId = c.req.param("levelId") as RelationshipLevel;
  if (!LEVEL_IDS.includes(levelId)) return c.json({ error: "not_found" }, 404);
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const levels = await levelsState(c.env.DB, couple, user);
  if (!levels.placementComplete || !levels.furthestLevelId || levelRank(levelId) > levelRank(levels.furthestLevelId)) return c.json({ error: "not_found" }, 404);
  const cards = await stageAnswers(c.env.DB, couple, user, levelId);
  if (levelId === levels.selectedLevelId) {
    const today = await loadToday(c.env.DB, couple, Date.now(), user);
    if (today?.flipped && !cards.some((card) => card.cardId === today.card_id)) {
      cards.unshift(...await cardStates(c.env.DB, couple, user, [today.card_id]));
    }
  }
  return c.json({ cards });
});

garden.get("/stages/:levelId/decisions", async (c) => {
  const levelId = c.req.param("levelId") as RelationshipLevel;
  if (!LEVEL_IDS.includes(levelId)) return c.json({ error: "not_found" }, 404);
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const levels = await levelsState(c.env.DB, couple, user);
  if (!levels.placementComplete || !levels.furthestLevelId || levelRank(levelId) > levelRank(levels.furthestLevelId)) return c.json({ error: "not_found" }, 404);
  const ids = CARDS.filter((card) => card.kind === "decision" && card.levelId === levelId).map((card) => card.id);
  return c.json({ cards: await cardStates(c.env.DB, couple, user, ids) });
});

garden.post("/today/swap", limitBody, async (c) => {
  const body = await c.req.json().catch(() => null);
  const requested = typeof body?.cardId === "string" ? cardById(body.cardId) : undefined;
  if (!requested || requested.retired) return c.json({ error: "invalid_body" }, 400);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const now = Date.now();
  const today = await loadToday(db, couple, now, user);
  const state = () => gardenState(db, couple, user, now);
  if (!today || today.card_id !== requested.id) return c.json(await state());
  const locked = () => db.prepare("SELECT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) AS locked").bind(couple, today.card_id).first<number>("locked");
  if (await locked()) return c.json({ error: "swap_locked" }, 409);
  const card = drawCard({ ...await drawInput(db, couple, today.day), excludedCard: today.card_id, excludedDeck: today.deck_id }, await drawSeed(couple, today.day, today.swaps + 1));
  if (!card) return c.json({ error: "no_other_card" }, 409);
  const access = cardAccess(card);
  const updated = await db.prepare(`UPDATE garden_days SET card_id = ?, deck_id = ?, swaps = swaps + 1,
    swapped_cards = json_set(swapped_cards, ?, ?) WHERE couple_id = ? AND day = ? AND card_id = ?
    AND ${access} AND ${memberGuard}
    AND NOT EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1)
    AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1) < 2`)
    .bind(card.id, card.deckId, `$."${today.card_id}"`, `${today.day}:${String(today.swaps + 1).padStart(12, "0")}`, couple, today.day, today.card_id, ...(access === "1" ? [] : [couple]), couple, user, couple, couple, today.card_id, couple, card.id).run();
  if (!updated.meta.changes) {
    const current = await loadToday(db, couple, now, user);
    if (current?.card_id === today.card_id && await locked()) return c.json({ error: "swap_locked" }, 409);
  }
  return c.json(await state());
});

garden.put("/cards/:cardId/star", async (c) => {
  const card = cardById(c.req.param("cardId"));
  if (!card || card.kind !== "ordinary") return c.json({ error: "not_found" }, 404);
  const db = c.env.DB, couple = c.get("gardenCoupleId"), user = c.get("user").id;
  const access = cardAccess(card);
  const result = await db.prepare(`INSERT INTO garden_stars(couple_id, card_id, starred_at) SELECT ?, ?, ?
    WHERE ${access} AND ${memberGuard}
    AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1
      AND flipped_day IS NOT NULL AND user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)) = 2
    ON CONFLICT(couple_id, card_id) DO NOTHING`)
    .bind(couple, card.id, Date.now(), ...(access === "1" ? [] : [couple]), couple, user, couple, couple, card.id, couple).run();
  const state = (await cardStates(db, couple, user, [card.id]))[0]!;
  if (!result.meta.changes && !state.starred) return c.json({ error: "not_found" }, 404);
  return c.json({ card: state });
});

garden.delete("/cards/:cardId/star", async (c) => {
  const card = cardById(c.req.param("cardId"));
  if (!card || card.kind !== "ordinary") return c.json({ error: "not_found" }, 404);
  const db = c.env.DB, couple = c.get("gardenCoupleId"), user = c.get("user").id;
  await db.prepare(`DELETE FROM garden_stars WHERE couple_id = ? AND card_id = ? AND ${memberGuard}`)
    .bind(couple, card.id, couple, user, couple).run();
  return c.json({ card: (await cardStates(db, couple, user, [card.id]))[0]! });
});

const saveAnswer: Handler<GardenEnv> = async (c) => {
  const card = cardById(c.req.param("cardId") ?? "");
  if (!card || (c.req.method === "POST" && card.retired)) return c.json({ error: "not_found" }, 404);
  const existing = await c.env.DB.prepare(`SELECT body, response_choice, flipped_day FROM garden_answers WHERE couple_id = ? AND card_id = ? AND user_id = ?
    AND round = 1`).bind(c.get("gardenCoupleId"), card.id, c.get("user").id).first();
  if (c.req.method === "PUT" && !existing) return c.json({ error: "not_found" }, 404);
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !["text", "choice"].includes(key))
    || Object.hasOwn(raw, "text") === Object.hasOwn(raw, "choice")) return c.json({ error: "invalid_answer" }, 400);
  const choice: ResponseChoice | null = raw.choice ?? null;
  if (Object.hasOwn(raw, "choice") && (card.kind !== "decision" || !["no_details", "later_not_applicable"].includes(choice!))) return c.json({ error: "invalid_answer" }, 400);
  const parsed = choice === null ? answerText(raw.text) : { text: null };
  if ("error" in parsed) return c.json(parsed, 400);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const now = Date.now();
  const day = vnDay(now);
  const restoring = !!existing && existing.body === null && existing.response_choice === null && existing.flipped_day !== null;
  const updating = c.req.method === "PUT" || restoring;
  const access = cardAccess(card);
  const accessValues = access === "1" ? [] : [couple];
  if (updating) {
    const result = await db.prepare(`UPDATE garden_answers SET body = ?, response_choice = ?, updated_at = ?,
      edited_after_flip = CASE WHEN flipped_day IS NOT NULL AND (body IS NOT ? OR response_choice IS NOT ?) THEN 1 ELSE edited_after_flip END
      WHERE couple_id = ? AND card_id = ? AND round = 1 AND user_id = ? ${restoring ? "AND body IS NULL AND response_choice IS NULL AND flipped_day IS NOT NULL" : ""} AND ${access} AND ${memberGuard}`)
      .bind(parsed.text, choice, now, parsed.text, choice, couple, card.id, user, ...accessValues, couple, user, couple).run();
    if (!result.meta.changes) return restoring ? c.json({ error: "already_answered" }, 409) : c.json({ error: "not_found" }, 404);
  } else {
    let isToday = false;
    if (card.kind === "ordinary") {
      const deck = await gardenDeck(db, couple, user, card.deckId, now);
      const today = await loadToday(db, couple, now, user);
      isToday = today?.card_id === card.id;
      if (!isToday && deck.active?.cardId !== card.id) return c.json({ error: "not_found" }, 404);
    }
    // D1 batches run transactionally; concurrent saves can claim the daily flip only once.
    // https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
    let changes: D1Result[];
    const ownSubmission = `EXISTS(SELECT 1 FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND user_id = ?)`;
    const submissionValues = [couple, card.id, user];
    try {
      changes = await db.batch([
        db.prepare(`INSERT INTO garden_answers(couple_id, card_id, user_id, body, response_choice, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${access} AND ${memberGuard}`)
          .bind(couple, card.id, user, parsed.text, choice, now, now, ...accessValues, couple, user, couple),
        db.prepare(`UPDATE garden_answers SET flipped_day = ? WHERE couple_id = ? AND card_id = ? AND round = 1
          AND flipped_day IS NULL AND ${ownSubmission} AND ${access} AND ${memberGuard}
          AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1
            AND user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)) = 2`)
          .bind(day, couple, card.id, ...submissionValues, ...accessValues, couple, user, couple, couple, card.id, couple),
        ...(card.kind === "ordinary" ? [
          db.prepare(`UPDATE garden_days SET flipped = 1 WHERE couple_id = ? AND day = ? AND card_id = ? AND flipped = 0
            AND ${ownSubmission} AND ${access} AND ${memberGuard}
            AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND flipped_day IS NOT NULL) = 2 RETURNING day`)
            .bind(couple, day, card.id, ...submissionValues, ...accessValues, couple, user, couple, couple, card.id),
          db.prepare(`INSERT OR IGNORE INTO garden_growth(couple_id, deck_id, day)
            SELECT ?, ?, ? WHERE ${ownSubmission} AND ${memberGuard}
            AND (SELECT COUNT(*) FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND flipped_day = ?) = 2`)
            .bind(couple, card.deckId, day, ...submissionValues, ...accessValues, couple, user, couple, couple, card.id, day),
        ] : []),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: garden_answers.couple_id, garden_answers.card_id, garden_answers.round, garden_answers.user_id")) return c.json({ error: "already_answered" }, 409);
      throw error;
    }
    if (!changes[0]!.meta.changes) return c.json({ error: "not_found" }, 404);
    if (isToday) c.executionCtx.waitUntil(notifyGarden(c.env, couple, user));
  }
  const [state] = await cardStates(db, couple, user, [card.id]);
  return c.json({ card: state }, c.req.method === "PUT" ? 200 : 201);
};
garden.post("/cards/:cardId/answer", limitBody, saveAnswer);
garden.put("/cards/:cardId/answer", limitBody, saveAnswer);

garden.delete("/cards/:cardId/answer", limitBody, async (c) => {
  const card = cardById(c.req.param("cardId"));
  if (!card) return c.json({ error: "not_found" }, 404);
  const db = c.env.DB;
  const couple = c.get("gardenCoupleId");
  const user = c.get("user").id;
  const access = cardAccess(card);
  const accessValues = access === "1" ? [] : [couple];
  const changes = await db.batch([
    db.prepare(`UPDATE garden_answers SET body = NULL, response_choice = NULL, updated_at = ? WHERE couple_id = ? AND card_id = ? AND round = 1
      AND user_id = ? AND flipped_day IS NOT NULL AND (body IS NOT NULL OR response_choice IS NOT NULL)
      AND ${access} AND ${memberGuard}`).bind(Date.now(), couple, card.id, user, ...accessValues, couple, user, couple),
    db.prepare(`DELETE FROM garden_answers WHERE couple_id = ? AND card_id = ? AND round = 1 AND user_id = ? AND flipped_day IS NULL AND ${access} AND ${memberGuard}`).bind(couple, card.id, user, ...accessValues, couple, user, couple),
  ]);
  if (!changes.some((result) => result.meta.changes)) return c.json({ error: "not_found" }, 404);
  return c.json({ card: (await cardStates(db, couple, user, [card.id]))[0] });
});
