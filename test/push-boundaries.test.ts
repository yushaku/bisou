import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { call, paired, resetDb, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, runPushCron, stored, subscribe } from "./push-helpers";

beforeEach(async () => { await resetDb(); vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T08:00:00Z")); });
afterEach(async () => { await waitForBackground(); vi.restoreAllMocks(); });

async function couple() {
  const pair = await paired();
  await call("PATCH", "/api/me", { cookie: pair.b.cookie, body: { displayName: "Bình" } });
  await call("PATCH", "/api/couple", { cookie: pair.a.cookie, body: { startDate: "2023-02-12" } });
  const aPhone = await device("an-phone"); const bPhone = await device("binh-phone");
  await subscribe(pair.a, aPhone); await subscribe(pair.b, bPhone);
  return { ...pair, aPhone, bPhone };
}

async function addEvent(who: TestUser, title: string, date: string, repeat = "once") {
  const res = await call("POST", "/api/events", { cookie: who.cookie, body: { title, date, repeat, icon: "star" } });
  expect(res.status).toBe(201);
  return (await res.json<{ couple: { events: { id: string; title: string }[] } }>()).couple.events.find((e) => e.title === title)!.id;
}

async function titles(send: ReturnType<typeof mockPush>, ...devices: Awaited<ReturnType<typeof device>>[]) {
  return Promise.all(send.sent.map(async (s) => (await decrypt(s.body, devices.find((d) => d.body.endpoint === s.endpoint)!)).title));
}

it("notifications AC8, R10: the anniversary also reminds both partners on the day at 08:00", async () => {
  const { aPhone, bPhone } = await couple(); const send = mockPush();
  await runPushCron("2027-02-12T08:00:00+07:00");
  expect(await titles(send, aPhone, bPhone)).toEqual(["Hôm nay: Kỷ niệm 4 năm", "Hôm nay: Kỷ niệm 4 năm"]);
});

it("notifications R10: 19:59 and 07:59 send nothing, 20:00 and 08:00 send the reminders", async () => {
  const { a, aPhone, bPhone } = await couple(); await addEvent(a, "Xem phim", "2026-12-01"); const send = mockPush();
  await runPushCron("2026-11-30T19:59:00+07:00"); expect(send.sent).toHaveLength(0);
  await runPushCron("2026-11-30T20:00:00+07:00");
  expect(await titles(send, aPhone, bPhone)).toEqual(["Ngày mai: Xem phim", "Ngày mai: Xem phim"]);
  await runPushCron("2026-12-01T07:59:00+07:00"); expect(send.sent).toHaveLength(2);
  await runPushCron("2026-12-01T08:00:00+07:00");
  expect(await titles(send, aPhone, bPhone)).toEqual(Array(2).fill("Ngày mai: Xem phim").concat(Array(2).fill("Hôm nay: Xem phim")));
});

it("R10, R16: the Vietnam day changes at 00:00 VN (17:00 UTC), not at 00:00 UTC", async () => {
  const { a, aPhone, bPhone } = await couple(); await addEvent(a, "Xem phim", "2026-12-01"); const send = mockPush();
  await runPushCron("2026-11-30T16:59:00Z"); await runPushCron("2026-11-30T17:00:00Z"); await runPushCron("2026-12-01T00:00:00Z");
  expect(send.sent).toHaveLength(0);
  await runPushCron("2026-11-30T13:00:00Z");
  expect(await titles(send, aPhone, bPhone)).toEqual(["Ngày mai: Xem phim", "Ngày mai: Xem phim"]);
  await runPushCron("2026-12-01T01:00:00Z"); expect(send.sent).toHaveLength(4);
  await runPushCron("2026-12-01T13:00:00Z"); expect(send.sent).toHaveLength(4);
});

it("notifications R10: a yearly event on 29 February is reminded on 28 February in a common year and on the 29th in a leap year", async () => {
  const { a, aPhone, bPhone } = await couple(); await addEvent(a, "Ngày nhuận", "2024-02-29", "yearly"); const send = mockPush();
  await runPushCron("2027-02-27T20:00:00+07:00"); await runPushCron("2027-02-28T08:00:00+07:00");
  const common = await titles(send, aPhone, bPhone);
  expect(common).toHaveLength(4); expect(common.every((t) => t.includes("Ngày nhuận"))).toBe(true);
  send.sent.length = 0;
  await runPushCron("2028-02-28T20:00:00+07:00");
  const leap = await titles(send, aPhone, bPhone);
  expect(leap).toHaveLength(2); expect(leap.every((t) => t.startsWith("Ngày mai: Ngày nhuận"))).toBe(true);
});

it("notifications R14: an event deleted between the 20:00 and 08:00 reminders gets no second one", async () => {
  const { a } = await couple(); const id = await addEvent(a, "Xem phim", "2026-12-01"); const send = mockPush();
  await runPushCron("2026-11-30T20:00:00+07:00"); expect(send.sent).toHaveLength(2);
  expect((await call("DELETE", `/api/events/${id}`, { cookie: a.cookie })).status).toBe(200);
  await runPushCron("2026-12-01T08:00:00+07:00"); expect(send.sent).toHaveLength(2);
});

it("notifications AC15, R2, R3: with reminders off on the laptop, the phone gets both kinds and the laptop journal only", async () => {
  const { a, b, aPhone, bPhone } = await couple(); const laptop = await device("binh-laptop", { journal: true, reminders: false });
  await subscribe(b, laptop); const send = mockPush();
  await runPushCron("2027-02-11T20:00:00+07:00");
  expect(send.sent.map((s) => s.endpoint).sort()).toEqual([aPhone.body.endpoint, bPhone.body.endpoint].sort());
  send.sent.length = 0;
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T15:00:00+07:00"));
  await call("POST", "/api/journal", { cookie: a.cookie, body: { date: "2026-11-07", text: "x", photoIds: [] } }); await waitForBackground();
  expect(send.sent.map((s) => s.endpoint).sort()).toEqual([bPhone.body.endpoint, laptop.body.endpoint].sort());
});

it("notifications AC5, R7: neither of the author's two devices is notified, the partner's is", async () => {
  const { a, b, aPhone, bPhone } = await couple(); const laptop = await device("binh-laptop"); await subscribe(b, laptop);
  const send = mockPush();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T15:00:00+07:00"));
  await call("POST", "/api/journal", { cookie: b.cookie, body: { date: "2026-11-07", text: "x", photoIds: [] } }); await waitForBackground();
  expect(send.sent.map((s) => s.endpoint)).toEqual([aPhone.body.endpoint]);
  expect(send.sent.some((s) => [bPhone.body.endpoint, laptop.body.endpoint].includes(s.endpoint))).toBe(false);
});

it("notifications AC6, R9: spinning, claiming and releasing a wish send nothing", async () => {
  const { a, b } = await paired(); await subscribe(a, await device("an")); await subscribe(b, await device("binh"));
  const send = mockPush();
  const created = await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "Secret scarf", price: 100, link: null, photoId: null } });
  const { wish } = await created.json<any>();
  expect((await call("POST", "/api/wishes/spin", { cookie: a.cookie, body: { budget: 500 } })).status).toBe(200);
  expect((await call("POST", `/api/wishes/${wish.id}/claim`, { cookie: a.cookie })).status).toBe(201);
  const claims = await (await call("GET", "/api/wishes/claims", { cookie: a.cookie })).json<any>();
  expect((await call("DELETE", `/api/wishes/claims/${claims.claims[0].id}`, { cookie: a.cookie })).status).toBe(200);
  await waitForBackground(); expect(send.sent).toHaveLength(0);
});

