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
    }
  });
});
