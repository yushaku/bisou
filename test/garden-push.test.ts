import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gateIds, type GardenDeckState, type GardenState } from "../src/shared/garden";
import { call, paired, resetDb, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, runPushCron, subscribe } from "./push-helpers";

const DAY = Date.parse("2026-11-09T15:00:00+07:00");
async function today(who: TestUser) {
  return (await (await call("GET", "/api/garden", { cookie: who.cookie })).json<GardenState>()).today!.cardId;
}
async function save(who: TestUser, id: string, text = "ANSWER SECRET") {
  const res = await call("POST", `/api/garden/cards/${id}/answer`, { cookie: who.cookie, body: { text } });
  expect(res.status).toBe(201);
}
beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(DAY); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

it("R32 R33 AC9 AC20: a daily flip notifies every journal-enabled device of both partners, privately in their language", async () => {
  const { a, b } = await paired();
  await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "en" } });
  const devices = [await device("a"), await device("a2"), await device("b"), await device("off", { journal: false, reminders: true })];
  await subscribe(a, devices[0]!); await subscribe(a, devices[1]!); await subscribe(b, devices[2]!); await subscribe(b, devices[3]!);
  const id = await today(a);
  const send = mockPush();
  await save(a, id);
  await waitForBackground();
  expect(send.sent).toHaveLength(0);
  await save(b, id);
  await waitForBackground();
  expect(send.sent).toHaveLength(3);
  for (const sent of send.sent) {
    const d = devices.find((d) => d.body.endpoint === sent.endpoint)!;
    expect(d).not.toBe(devices[3]);
    const message = await decrypt(sent.body, d);
    expect(message).toEqual({ title: d === devices[2] ? "You both answered today's card. Time to flip!" : "Cả hai đã trả lời thẻ hôm nay. Lật thẻ thôi!", url: "/garden", tag: "garden" });
    expect(JSON.stringify(message)).not.toMatch(/ANSWER SECRET|money|An|Minh/);
    expect(sent.headers.get("topic")).toBe("garden");
    expect(sent.headers.get("ttl")).toBe("25200");
  }
});

it("R32 R35: concurrent answers notify each device only once; retries, edits and deletion send nothing", async () => {
  const { a, b } = await paired();
  await subscribe(a, await device("a")); await subscribe(b, await device("b"));
  const id = await today(a);
  const send = mockPush();
  await Promise.all([save(a, id), save(b, id)]);
  await waitForBackground();
  expect(send.sent).toHaveLength(2);
  expect((await call("POST", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "retry" } })).status).toBe(409);
  await call("PUT", `/api/garden/cards/${id}/answer`, { cookie: a.cookie, body: { text: "edit" } });
  await call("DELETE", `/api/garden/cards/${id}/answer`, { cookie: a.cookie });
  await waitForBackground();
  expect(send.sent).toHaveLength(2);
});

it("R22 R35 AC11 AC20: swap and extra play, including an old waiting daily card, never notify", async () => {
  const { a, b } = await paired();
  await subscribe(a, await device("a")); await subscribe(b, await device("b"));
  const old = await today(a);
  const send = mockPush();
  await call("POST", "/api/garden/today/swap", { cookie: a.cookie, body: { cardId: old } });
  const extra = (await (await call("GET", `/api/garden/decks/${old.split("-")[0]}`, { cookie: a.cookie })).json<GardenDeckState>()).active!.cardId;
  await save(a, extra);
  await save(b, extra);
  const waiting = await today(a);
  await save(a, waiting);
  vi.mocked(Date.now).mockReturnValue(DAY + 86400000);
  await today(b);
  await save(b, waiting);
  await waitForBackground();
  expect(send.sent).toHaveLength(0);
});

it.each(["2026-11-09T22:00:00+07:00", "2026-11-10T06:59:59+07:00"])("R33 R34 AC13: quiet-hour flip at %s is dropped and never held for the morning", async (time) => {
  const { a, b } = await paired();
  await subscribe(a, await device("a")); await subscribe(b, await device("b"));
  vi.mocked(Date.now).mockReturnValue(Date.parse(time));
  const id = await today(a);
  const send = mockPush();
  await save(a, id); await save(b, id);
  await waitForBackground();
  expect(send.sent).toHaveLength(0);
  await runPushCron("2026-11-10T07:00:00+07:00");
  expect(send.sent).toHaveLength(0);
});

it.each(["2026-11-09T21:59:59+07:00", "2026-11-10T07:00:00+07:00"])("R32 R33: daily flips notify at the daytime boundary %s", async (time) => {
  const { a, b } = await paired();
  await subscribe(a, await device("a"));
  vi.mocked(Date.now).mockReturnValue(Date.parse(time));
  const id = await today(a);
  const send = mockPush();
  await save(a, id); await save(b, id);
  await waitForBackground();
  expect(send.sent).toHaveLength(1);
});

it("R13 R36 R37: request and failed-push logs never include questions, answers or member ids", async () => {
  const { a, b } = await paired();
  await subscribe(a, await device("a"));
  const id = await today(a);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  mockPush(500);
  await save(a, id, "VERY SECRET BODY"); await save(b, id, "OTHER SECRET BODY");
  await waitForBackground();
  const output = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
  expect(output).not.toContain("SECRET BODY");
  expect(output).not.toContain(a.id);
  expect(output).not.toContain(b.id);
  expect(output).not.toContain(id);
});

it("R55 AC31: placement, targets, decision reveals and opening a stage never notify or water", async () => {
  const { a, b } = await paired();
  await subscribe(a, await device("stage-a")); await subscribe(b, await device("stage-b"));
  const send = mockPush();
  const act = (who: TestUser, body: unknown) => call("POST", "/api/garden/levels", { cookie: who.cookie, body });
  await act(a, { action: "propose", kind: "placement", levelId: "acquainted", revision: 0 });
  await act(b, { action: "accept", revision: 1 });
  await act(a, { action: "propose", kind: "target", levelId: "in_love", revision: 2 });
  await act(b, { action: "accept", revision: 3 });
  for (const id of gateIds(0)) { await save(a, id); await save(b, id); }
  await waitForBackground(); expect(send.sent).toHaveLength(0);
  const state = await (await call("GET", "/api/garden", { cookie: a.cookie })).json<GardenState>();
  expect(state.levels.furthestLevelId).toBe("in_love"); expect(state.plants.every((p) => p.stage === 0)).toBe(true);
});
