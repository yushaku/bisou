import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Couple } from "../src/shared/types";
import { call, explain, paired, resetDb, user } from "./helpers";

const input = { title: "Bay đi Đà Lạt", date: "2026-12-20", repeat: "once", icon: "plane" };
beforeEach(async () => { vi.setSystemTime(new Date("2026-11-06T12:00:00Z")); await resetDb(); });
afterEach(() => vi.useRealTimers());
async function events(cookie: string) {
  const res = await call("GET", "/api/couple", { cookie });
  return (await res.json<{ couple: Couple | null }>()).couple?.events;
}
async function seed(couple: string, count: number, date: string, prefix = "seed") {
  await env.DB.batch(Array.from({ length: count }, (_, i) => env.DB.prepare(
    "INSERT INTO couple_events (id, couple_id, title, event_date, repeats, icon, created_at, updated_at) VALUES (?, ?, 'Seed', ?, 'once', 'heart', 1, 1)",
  ).bind(`${prefix}-${i}`, couple, date)));
}

describe("custom events API", () => {
  it("AC1 AC3 R5 R6: shares trimmed events with both partners without an author", async () => {
    const { a, b } = await paired();
    const res = await call("POST", "/api/events", { cookie: a.cookie, body: { ...input, title: `  ${input.title}  ` } });
    expect(res.status).toBe(201);
    const mine = await events(a.cookie);
    expect(mine).toEqual([expect.objectContaining(input)]);
    expect(Object.keys(mine![0]!).sort()).toEqual(["createdAt", "date", "icon", "id", "repeat", "title"]);
    expect(await events(b.cookie)).toEqual(mine);
    const outsider = await user("Outsider");
    expect(await events(outsider.cookie)).toBeUndefined();
    expect((await call("POST", "/api/events", { cookie: outsider.cookie, body: input })).status).toBe(404);
    await call("POST", "/api/couple", { cookie: outsider.cookie });
    expect((await call("POST", "/api/events", { cookie: outsider.cookie, body: input })).status).toBe(404);
  });
  it("AC3 R1: refuses invalid fields and accepts 60 Unicode code points", async () => {
    const { a } = await paired();
    for (const body of [null, { ...input, title: "x".repeat(61) }, { ...input, title: "   " }, { ...input, icon: null }, { ...input, icon: "unknown" }, { ...input, repeat: "weekly" }]) {
      expect((await call("POST", "/api/events", { cookie: a.cookie, body })).status).toBe(400);
    }
    expect((await call("POST", "/api/events", { cookie: a.cookie, body: { ...input, title: "💛".repeat(60) } })).status).toBe(201);
  });
  it("AC4 R2: validates real dates and permits distant one-offs and past yearly starts", async () => {
    const { a } = await paired();
    for (const [date, repeat, status] of [
      ["2026-11-05", "once", 400], ["2026-11-31", "once", 400], ["2026-11-06", "once", 201],
      ["2031-11-07", "once", 201], ["2099-11-07", "once", 201], ["2024-06-01", "yearly", 201], ["1899-12-31", "yearly", 400],
    ] as const) expect((await call("POST", "/api/events", { cookie: a.cookie, body: { ...input, date, repeat } })).status).toBe(status);
  });
  it("R5: rejects unsigned, cross-origin and oversized writes", async () => {
    const { a } = await paired();
    expect((await call("POST", "/api/events", { body: input })).status).toBe(401);
    expect((await call("POST", "/api/events", { cookie: a.cookie, body: input, origin: "https://evil.example" })).status).toBe(403);
    expect((await call("POST", "/api/events", { cookie: a.cookie, body: { ...input, title: "x".repeat(17000) } })).status).toBe(413);
  });
  it("AC8 AC14 R4: caps upcoming events atomically and keeps past one-offs", async () => {
    const { a, couple } = await paired();
    await seed(couple.id, 99, "2026-11-06");
    await seed(couple.id, 20, "2026-11-05", "past");
    const responses = await Promise.all([1, 2].map(() => call("POST", "/api/events", { cookie: a.cookie, body: input })));
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await events(a.cookie)).toHaveLength(100);
    vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
    expect(await events(a.cookie)).toHaveLength(1);
    expect((await call("POST", "/api/events", { cookie: a.cookie, body: input })).status).toBe(201);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM couple_events WHERE couple_id = ?").bind(couple.id).first("n")).toBe(121);
  });
  it("R4 R5 D3: list and cap count use the couple index", async () => {
    for (const [sql, binds] of [
      ["SELECT id, title, event_date, repeats, icon, created_at FROM couple_events WHERE couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?) AND (repeats = 'yearly' OR event_date >= ?)", ["user", "2026-11-06"]],
      ["INSERT INTO couple_events (id, couple_id, title, event_date, repeats, icon, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM couple_events WHERE couple_id = ? AND (repeats = 'yearly' OR event_date >= ?)) < ?", ["id", "couple", "Title", "2026-11-06", "once", "heart", 1, 1, "couple", "2026-11-06", 100]],
    ] as const) {
      const plan = await explain(sql, ...binds);
      expect(plan.join(" ")).toContain("USING INDEX couple_events_couple");
      expect(plan.join(" ")).not.toContain("SCAN couple_events");
      if (sql.startsWith("SELECT") && sql.includes("couple_members")) expect(plan.join(" ")).toContain("USING INDEX sqlite_autoindex_couple_members_1");
    }
  });
});

