import { env } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { reminderMessage } from "../src/worker/lib/notify";
import { call, paired, resetDb, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, runPushCron, subscribe } from "./push-helpers";

beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T08:00:00Z")); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

async function example() {
  const pair = await paired();
  await call("PATCH", "/api/me", { cookie: pair.a.cookie, body: { birthDate: "1997-11-18" } });
  await call("PATCH", "/api/me", { cookie: pair.b.cookie, body: { displayName: "Bình", birthDate: "1996-01-03" } });
  await call("PATCH", "/api/couple", { cookie: pair.a.cookie, body: { startDate: "2023-02-12" } });
  const aDevice = await device("an"); const bDevice = await device("binh");
  await subscribe(pair.a, aDevice); await subscribe(pair.b, bDevice);
  return { ...pair, aDevice, bDevice };
}

async function addEvent(who: TestUser, title: string, date: string) {
  const res = await call("POST", "/api/events", { cookie: who.cookie, body: { title, date, repeat: "once", icon: "star" } });
  expect(res.status).toBe(201);
  return res.json<{ couple: { events: { id: string; title: string }[] } }>();
}

it("AC7, R10, R12: only Bình receives the two reminders of An's birthday", async () => {
  const { bDevice } = await example(); const send = mockPush();
  for (const [at, title, ttl] of [
    ["2026-11-17T13:00:00Z", "Ngày mai: Sinh nhật An", "86400"],
    ["2026-11-18T01:00:00Z", "Hôm nay: Sinh nhật An", "86400"],
  ]) {
    await runPushCron(at!);
    const sent = send.sent.at(-1)!;
    expect(sent.endpoint).toBe(bDevice.body.endpoint);
    expect(await decrypt(sent.body, bDevice)).toEqual({ title, url: "/events", tag: "events" });
    expect(sent.headers.get("ttl")).toBe(ttl); expect(sent.headers.get("topic")).toBe("events");
  }
  expect(send.sent).toHaveLength(2);
});

it.each([false, true])("AC8, AC9, R11: both partners get the anniversary and same-day events in list order, custom=%s", async (custom) => {
  const { a, aDevice, bDevice } = await example();
  if (custom) await addEvent(a, "Xem phim", "2027-02-12");
  const send = mockPush();
  await runPushCron("2027-02-11T20:00:00+07:00");
  expect(send.sent).toHaveLength(2);
  for (const sent of send.sent) {
    expect(await decrypt(sent.body, sent.endpoint === aDevice.body.endpoint ? aDevice : bDevice)).toEqual({
      title: `Ngày mai: Kỷ niệm 4 năm${custom ? " và Xem phim" : ""}`, url: "/events", tag: "events",
    });
  }
});

it("AC9, R11: five same-day events show three names and the remaining count in both languages", async () => {
  const { a, b, aDevice, bDevice } = await example();
  await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "en" } });
  const names = ["Đi dạo", "Xem phim", "Ăn tối", "Ngắm sao", "Đọc sách"];
  for (const [i, name] of names.entries()) {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T08:00:00Z") + i);
    await addEvent(a, name, "2026-12-01");
  }
  const send = mockPush(); await runPushCron("2026-11-30T20:00:00+07:00");
  expect(send.sent).toHaveLength(2);
  for (const sent of send.sent) {
    const own = sent.endpoint === aDevice.body.endpoint;
    expect(await decrypt(sent.body, own ? aDevice : bDevice)).toEqual({
      title: `${own ? "Ngày mai" : "Tomorrow"}: Đi dạo, Xem phim, Ăn tối ${own ? "và 2 sự kiện khác" : "and 2 more"}`,
      url: "/events", tag: "events",
    });
  }
});

