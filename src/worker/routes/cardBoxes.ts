import { Hono } from "hono";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { boxList, boxDetail } from "../lib/cardBoxes";
export const cardBoxes = new Hono<AppEnv & { Variables: { coupleId: string; unlocked: Set<string> } }>();
cardBoxes.use("*", async (c, next) => {
  const membership = await findMembership(c.env.DB, c.get("user").id);
  if (membership?.memberCount !== 2) return c.json({ error: "not_in_couple" }, 404);
  c.set("coupleId", membership.coupleId);
  const rows = await c.env.DB.prepare("SELECT box_id FROM card_box_unlocks WHERE couple_id = ?").bind(membership.coupleId).all<{ box_id: string }>();
  c.set("unlocked", new Set(rows.results.map(row => row.box_id)));
  await next();
});
cardBoxes.get("/", c => c.json({ boxes: boxList(c.get("unlocked")) }));
cardBoxes.get("/:boxId", c => {
  const detail = boxDetail(c.req.param("boxId"), c.get("unlocked"));
  return detail ? c.json(detail) : c.json({ error: "not_found" }, 404);
});
cardBoxes.post("/:boxId/unlock", async c => {
  const boxId = c.req.param("boxId");
  const detail = boxDetail(boxId);
  if (!detail || detail.box.open) return c.json({ error: "not_found" }, 404);
  await c.env.DB.prepare("INSERT OR IGNORE INTO card_box_unlocks (couple_id, box_id, unlocked_at) VALUES (?, ?, ?)").bind(c.get("coupleId"), boxId, Date.now()).run();
  c.get("unlocked").add(boxId);
  return c.json(boxDetail(boxId, c.get("unlocked"))!);
});
