import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { PushSubscriptionInput } from "../../shared/types";
import type { AppEnv } from "../env";
import { findMembership } from "../lib/couples";
import { fromBase64Url } from "../lib/crypto";
import { isPushEndpoint, publicKeyFromJwk } from "../lib/webpush";

export const push = new Hono<AppEnv>();
push.onError((_error, c) => {
  console.error("[bisou] push subscription failed");
  return c.json({ error: "server_error" }, 500);
});
push.use("*", bodyLimit({ maxSize: 4096, onError: (c) => c.json({ error: "body_too_large" }, 413) }));

push.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT endpoint, journal, reminders FROM push_subscriptions WHERE user_id = ?")
    .bind(c.get("user").id).all<{ endpoint: string; journal: number; reminders: number }>();
  return c.json({
    publicKey: c.env.VAPID_PRIVATE_KEY ? publicKeyFromJwk(JSON.parse(c.env.VAPID_PRIVATE_KEY)) : null,
    devices: results.map((row) => ({ endpoint: row.endpoint, journal: Boolean(row.journal), reminders: Boolean(row.reminders) })),
  });
});

async function readSubscription(body: unknown): Promise<PushSubscriptionInput | null> {
  if (!body || typeof body !== "object") return null;
  const value = body as Partial<PushSubscriptionInput>;
  if (typeof value.endpoint !== "string" || !isPushEndpoint(value.endpoint)
    || typeof value.journal !== "boolean" || typeof value.reminders !== "boolean"
    || typeof value.keys?.p256dh !== "string" || typeof value.keys?.auth !== "string") return null;
  try {
    const key = fromBase64Url(value.keys.p256dh);
    if (key.length !== 65 || key[0] !== 4 || fromBase64Url(value.keys.auth).length !== 16) return null;
    await crypto.subtle.importKey("raw", key, { name: "ECDH", namedCurve: "P-256" }, false, []);
    return value as PushSubscriptionInput;
  } catch { return null; }
}

push.put("/subscription", async (c) => {
  const userId = c.get("user").id;
  if ((await findMembership(c.env.DB, userId))?.memberCount !== 2) return c.json({ error: "not_in_couple" }, 404);
  const body = await readSubscription(await c.req.json().catch(() => null));
  if (!body) return c.json({ error: "invalid_subscription" }, 400);
  const { endpoint, keys, journal, reminders } = body;
  if (!journal && !reminders) {
    await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").bind(endpoint, userId).run();
    return c.json({ device: null });
  }
  if (!c.env.VAPID_PRIVATE_KEY) return c.json({ error: "push_unavailable" }, 503);
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (
      SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint <> ? ORDER BY created_at DESC LIMIT -1 OFFSET 9
    )`).bind(userId, endpoint),
    c.env.DB.prepare(`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, journal, reminders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET
      id = excluded.id, user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      journal = excluded.journal, reminders = excluded.reminders,
      journal_slot = CASE WHEN user_id = excluded.user_id THEN journal_slot ELSE NULL END,
      reminder_slot = CASE WHEN user_id = excluded.user_id THEN reminder_slot ELSE NULL END,
      created_at = excluded.created_at, failures = 0, last_success_at = NULL`)
      .bind(crypto.randomUUID(), userId, endpoint, keys.p256dh, keys.auth, Number(journal), Number(reminders), Date.now()),
  ]);
  return c.json({ device: { endpoint, journal, reminders } });
});

push.delete("/subscription", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (typeof body?.endpoint !== "string" || !isPushEndpoint(body.endpoint)) return c.json({ error: "invalid_subscription" }, 400);
  await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?")
    .bind(body.endpoint, c.get("user").id).run();
  return c.json({ ok: true });
});