describe("change and delete custom events", () => {
  async function added() {
    const pair = await paired();
    const res = await call("POST", "/api/events", { cookie: pair.a.cookie, body: input });
    expect(res.status).toBe(201);
    return { ...pair, event: (await events(pair.a.cookie))![0]! };
  }
  it("AC1 AC9 R5 R6 R7: either partner edits, last save wins, and deletion removes it for both", async () => {
    const { a, b, event } = await added();
    const path = `/api/events/${event.id}`;
    const updated = { ...input, title: "Hẹn hò", date: "2024-06-01", repeat: "yearly", icon: "heart" };
    expect((await call("PUT", path, { cookie: b.cookie, body: updated })).status).toBe(200);
    expect((await events(a.cookie))![0]).toEqual({ ...event, ...updated });
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, title: "Last save" } })).status).toBe(200);
    expect((await events(b.cookie))![0]!.title).toBe("Last save");
    expect((await call("DELETE", path, { cookie: b.cookie })).status).toBe(200);
    expect(await events(a.cookie)).toEqual([]);
    expect(await events(b.cookie)).toEqual([]);
  });
  it("AC1 R5: other couples get the same 404 as an unknown id, without changing data", async () => {
    const { a, event } = await added();
    const outsider = await user("Outside");
    const partner = await user("Other");
    const created = await call("POST", "/api/couple", { cookie: outsider.cookie });
    const { couple } = await created.json<{ couple: Couple }>();
    await call("POST", "/api/couple/join", { cookie: partner.cookie, body: { code: couple.pendingCode!.code } });
    for (const method of ["PUT", "DELETE"]) {
      for (const id of [event.id, "missing"]) {
        const res = await call(method, `/api/events/${id}`, { cookie: outsider.cookie, ...(method === "PUT" ? { body: input } : {}) });
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ error: "not_found" });
      }
    }
    expect(await events(outsider.cookie)).toEqual([]);
    expect(await events(a.cookie)).toEqual([event]);
  });
  it("AC11 R7: saving after a partner deletes is refused", async () => {
    const { a, b, event } = await added();
    const path = `/api/events/${event.id}`;
    expect((await call("DELETE", path, { cookie: b.cookie })).status).toBe(200);
    const res = await call("PUT", path, { cookie: a.cookie, body: input });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect((await call("DELETE", path, { cookie: a.cookie })).status).toBe(404);
  });
  it("R2 R7: unchanged past dates remain editable, changing to another past one-off is refused", async () => {
    const { a, event, couple } = await added();
    const path = `/api/events/${event.id}`;
    await env.DB.prepare("UPDATE couple_events SET event_date = '2026-11-05' WHERE id = ? AND couple_id = ?").bind(event.id, couple.id).run();
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, date: "2026-11-05", title: "Renamed" } })).status).toBe(200);
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, date: "2026-11-04" } })).status).toBe(400);
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, date: "2024-06-01", repeat: "yearly" } })).status).toBe(200);
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, date: "2024-06-01", repeat: "yearly", title: "Family" } })).status).toBe(200);
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, date: "2024-06-01", repeat: "once" } })).status).toBe(400);
  });
  it("AC8 R4: editing at the cap does not add an event", async () => {
    const { a, couple, event } = await added();
    await seed(couple.id, 99, "2026-11-06");
    expect((await call("PUT", `/api/events/${event.id}`, { cookie: a.cookie, body: { ...input, title: "Renamed" } })).status).toBe(200);
    expect(await events(a.cookie)).toHaveLength(100);
  });
  it("R4 AC14: atomically caps reviving past one-offs while ordinary edits at cap still save", async () => {
    const { a, couple, event } = await added();
    await seed(couple.id, 98, "2026-11-06");
    await seed(couple.id, 2, "2026-11-05", "past");
    const responses = await Promise.all([0, 1].map(i => call("PUT", `/api/events/past-${i}`, { cookie: a.cookie, body: input })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const refused = responses.findIndex(r => r.status === 409);
    const res = await call("PUT", `/api/events/past-${refused}`, { cookie: a.cookie, body: { ...input, date: "2024-06-01", repeat: "yearly" } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "too_many_events" });
    expect((await call("PUT", `/api/events/past-${refused}`, { cookie: a.cookie, body: { ...input, date: "2026-11-05", title: "Past" } })).status).toBe(200);
    expect((await call("PUT", `/api/events/${event.id}`, { cookie: a.cookie, body: { ...input, title: "Still editable" } })).status).toBe(200);
    expect(await events(a.cookie)).toHaveLength(100);
  });
  it("R1 R2 R5: edit keeps validation, body limit and Origin protection", async () => {
    const { a, event } = await added();
    const path = `/api/events/${event.id}`;
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, title: "" } })).status).toBe(400);
    expect((await call("PUT", path, { cookie: a.cookie, body: { ...input, title: "x".repeat(17000) } })).status).toBe(413);
    for (const method of ["PUT", "DELETE"]) expect((await call(method, path, { cookie: a.cookie, body: input, origin: "https://evil.example" })).status).toBe(403);
    expect(await events(a.cookie)).toEqual([event]);
  });
  it("R5 D3: scoped find, update and delete use the primary index", async () => {
    for (const [sql, binds] of [
      ["SELECT id, title, event_date AS date, repeats AS repeat, icon, created_at AS createdAt FROM couple_events WHERE id = ? AND couple_id = ?", ["id", "couple"]],
      ["UPDATE couple_events SET title = ?, event_date = ?, repeats = ?, icon = ?, updated_at = ? WHERE id = ? AND couple_id = ? AND (repeats = 'yearly' OR event_date >= ? OR (? = 'once' AND ? < ?) OR (SELECT COUNT(*) FROM couple_events WHERE couple_id = ? AND (repeats = 'yearly' OR event_date >= ?)) < ?)", ["Title", "2026-11-06", "once", "heart", 1, "id", "couple", "2026-11-06", "once", "2026-11-06", "2026-11-06", "couple", "2026-11-06", 100]],
      ["DELETE FROM couple_events WHERE id = ? AND couple_id = ?", ["id", "couple"]],
    ] as const) {
      const plan = await explain(sql, ...binds);
      expect(plan.join(" ")).toContain("USING INDEX sqlite_autoindex_couple_events_1");
      expect(plan.join(" ")).not.toContain("SCAN couple_events");
      if (sql.startsWith("UPDATE")) expect(plan.join(" ")).toContain("USING INDEX couple_events_couple");
    }
  });
});
