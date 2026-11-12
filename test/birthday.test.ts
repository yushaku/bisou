import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, latestDay } from "../src/shared/days";
import type { Couple, User } from "../src/shared/types";
import { call, explain, paired, resetDb, user, type TestUser } from "./helpers";

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T08:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const patch = (who: TestUser, birthDate: unknown, extra = {}) =>
  call("PATCH", "/api/me", { cookie: who.cookie, body: { birthDate, ...extra } });
async function members(who: TestUser) {
  const res = await call("GET", "/api/couple", { cookie: who.cookie });
  expect(res.status).toBe(200);
  return (await res.json<{ couple: Couple | null }>()).couple?.members;
}

describe("birthdays", () => {
  it.each(["2026-04-31", "1899-12-31", "2023-02-29", "29-02-2024", "02-29", 1997, "", {}])(
    "events AC10 R13 R14: refuses invalid full date %j", async (date) => {
      const a = await user("An");
      const res = await patch(a, date);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_birth_date" });
    },
  );
  it("events AC10 R14: accepts today at UTC+14 and refuses a later date", async () => {
    const a = await user("An");
    expect((await patch(a, latestDay(Date.now()))).status).toBe(200);
    expect((await patch(a, addDays(latestDay(Date.now()), 1))).status).toBe(400);
  });
  it("events AC10 AC12 R14 R16: saves a leap birthday, preserves it through other edits, and clears it", async () => {
    const a = await user("An");
    for (const birthDate of ["1900-01-01", "1996-02-29", "2024-02-29"]) {
      const res = await patch(a, birthDate);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ user: { birthDate } });
    }
    await call("PATCH", "/api/me", { cookie: a.cookie, body: { locale: "vi" } });
    expect(await (await call("GET", "/api/me", { cookie: a.cookie })).json()).toMatchObject({ user: { birthDate: "2024-02-29" } });
    const removed = await patch(a, null);
    expect(await removed.json()).toMatchObject({ user: { birthDate: null } });
  });
  it("events AC11 R15: a birthday entered before pairing appears to both partners", async () => {
    const a = await user("An");
    expect((await patch(a, "1997-11-18")).status).toBe(200);
    const b = await user("Binh");
    const created = await call("POST", "/api/couple", { cookie: a.cookie });
    const { couple } = await created.json<{ couple: Couple }>();
    expect((await call("POST", "/api/couple/join", { cookie: b.cookie, body: { code: couple.pendingCode!.code } })).status).toBe(200);
    for (const who of [a, b]) expect((await members(who))?.find((m) => m.id === a.id)?.birthDate).toBe("1997-11-18");
  });
  it("events AC12 R13 R16 R17: a partner can only edit their own birthday and removal reaches both payloads", async () => {
    const { a, b } = await paired();
    await patch(a, "1997-11-18");
    for (const birthDate of ["1996-01-03", null]) {
      const res = await patch(b, birthDate, { id: a.id, userId: a.id });
      expect(res.status).toBe(200);
      for (const who of [a, b]) {
        expect(await members(who)).toEqual([
          { id: a.id, displayName: "An", birthDate: "1997-11-18", avatarId: null },
          { id: b.id, displayName: "Minh", birthDate, avatarId: null },
        ]);
      }
    }
  });
  it("events AC1 R1: unpaired and paired outsiders receive no other couple birthdays", async () => {
    const { a, b, couple } = await paired();
    await patch(a, "1997-11-18");
    await patch(b, "1996-01-03");
    const outsider = await user("Lan");
    expect(await members(outsider)).toBeUndefined();
    const created = await call("POST", "/api/couple", { cookie: outsider.cookie });
    const own = (await created.json<{ couple: Couple }>()).couple;
    const partner = await user("Hoa");
    await call("POST", "/api/couple/join", { cookie: partner.cookie, body: { code: own.pendingCode!.code } });
    for (const who of [outsider, partner]) {
      expect((await members(who))?.every((m) => m.birthDate === null && m.id !== a.id && m.id !== b.id)).toBe(true);
      const me = await call("GET", `/api/me?id=${a.id}`, { cookie: who.cookie });
      expect((await me.json<{ user: User }>()).user).toMatchObject({ id: who.id, birthDate: null });
      expect((await call("GET", `/api/couple/${couple.id}`, { cookie: who.cookie })).status).toBe(404);
    }
    expect((await call("GET", "/api/couple")).status).toBe(401);
    expect((await call("PATCH", "/api/me", { body: { birthDate: "1997-11-18" } })).status).toBe(401);
  });
  it("events AC1 R1: birthday queries retain indexed user and membership lookups", async () => {
    const { a } = await paired();
    const plans = [
      await explain(`SELECT u.id AS id, u.display_name AS display_name, u.birth_date AS birth_date, u.avatar_id
        FROM couple_members m JOIN users u ON u.id = m.user_id
        WHERE m.couple_id = (SELECT couple_id FROM couple_members WHERE user_id = ?) ORDER BY m.joined_at, m.rowid`, a.id),
      await explain("SELECT id, email, display_name, locale, birth_date, avatar_id, created_at FROM users WHERE email = ?", "an@example.com"),
      await explain(`SELECT s.expires_at AS session_expires_at, u.id, u.email, u.display_name, u.locale, u.birth_date, u.avatar_id, u.created_at
        FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`, "hash"),
      await explain("UPDATE users SET display_name = ?, locale = ?, birth_date = ? WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at", "An", "vi", null, a.id),
    ];
    for (const plan of plans) {
      expect(plan.some((line) => line.includes("SEARCH"))).toBe(true);
      expect(plan.join("\n")).not.toMatch(/SCAN (?:users|couple_members|m|u|s)\b/);
    }
    console.log("Birthday EXPLAIN", plans);
  });
});
