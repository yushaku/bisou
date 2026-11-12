import { Hono } from "hono";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { boxList, boxDetail } from "../lib/cardBoxes";
export const cardBoxes = new Hono<AppEnv>();
cardBoxes.use("*", async (c, next) => {
  const membership = await findMembership(c.env.DB, c.get("user").id);
  if (membership?.memberCount !== 2) return c.json({ error: "not_in_couple" }, 404);
  await next();
});
cardBoxes.get("/", c => c.json({ boxes: boxList() }));
cardBoxes.get("/:boxId", c => {
  const detail = boxDetail(c.req.param("boxId"));
  return detail ? c.json(detail) : c.json({ error: "not_found" }, 404);
});
