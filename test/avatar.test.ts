import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Couple, User } from "../src/shared/types";
import { call, explain, jpeg, paired, resetDb, user, webp, type TestUser } from "./helpers";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

function form(bytes = jpeg({ width: 512, height: 512 }), type = "image/jpeg") {
  const data = new FormData();
  data.set("photo", new File([bytes], "photo", { type }));
  return data;
}
const put = (who: TestUser, data = form()) => call("PUT", "/api/me/avatar", { cookie: who.cookie, form: data });
const get = (who: TestUser, owner: TestUser, id: string) => call("GET", `/api/avatars/${owner.id}/${id}`, { cookie: who.cookie });
const key = (who: TestUser, id = "") => `users/${who.id}/avatar/${id}`;
async function save(who: TestUser, data = form()) {
  const res = await put(who, data);
  expect(res.status).toBe(200);
  const { user } = await res.json<{ user: User }>();
  expect(user.avatarId).toBeTruthy();
  return user.avatarId!;
}

describe("profile photos", () => {
  it("AC1 R1: changing a target id still changes only the session owner", async () => {
    const { a, b } = await paired();
    const id = await save(a);
    const data = form();
    data.set("userId", a.id);
    expect((await put(b, data)).status).toBe(400);
    const own = await save(b);
    expect((await get(a, a, id)).status).toBe(200);
    expect((await get(b, b, own)).status).toBe(200);
    expect((await call("PUT", `/api/me/avatar/${a.id}`, { cookie: b.cookie, form: form() })).status).toBe(404);
  });

  it("AC2 AC5 R2 R6: saves one 512 square without EXIF and exposes the current user", async () => {
    const a = await user("An");
    const id = await save(a, form(jpeg({ width: 512, height: 512, exif: true })));
    expect(await (await call("GET", "/api/me", { cookie: a.cookie })).json()).toMatchObject({ user: { avatarId: id } });
    const res = await get(a, a, id);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=86400");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(jpeg({ width: 512, height: 512 }));
  });

  it("AC3 R4: refuses a PDF and malformed multipart", async () => {
    const a = await user("An");
    expect((await put(a, form(new Uint8Array([1]), "application/pdf"))).status).toBe(415);
    expect((await put(a, new FormData())).status).toBe(400);
    expect((await call("PUT", "/api/me/avatar", { cookie: a.cookie, body: {} })).status).toBe(415);
  });

  it.each([[1024, 1024], [511, 511], [512, 511]])("AC5 R6: refuses dimensions %i x %i", async (width, height) => {
    expect((await put(await user("An"), form(jpeg({ width, height })))).status).toBe(400);
  });

  it("AC5 R6: accepts WebP and refuses its metadata", async () => {
    const a = await user("An");
    await save(a, form(webp({ width: 512, height: 512, kind: "VP8" }), "image/webp"));
    expect((await put(a, form(webp({ width: 512, height: 512, kind: "VP8X", exif: true }), "image/webp"))).status).toBe(400);
  });

  it.each([262_145, 300_000])("AC5 R6: refuses %i bytes at file or request limit", async (size) => {
    expect((await put(await user("An"), form(new Uint8Array(size)))).status).toBe(413);
  });

  it("AC6 R7: replacement deletes the old object and orphan and denies both old URLs", async () => {
    const { a, b } = await paired();
    const old = await save(a);
    await env.PHOTOS.put(key(a, "orphan"), "orphan");
    const current = await save(a);
    for (const who of [a, b]) expect((await get(who, a, old)).status).toBe(404);
    expect(await env.PHOTOS.head(key(a, old))).toBeNull();
    expect((await env.PHOTOS.list({ prefix: key(a) })).objects.map((o) => o.key)).toEqual([key(a, current)]);
  });

  it("AC7 AC12 R8 R15: removal is idempotent, clears storage and returns the letter state", async () => {
    const a = await user("An");
    const old = await save(a);
    for (let i = 0; i < 2; i++) {
      const res = await call("DELETE", "/api/me/avatar", { cookie: a.cookie });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ user: { avatarId: null } });
    }
    expect((await env.PHOTOS.list({ prefix: key(a) })).objects).toEqual([]);
    expect((await get(a, a, old)).status).toBe(404);
  });

  it("AC8 AC10 R10 R13: partner refresh includes the photo and permits reading it", async () => {
    const { a, b } = await paired();
    const id = await save(a);
    const res = await call("GET", "/api/couple", { cookie: b.cookie });
    const { couple } = await res.json<{ couple: Couple }>();
    expect(couple.members.find((m) => m.id === a.id)?.avatarId).toBe(id);
    expect((await get(b, a, id)).status).toBe(200);
  });

  it("AC9 R11 R12: unpaired owners can save, outsiders cannot read, and Origin and session are required", async () => {
    const a = await user("An");
    const outsider = await user("Chi");
    for (const alone of [false, true]) {
      if (alone) await call("POST", "/api/couple", { cookie: a.cookie });
      const id = await save(a);
      expect((await get(a, a, id)).status).toBe(200);
      expect((await get(outsider, a, id)).status).toBe(404);
      expect((await call("GET", `/api/avatars/${a.id}/${id}`)).status).toBe(401);
    }
    for (const method of ["PUT", "DELETE"]) {
      expect((await call(method, "/api/me/avatar")).status).toBe(401);
      expect((await call(method, "/api/me/avatar", { cookie: a.cookie, origin: "https://other.example" })).status).toBe(403);
    }
  });

  it("AC11 R14: D1 failure preserves the old photo and removes the new object", async () => {
    const a = await user("An");
    const old = await save(a);
    vi.spyOn(env.DB, "batch").mockRejectedValueOnce(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await put(a)).status).toBe(500);
    expect((await get(a, a, old)).status).toBe(200);
    expect((await env.PHOTOS.list({ prefix: key(a) })).objects.map((o) => o.key)).toEqual([key(a, old)]);
    log.mockRestore();
  });

  it("AC9 R11: avatar queries retain indexed lookups", async () => {
    const plans = await Promise.all([
      explain(`SELECT 1 FROM users u WHERE u.id = ?1 AND u.avatar_id = ?2
        AND (u.id = ?3 OR EXISTS (SELECT 1 FROM couple_members a JOIN couple_members b ON b.couple_id = a.couple_id
        WHERE a.user_id = u.id AND b.user_id = ?3))`, "a", "photo", "b"),
      explain("SELECT avatar_id FROM users WHERE id = ?", "a"),
      explain("UPDATE users SET avatar_id = ? WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at", "photo", "a"),
      explain("UPDATE users SET avatar_id = NULL WHERE id = ? RETURNING id, email, display_name, locale, birth_date, avatar_id, created_at", "a"),
    ]);
    for (const plan of plans) expect(plan.join("\n")).not.toMatch(/SCAN (?:users|couple_members|u|a|b)\b/);
    console.log("Avatar EXPLAIN", plans);
  });
});
