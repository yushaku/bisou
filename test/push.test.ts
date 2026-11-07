import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/worker/app";
import { call, paired, resetDb, user, waitForBackground } from "./helpers";
import { decrypt, device, mockPush, stored, subscribe } from "./push-helpers";

beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T08:00:00Z")); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

describe("push subscriptions", () => {
  it("AC14, AC15, R2, R28, R30: lists only own devices, updates kinds and deletes when both are off", async () => {
    const { a, b } = await paired();
    const d = await device("a");
    await subscribe(a, d);
    const state = await (await call("GET", "/api/push", { cookie: a.cookie })).json<any>();
    expect(state.publicKey).toMatch(/^[\w-]{87}$/);
    expect(state.devices).toEqual([{ endpoint: d.body.endpoint, journal: true, reminders: true }]);
    expect((await (await call("GET", "/api/push", { cookie: b.cookie })).json<any>()).devices).toEqual([]);
    d.body.journal = false;
    expect(await (await subscribe(a, d)).json()).toEqual({ device: { endpoint: d.body.endpoint, journal: false, reminders: true } });
    d.body.reminders = false;
    expect(await (await subscribe(a, d)).json()).toEqual({ device: null });
    expect(await stored(d.body.endpoint)).toBeNull();
  });

  it("AC14, R2: deletion and logout cannot remove another person's device", async () => {
    const { a, b } = await paired();
    const d = await device("a"); await subscribe(a, d);
    await call("DELETE", "/api/push/subscription", { cookie: b.cookie, body: { endpoint: d.body.endpoint } });
    await call("POST", "/api/auth/logout", { cookie: b.cookie, body: { endpoint: d.body.endpoint } });
    expect(await stored(d.body.endpoint)).not.toBeNull();
    await call("DELETE", "/api/push/subscription", { cookie: a.cookie, body: { endpoint: d.body.endpoint } });
    expect(await stored(d.body.endpoint)).toBeNull();
  });

  it("AC18, R26: logout deletes this endpoint with the session and leaves the other device on", async () => {
    const { a } = await paired();
    const first = await device("first"); const second = await device("second");
    await subscribe(a, first); await subscribe(a, second);
    expect((await call("POST", "/api/auth/logout", { cookie: a.cookie, body: { endpoint: first.body.endpoint } })).status).toBe(200);
    expect(await stored(first.body.endpoint)).toBeNull();
    expect(await stored(second.body.endpoint)).not.toBeNull();
    expect((await call("GET", "/api/push", { cookie: a.cookie })).status).toBe(401);
  });

  it("AC19, R4: rejects unpaired subscriptions", async () => {
    const a = await user("Alone");
    expect((await call("PUT", "/api/push/subscription", { cookie: a.cookie, body: (await device("alone")).body })).status).toBe(404);
  });

  it("R27, R29: validates body size, endpoint, booleans and P-256 and auth keys", async () => {
    const { a } = await paired(); const d = await device("a");
    for (const body of [null, {}, { ...d.body, journal: 1 }, { ...d.body, endpoint: "https://evil.test/push" },
      { ...d.body, keys: { ...d.body.keys, auth: "abcd" } }, { ...d.body, keys: { ...d.body.keys, p256dh: "BA" + "A".repeat(85) } }]) {
      const res = await call("PUT", "/api/push/subscription", { cookie: a.cookie, body });
      expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: "invalid_subscription" });
    }
    expect((await call("PUT", "/api/push/subscription", { cookie: a.cookie, body: { ...d.body, extra: "a".repeat(4096) } })).status).toBe(413);
  });

  it("R2, R27: caps a user at ten devices and transfers an endpoint to its new account", async () => {
    const { a, b } = await paired(); const devices = [];
    for (let i = 0; i < 11; i++) {
      const d = await device(`cap-${i}`); devices.push(d);
      vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T08:00:00Z") + i);
      await subscribe(a, d);
    }
    expect(await stored(devices[0]!.body.endpoint)).toBeNull();
    expect((await (await call("GET", "/api/push", { cookie: a.cookie })).json<any>()).devices).toHaveLength(10);
    await subscribe(b, devices[10]!);
    expect((await stored(devices[10]!.body.endpoint))?.user_id).toBe(b.id);
  });

  it("R20: missing VAPID key returns unavailable and refuses opt in", async () => {
    const { a } = await paired(); const withoutKey = { ...env, VAPID_PRIVATE_KEY: undefined };
    const get = await app.request("https://bisou.example/api/push", { headers: { Cookie: a.cookie } }, withoutKey);
    expect((await get.json<any>()).publicKey).toBeNull();
    const res = await app.request("https://bisou.example/api/push/subscription", { method: "PUT", headers: { Cookie: a.cookie, Origin: "https://bisou.example", "Content-Type": "application/json" }, body: JSON.stringify((await device("a")).body) }, withoutKey);
    expect(res.status).toBe(503);
  });
});

