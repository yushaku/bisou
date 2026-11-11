import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushJob } from "../src/worker/lib/pushQueue";
import { enqueuePush } from "../src/worker/lib/pushQueue";
import { call, paired, resetDb, waitForBackground } from "./helpers";
import { decrypt, device, mockPush, runPushCron, runPushQueue, stored, subscribe } from "./push-helpers";

const NOW = Date.parse("2026-11-07T08:00:00Z");
const DAY = 86400 * 1000;
beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(NOW); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

async function row(d: Awaited<ReturnType<typeof device>>) {
  return (await stored(d.body.endpoint)) as { id: string; failures: number; last_success_at: number | null };
}
function job(id: string, over: Partial<PushJob> = {}): PushJob {
  return { id, topic: "journal", message: { title: "T", url: "/journal", tag: "journal" }, expiresAt: NOW + DAY, ...over };
}
async function subscribed() {
  const { a, b } = await paired(); const d = await device("b"); await subscribe(b, d);
  return { a, b, d, id: (await row(d)).id };
}

describe("producers enqueue jobs", () => {
  it("a journal entry enqueues one job per partner device with no endpoint, keys or user id", async () => {
    const { a, b, d, id } = await subscribed();
    await subscribe(a, await device("own"));
    const send = mockPush();
    await call("POST", "/api/journal", { cookie: a.cookie, body: { date: "2023-02-12", text: "secret text", photoIds: [] } }); await waitForBackground();
    expect(send.queued).toEqual([{ id, topic: "journal", message: { title: "An vừa viết nhật ký", url: "/journal", tag: "journal" }, expiresAt: NOW + DAY }]);
    const text = JSON.stringify(send.queued);
    for (const secret of [d.body.endpoint, d.body.keys.auth, d.body.keys.p256dh, b.id, a.id, "secret text", "locale"]) expect(text).not.toContain(secret);
  });

  it("the event cron enqueues claimed devices once and a rerun enqueues nothing", async () => {
    const { a, b } = await paired();
    await call("PATCH", "/api/couple", { cookie: a.cookie, body: { startDate: "2023-02-12" } });
    const ad = await device("an"), bd = await device("binh"); await subscribe(a, ad); await subscribe(b, bd);
    const send = mockPush();
    await runPushCron("2027-02-11T20:00:00+07:00");
    expect(send.queued.map((j) => j.id).sort()).toEqual([(await row(ad)).id, (await row(bd)).id].sort());
    expect(send.queued.every((j) => j.topic === "events" && j.expiresAt === NOW + DAY && j.message.tag === "events")).toBe(true);
    await runPushCron("2027-02-11T20:00:00+07:00");
    expect(send.queued).toHaveLength(2);
  });

  it("splits more than 100 jobs into sendBatch calls of at most 100 and skips an empty list", async () => {
    const queue = vi.spyOn(env.PUSH_QUEUE, "sendBatch").mockResolvedValue({} as QueueSendBatchResponse);
    await enqueuePush(env, []);
    expect(queue).not.toHaveBeenCalled();
    await enqueuePush(env, Array.from({ length: 250 }, (_, i) => job(`d${i}`)));
    expect(queue.mock.calls.map(([messages]) => [...messages].length)).toEqual([100, 100, 50]);
  });

  it("a failed sendBatch is logged with the topic and count only and does not throw", async () => {
    vi.spyOn(env.PUSH_QUEUE, "sendBatch").mockRejectedValue(new Error("secret https://fcm.googleapis.com/x"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await enqueuePush(env, [job("a"), job("b")]);
    expect(error.mock.calls).toEqual([["[bisou] push enqueue failed", "journal", 2]]);
  });

  it("without the VAPID key nothing is enqueued", async () => {
    const { a } = await subscribed();
    const queue = vi.spyOn(env.PUSH_QUEUE, "sendBatch");
    const { notifyJournal, notifyGarden } = await import("../src/worker/lib/notify");
    const bare = { ...env, VAPID_PRIVATE_KEY: undefined };
    await notifyJournal(bare, "c", a.id); await notifyGarden(bare, "c", a.id);
    expect(queue).not.toHaveBeenCalled();
  });
});

describe("consumer", () => {
  it("acks a sent push, clears failures, and sends ttl from expiresAt", async () => {
    const { d, id } = await subscribed();
    await env.DB.prepare("UPDATE push_subscriptions SET failures = 2 WHERE id = ?").bind(id).run();
    const send = mockPush(201);
    const [result] = await runPushQueue([job(id, { expiresAt: NOW + 3600 * 1000 + 999 })]);
    expect(result!.explicitAcks).toEqual(["msg-0"]); expect(result!.retryMessages).toEqual([]);
    expect(send.sent[0]!.headers.get("ttl")).toBe("3600");
    expect(send.sent[0]!.headers.get("topic")).toBe("journal");
    expect(await decrypt(send.sent[0]!.body, d)).toEqual({ title: "T", url: "/journal", tag: "journal" });
    expect(await row(d)).toMatchObject({ failures: 0, last_success_at: NOW });
  });

  it.each([401, 403, 404, 410])("acks and deletes the device on %s", async (status) => {
    const { d, id } = await subscribed(); mockPush(status);
    const [result] = await runPushQueue([job(id)]);
    expect(result!.explicitAcks).toEqual(["msg-0"]); expect(result!.retryMessages).toEqual([]);
    expect(await stored(d.body.endpoint)).toBeNull();
  });

  it("acks other statuses as failed and adds one failure", async () => {
    const { d, id } = await subscribed(); mockPush(400);
    const [result] = await runPushQueue([job(id)]);
    expect(result!.explicitAcks).toEqual(["msg-0"]); expect(result!.retryMessages).toEqual([]);
    expect((await row(d)).failures).toBe(1);
  });

  it.each([[1, 30], [2, 120], [3, 480]])("retries a 503 on attempt %s after %s seconds", async (attempts, delay) => {
    const { d, id } = await subscribed(); mockPush(503);
    const [result] = await runPushQueue([job(id)], attempts);
    expect(result!.retries).toEqual([{ msgId: "msg-0", delaySeconds: delay }]); expect(result!.explicitAcks).toEqual([]);
    expect((await row(d)).failures).toBe(1);
  });

  it("retries a network error and never logs the endpoint or the error message", async () => {
    const { d, id } = await subscribed();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(`connect failed ${d.body.endpoint}`));
    const log = vi.spyOn(console, "log"), error = vi.spyOn(console, "error");
    const [result] = await runPushQueue([job(id)]);
    expect(result!.retries).toEqual([{ msgId: "msg-0", delaySeconds: 30 }]);
    const logs = JSON.stringify([log.mock.calls, error.mock.calls]);
    for (const secret of [d.body.endpoint, d.body.keys.auth, d.body.keys.p256dh, "connect failed"]) expect(logs).not.toContain(secret);
  });

  it("honours Retry-After seconds and HTTP dates on 429", async () => {
    const { id } = await subscribed();
    const fetch = vi.spyOn(globalThis, "fetch");
    fetch.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "7" } }));
    expect((await runPushQueue([job(id)]))[0]!.retries).toEqual([{ msgId: "msg-0", delaySeconds: 7 }]);
    fetch.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": new Date(NOW + 90_000).toUTCString() } }));
    expect((await runPushQueue([job(id)]))[0]!.retries).toEqual([{ msgId: "msg-0", delaySeconds: 90 }]);
    fetch.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "nonsense" } }));
    expect((await runPushQueue([job(id)], 2))[0]!.retries).toEqual([{ msgId: "msg-0", delaySeconds: 120 }]);
  });

  it("acks instead of retrying when attempts are exhausted or the retry would pass expiry", async () => {
    const { id } = await subscribed(); mockPush(503);
    const [exhausted] = await runPushQueue([job(id)], 4);
    expect(exhausted!.explicitAcks).toEqual(["msg-0"]); expect(exhausted!.retryMessages).toEqual([]);
    const [late] = await runPushQueue([job(id, { expiresAt: NOW + 30_000 })]);
    expect(late!.explicitAcks).toEqual(["msg-0"]); expect(late!.retryMessages).toEqual([]);
  });

  it("acks and does not send an expired job", async () => {
    const { id } = await subscribed(); const send = mockPush();
    const [result] = await runPushQueue([job(id, { expiresAt: NOW })]);
    expect(result!.explicitAcks).toEqual(["msg-0"]); expect(send.sent).toHaveLength(0);
  });

  it("acks and does not send when the device row was deleted", async () => {
    const { d, id } = await subscribed(); const send = mockPush();
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(id).run();
    const [result] = await runPushQueue([job(id)]);
    expect(result!.explicitAcks).toEqual(["msg-0"]); expect(send.sent).toHaveLength(0);
    expect(await stored(d.body.endpoint)).toBeNull();
  });

  it("handles the messages of a batch in parallel and logs counts only", async () => {
    const { a, b } = await paired(); const ids: string[] = [];
    for (const [who, name] of [[a, "p1"], [b, "p2"], [a, "p3"]] as const) { const d = await device(name); await subscribe(who, d); ids.push((await row(d)).id); }
    let active = 0, peak = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      peak = Math.max(peak, ++active); await new Promise((resolve) => setTimeout(resolve, 20)); active--;
      return new Response(null, { status: 201 });
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const [result] = await runPushQueue([...ids.map((id) => job(id)), job("missing"), job("old", { expiresAt: NOW - 1 })]);
    expect(peak).toBe(3);
    expect(result!.explicitAcks).toHaveLength(5);
    expect(log.mock.calls).toEqual([["[bisou] push batch", JSON.stringify({ sent: 3, gone: 0, retried: 0, dropped: 2, failed: 0 })]]);
  });
});