it("notifications AC18, R26, R28: after sign-out the device gets nothing, the other device still does", async () => {
  const { a, b, aPhone } = await couple(); const second = await device("an-second"); await subscribe(a, second);
  const send = mockPush();
  await call("POST", "/api/auth/logout", { cookie: a.cookie, body: { endpoint: aPhone.body.endpoint } });
  expect(await stored(aPhone.body.endpoint)).toBeNull();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T15:00:00+07:00"));
  await call("POST", "/api/journal", { cookie: b.cookie, body: { date: "2026-11-07", text: "x", photoIds: [] } }); await waitForBackground();
  await runPushCron("2027-02-11T20:00:00+07:00");
  expect(send.sent.map((s) => s.endpoint)).not.toContain(aPhone.body.endpoint);
  expect(send.sent.filter((s) => s.endpoint === second.body.endpoint)).toHaveLength(2);
});

it("notifications R28: a 410 on an event reminder deletes only that device, the user's other device still receives", async () => {
  const { a, aPhone, bPhone } = await couple(); const gone = await device("binh-gone"); await subscribe(a, gone);
  const send = mockPush();
  send.spy.mockImplementation(async (input, init) => {
    send.sent.push({ endpoint: String(input), headers: new Headers(init?.headers), body: new Uint8Array(await new Response(init?.body).arrayBuffer()) });
    return new Response(null, { status: String(input) === gone.body.endpoint ? 410 : 201 });
  });
  await runPushCron("2027-02-11T20:00:00+07:00");
  expect(send.sent.map((s) => s.endpoint).sort()).toEqual([aPhone.body.endpoint, gone.body.endpoint, bPhone.body.endpoint].sort());
  expect(await stored(gone.body.endpoint)).toBeNull();
  expect(await stored(aPhone.body.endpoint)).not.toBeNull();
  send.sent.length = 0;
  await runPushCron("2027-02-12T08:00:00+07:00");
  expect(send.sent.map((s) => s.endpoint)).not.toContain(gone.body.endpoint);
  expect(send.sent).toHaveLength(2);
});