it("AC9, R11: long multibyte titles remain within the encrypted payload limit", async () => {
  const { a, aDevice, bDevice } = await example();
  const title = "💖".repeat(60);
  for (let i = 0; i < 5; i++) await addEvent(a, title, "2026-12-01");
  const send = mockPush(); await runPushCron("2026-11-30T20:00:00+07:00");
  expect(send.sent).toHaveLength(2);
  for (const sent of send.sent) {
    expect(sent.body.length).toBeLessThanOrEqual(4096);
    expect(await decrypt(sent.body, sent.endpoint === aDevice.body.endpoint ? aDevice : bDevice)).toEqual({
      title: `Ngày mai: ${[title, title, title].join(", ")} và 2 sự kiện khác`, url: "/events", tag: "events",
    });
  }
  // The byte guard still holds if a future event kind supplies a larger title.
  const message = reminderMessage(["💖".repeat(800), "💖".repeat(800), "Third", "Fourth"], "en", 1);
  expect(message.title).toBe(`Tomorrow: ${"💖".repeat(800)} and 3 more`);
  expect(new TextEncoder().encode(JSON.stringify(message)).length).toBeLessThanOrEqual(3993);
  expect(reminderMessage(["💖".repeat(1000)], "vi", 0).title).toBe("Hôm nay: và 1 sự kiện khác");
});

it("AC10, AC11, R13, R14: added after 20:00 gets only 08:00; deleted before a run gets neither", async () => {
  const { a, aDevice, bDevice } = await example(); const send = mockPush();
  await runPushCron("2026-11-30T20:00:00+07:00"); expect(send.sent).toHaveLength(0);
  const added = await addEvent(a, "Xem phim", "2026-12-01");
  const movie = added.couple.events.find((e) => e.title === "Xem phim")!;
  const deleted = await addEvent(a, "Đã hủy", "2026-12-01");
  await call("DELETE", `/api/events/${deleted.couple.events.find((e) => e.title === "Đã hủy")!.id}`, { cookie: a.cookie });
  await runPushCron("2026-12-01T08:00:00+07:00"); expect(send.sent).toHaveLength(2);
  for (const sent of send.sent) expect(await decrypt(sent.body, sent.endpoint === aDevice.body.endpoint ? aDevice : bDevice)).toEqual({ title: "Hôm nay: Xem phim", url: "/events", tag: "events" });
  await call("DELETE", `/api/events/${movie.id}`, { cookie: a.cookie });
  await runPushCron("2026-12-01T20:00:00+07:00"); expect(send.sent).toHaveLength(2);
});

it("AC15, AC21, R31: English recipient, disabled devices and concurrent runs", async () => {
  const { a, aDevice, bDevice } = await example();
  await call("PATCH", "/api/me", { cookie: a.cookie, body: { locale: "en" } });
  const off = await device("off", { journal: true, reminders: false }); await subscribe(a, off);
  const send = mockPush();
  await Promise.all([runPushCron("2027-01-02T20:00:00+07:00"), runPushCron("2027-01-02T20:00:00+07:00")]);
  expect(send.sent).toHaveLength(1); expect(send.sent[0]!.endpoint).toBe(aDevice.body.endpoint);
  expect(await decrypt(send.sent[0]!.body, aDevice)).toEqual({ title: "Tomorrow: Bình’s birthday", url: "/events", tag: "events" });
  expect(send.sent.some((s) => s.endpoint === bDevice.body.endpoint)).toBe(false);
});

it("R10, R13: 07:00 and 09:00 do not send event reminders", async () => {
  await example(); const send = mockPush();
  await runPushCron("2026-11-18T07:00:00+07:00"); await runPushCron("2026-11-18T09:00:00+07:00");
  expect(send.sent).toHaveLength(0);
});

it("R4: an unpaired recipient is skipped and a couple is loaded only once", async () => {
  const { b, aDevice, bDevice } = await example(); const send = mockPush();
  const batch = vi.spyOn(env.DB, "batch");
  await runPushCron("2027-02-11T20:00:00+07:00"); expect(batch).toHaveBeenCalledTimes(1);
  for (const sent of send.sent) await decrypt(sent.body, sent.endpoint === aDevice.body.endpoint ? aDevice : bDevice);
  send.sent.length = 0;
  await env.DB.prepare("DELETE FROM couple_members WHERE user_id = ?").bind(b.id).run();
  await runPushCron("2027-02-12T08:00:00+07:00"); expect(send.sent).toHaveLength(0);
});

it("R10: a recipient D1 failure does not stop the next recipient", async () => {
  await example();
  const batch = env.DB.batch.bind(env.DB);
  vi.spyOn(env.DB, "batch").mockRejectedValueOnce(new Error("private")).mockImplementation(batch);
  const send = mockPush();
  await runPushCron("2027-02-11T20:00:00+07:00");
  expect(send.sent).toHaveLength(1);
});
