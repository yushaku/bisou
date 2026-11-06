import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { earliestDay } from "../../shared/days";
import { EVENTS_MAX, validateEvent } from "../../shared/events";
import type { AppEnv } from "../env";
import { findMembership, loadCouple } from "../lib/couples";

type EventEnv = AppEnv & { Variables: { eventCoupleId: string } };
export const coupleEvents = new Hono<EventEnv>();
const limitBody = bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "body_too_large" }, 413) });

coupleEvents.use("*", async (c, next) => {
  const membership = await findMembership(c.env.DB, c.get("user").id);
  if (!membership || membership.memberCount < 2) return c.json({ error: "not_in_couple" }, 404);
  // Scope comes from the session, never from the request body.
  c.set("eventCoupleId", membership.coupleId);
  await next();
});

coupleEvents.post("/", limitBody, async (c) => {
  const now = Date.now();
  const earliest = earliestDay(now);
  const parsed = validateEvent(await c.req.json().catch(() => null), earliest);
  if ("error" in parsed) return c.json(parsed, 400);
  const { title, date, repeat, icon } = parsed.input;
  const couple = c.get("eventCoupleId");
  const saved = await c.env.DB.prepare(`INSERT INTO couple_events (id, couple_id, title, event_date, repeats, icon, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM couple_events
    WHERE couple_id = ? AND (repeats = 'yearly' OR event_date >= ?)) < ?`)
    .bind(crypto.randomUUID(), couple, title, date, repeat, icon, now, now, couple, earliest, EVENTS_MAX).run();
  if (!saved.meta.changes) return c.json({ error: "too_many_events" }, 409);
  return c.json({ couple: await loadCouple(c.env.DB, c.get("user").id, now) }, 201);
});
