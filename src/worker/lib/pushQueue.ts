import type { Env } from "../env";
import { sendPush, type PushMessage, type PushResult, type PushRow, type PushTopic } from "./webpush";

// ADR 0010: one job is one device. A job never holds an endpoint, key, user id or locale.
export interface PushJob {
  /** push_subscriptions.id */
  id: string;
  topic: PushTopic;
  message: PushMessage;
  /** Epoch ms after which the push is dropped: enqueue time plus 24 hours. */
  expiresAt: number;
}

export const PUSH_LIFETIME_MS = 86400 * 1000;
const SEND_BATCH_LIMIT = 100;
const MAX_RETRIES = 3;
const BACKOFF_SECONDS = [30, 120, 480];

export function pushJob(id: string, topic: PushTopic, message: PushMessage, now = Date.now()): PushJob {
  return { id, topic, message, expiresAt: now + PUSH_LIFETIME_MS };
}

export async function enqueuePush(env: Env, jobs: PushJob[]): Promise<void> {
  for (let i = 0; i < jobs.length; i += SEND_BATCH_LIMIT) {
    const chunk = jobs.slice(i, i + SEND_BATCH_LIMIT);
    try { await env.PUSH_QUEUE.sendBatch(chunk.map((body) => ({ body }))); }
    catch { console.error("[bisou] push enqueue failed", chunk[0]!.topic, chunk.length); }
  }
}

type Outcome = PushResult["outcome"] | "dropped";

async function deliver(env: Env, job: PushJob): Promise<PushResult | { outcome: "dropped" }> {
  const now = Date.now();
  if (now >= job.expiresAt) return { outcome: "dropped" };
  const row = await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE id = ?")
    .bind(job.id).first<PushRow>();
  if (!row) return { outcome: "dropped" };
  return sendPush(env, row, job.message, { ttl: Math.floor((job.expiresAt - now) / 1000), topic: job.topic });
}

export async function consumePushBatch(batch: MessageBatch<PushJob>, env: Env): Promise<void> {
  const counts: Record<Outcome | "retried", number> = { sent: 0, gone: 0, retried: 0, dropped: 0, failed: 0, retry: 0 };
  await Promise.allSettled(batch.messages.map(async (message) => {
    let result: PushResult | { outcome: "dropped" };
    // A thrown error (D1, not the push service) is retried like a transient failure.
    try { result = await deliver(env, message.body); } catch { result = { outcome: "retry" }; }
    if (result.outcome !== "retry") {
      counts[result.outcome]++;
      message.ack();
      return;
    }
    const delay = ("retryAfter" in result ? result.retryAfter : undefined) ?? BACKOFF_SECONDS[message.attempts - 1] ?? BACKOFF_SECONDS.at(-1)!;
    if (message.attempts <= MAX_RETRIES && Date.now() + delay * 1000 < message.body.expiresAt) {
      counts.retried++;
      message.retry({ delaySeconds: delay });
    } else {
      counts.dropped++;
      message.ack();
    }
  }));
  console.log("[bisou] push batch", JSON.stringify({
    sent: counts.sent, gone: counts.gone, retried: counts.retried, dropped: counts.dropped, failed: counts.failed,
  }));
}