describe("partner journal pushes", () => {
  it("AC2, AC3, AC4, AC5, R7, R8, R19, R31: only opted in partner devices get a private localized message for a new entry", async () => {
    const { a, b } = await paired();
    await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "vi" } });
    const own = await device("own"); const partner = await device("partner"); const off = await device("off", { journal: false, reminders: true });
    const send = mockPush();
    const input = { date: "2023-02-12", text: "secret journal text", photoIds: [] };
    await call("POST", "/api/journal", { cookie: a.cookie, body: input }); await waitForBackground();
    expect(send.sent).toHaveLength(0);
    await subscribe(a, own); await subscribe(b, partner); await subscribe(b, off);
    const res = await call("POST", "/api/journal", { cookie: a.cookie, body: input }); await waitForBackground();
    expect(res.status).toBe(201); expect(send.sent).toHaveLength(1);
    expect(send.sent[0]!.endpoint).toBe(partner.body.endpoint);
    expect(await decrypt(send.sent[0]!.body, partner)).toEqual({ title: "An vừa viết nhật ký", url: "/journal", tag: "journal" });
    expect(Object.fromEntries(send.sent[0]!.headers)).toMatchObject({ "content-encoding": "aes128gcm", urgency: "normal", topic: "journal" });
    expect(send.sent[0]!.headers.get("authorization")).toMatch(/^vapid t=/);
    expect(Number(send.sent[0]!.headers.get("ttl"))).toBeGreaterThan(0);
    const { entry } = await res.json<any>();
    await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: { ...input, text: "edited" } });
    await call("DELETE", `/api/journal/${entry.id}`, { cookie: a.cookie }); await waitForBackground();
    expect(send.sent).toHaveLength(1);
    await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "en" } });
    await call("POST", "/api/journal", { cookie: a.cookie, body: input }); await waitForBackground();
    expect(await decrypt(send.sent[1]!.body, partner)).toEqual({ title: "An wrote in the journal", url: "/journal", tag: "journal" });
  });

  it("AC6, R8, R9: a received wish gives only the journal title", async () => {
    const { a, b } = await paired(); const d = await device("b"); await subscribe(b, d);
    const send = mockPush();
    const created = await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "Secret scarf", price: 100, link: null, photoId: null } });
    const { wish } = await created.json<any>();
    await call("POST", `/api/wishes/${wish.id}/received`, { cookie: a.cookie, body: { locale: "en", date: "2023-02-12", note: "secret", photoIds: [] } });
    await waitForBackground(); expect(send.sent).toHaveLength(1);
    expect(await decrypt(send.sent[0]!.body, d)).toEqual({ title: "An vừa viết nhật ký", url: "/journal", tag: "journal" });
  });

  it.each([201, 404, 410, 500])("R28, R29: handles service status %s without logging endpoints or keys", async (status) => {
    const { a, b } = await paired(); const d = await device("b"); await subscribe(b, d);
    const send = mockPush(status); const log = vi.spyOn(console, "log"); const error = vi.spyOn(console, "error");
    await call("POST", "/api/journal", { cookie: a.cookie, body: { date: "2023-02-12", text: "private", photoIds: [] } }); await waitForBackground();
    expect(send.sent).toHaveLength(1); await decrypt(send.sent[0]!.body, d);
    const row = await stored(d.body.endpoint);
    if (status === 404 || status === 410) expect(row).toBeNull();
    else if (status === 201) expect(row).toMatchObject({ failures: 0, last_success_at: expect.any(Number) });
    else expect(row?.failures).toBe(1);
    const logs = JSON.stringify([log.mock.calls, error.mock.calls]);
    for (const secret of [d.body.endpoint, d.body.keys.auth, d.body.keys.p256dh, "private"]) expect(logs).not.toContain(secret);
  });
});
