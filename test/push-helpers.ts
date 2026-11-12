import { createExecutionContext, createMessageBatch, env, getQueueResult } from "cloudflare:test";
import { expect, vi } from "vitest";
import { fromBase64Url, toBase64Url } from "../src/worker/lib/crypto";
import { call, type TestUser } from "./helpers";
import worker from "../src/worker/index";
import type { PushJob } from "../src/worker/lib/pushQueue";

export async function runPushCron(time: string) {
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => { pending.push(p); }, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
  worker.scheduled({ scheduledTime: Date.parse(time), cron: "* * * * *", noRetry: () => {} } as ScheduledController, env, ctx);
  await Promise.all(pending);
}

export async function device(id: string, kinds = { journal: true, reminders: true }) {
  const keys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    privateKey: keys.privateKey,
    body: { endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { p256dh: toBase64Url(publicKey), auth: toBase64Url(auth) }, ...kinds },
  };
}

export async function subscribe(who: TestUser, d: Awaited<ReturnType<typeof device>>) {
  const res = await call("PUT", "/api/push/subscription", { cookie: who.cookie, body: d.body });
  expect(res.status).toBe(200);
  return res;
}

/** Runs jobs through the worker's queue handler, as Queues would: batches of five, first delivery unless `attempts` is given. */
export async function runPushQueue(jobs: PushJob[], attempts = 1) {
  const results = [];
  for (let i = 0; i < jobs.length; i += 5) {
    const batch = createMessageBatch<PushJob>("bisou", jobs.slice(i, i + 5).map((body, n) => ({ id: `msg-${i + n}`, timestamp: Date.now(), attempts, body })));
    // The plugin's QueueResult drops the per message delay, so record the retry calls here.
    const retries: { msgId: string; delaySeconds?: number }[] = [];
    for (const message of batch.messages) {
      const retry = message.retry.bind(message);
      message.retry = (options) => { retries.push({ msgId: message.id, delaySeconds: options?.delaySeconds }); retry(options); };
    }
    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    results.push({ ...await getQueueResult(batch, ctx), retries });
  }
  return results;
}

/**
 * Stands in for the push service and for Queues: records every job given to PUSH_QUEUE.sendBatch in
 * `queued`, then feeds it through the consumer at once so `sent` holds what reached the push service.
 */
export function mockPush(status = 201) {
  const sent: { endpoint: string; headers: Headers; body: Uint8Array<ArrayBuffer> }[] = [];
  const queued: PushJob[] = [];
  const queue = vi.spyOn(env.PUSH_QUEUE, "sendBatch").mockImplementation(async (messages) => {
    const jobs = [...messages].map((message) => message.body);
    queued.push(...jobs);
    await runPushQueue(jobs);
    return {} as QueueSendBatchResponse;
  });
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    expect(init?.redirect).toBe("manual");
    // workerd rejects redirect "error" here, as the real fetch does at the edge.
    new Request(String(input), { method: init?.method, redirect: init?.redirect });
    sent.push({ endpoint: String(input), headers: new Headers(init?.headers), body: new Uint8Array(await new Response(init?.body).arrayBuffer()) });
    return new Response(null, { status });
  });
  return { sent, queued, spy, queue };
}

// Receiver side uses HMAC extract/expand independently of the sender's HKDF implementation.
export async function decrypt(body: Uint8Array<ArrayBuffer>, d: Awaited<ReturnType<typeof device>>) {
  const hmac = async (key: Uint8Array<ArrayBuffer>, bytes: Uint8Array<ArrayBuffer>) => {
    const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", imported, bytes));
  };
  const encode = (s: string) => new TextEncoder().encode(s);
  expect(new DataView(body.buffer, body.byteOffset).getUint32(16)).toBe(4096);
  expect(body[20]).toBe(65);
  const asPublic = body.slice(21, 86);
  const key = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: key }, d.privateKey, 256));
  const prkKey = await hmac(fromBase64Url(d.body.keys.auth), shared);
  const ikm = await hmac(prkKey, new Uint8Array([...encode("WebPush: info\0"), ...fromBase64Url(d.body.keys.p256dh), ...asPublic, 1]));
  const prk = await hmac(body.slice(0, 16), ikm);
  const cek = (await hmac(prk, new Uint8Array([...encode("Content-Encoding: aes128gcm\0"), 1]))).slice(0, 16);
  const nonce = (await hmac(prk, new Uint8Array([...encode("Content-Encoding: nonce\0"), 1]))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, body.slice(86)));
  expect(plain.at(-1)).toBe(2);
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
}

export async function stored(endpoint: string) {
  return env.DB.prepare("SELECT * FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).first();
}
