import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sweepPhotos } from "../src/worker/lib/cleanup";
import { photoKey, purgePhotos } from "../src/worker/lib/photos";
import { call, paired, resetDb, upload, user } from "./helpers";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

describe("wish jar", () => {
  it("wishes AC1, AC2 (R1-R5): title only defaults, and only the owner reads or changes their jar", async () => {
    const { a, b } = await paired();
    const res = await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "  Scarf  " } });
    expect(res.status).toBe(201);
    const { wish } = await res.json<{ wish: { id: string; title: string; priority: number; price: null } }>();
    expect(wish).toMatchObject({ title: "Scarf", priority: 2, price: null });
    expect(await (await call("GET", "/api/wishes", { cookie: a.cookie })).json()).toEqual({ open: [], received: [], partnerJarEmpty: false });
    for (const method of ["PUT", "DELETE"]) {
      expect((await call(method, `/api/wishes/${wish.id}`, { cookie: a.cookie, body: { title: "No" } })).status).toBe(404);
    }
    const outsider = await user("Outsider");
    for (const [method, path] of [["GET", ""], ["POST", ""], ["PUT", `/${wish.id}`], ["DELETE", `/${wish.id}`]]) {
      expect((await call(method!, `/api/wishes${path}`, { cookie: outsider.cookie, body: method === "GET" ? undefined : {} })).status).toBe(404);
    }
    expect((await call("GET", "/api/wishes")).status).toBe(401);
  });

  it("wishes AC14 (R10): a partner with no wishes has an empty jar", async () => {
    const { a } = await paired();
    const res = await call("GET", "/api/wishes", { cookie: a.cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ open: [], received: [], partnerJarEmpty: true });
  });

  it("wishes AC14 (R10): claimed open wishes keep the partner jar nonempty", async () => {
    const { a, b } = await paired();
    const created = await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "Scarf", price: 450000 } });
    const { wish } = await created.json<{ wish: { id: string } }>();
    expect((await call("POST", `/api/wishes/${wish.id}/claim`, { cookie: a.cookie })).status).toBe(201);
    expect(await (await call("GET", "/api/wishes", { cookie: a.cookie })).json()).toEqual({ open: [], received: [], partnerJarEmpty: false });
    expect(await (await call("POST", "/api/wishes/spin", { cookie: a.cookie, body: { budget: 500000 } })).json()).toEqual({ wish: null });
  });

  it("wishes AC14 (R10): received wishes are no longer in the partner jar", async () => {
    const { a, b } = await paired();
    const created = await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "Scarf" } });
    const { wish } = await created.json<{ wish: { id: string } }>();
    expect((await call("POST", `/api/wishes/${wish.id}/received`, { cookie: b.cookie, body: { date: "2023-02-12", note: "", photoIds: [] } })).status).toBe(201);
    expect(await (await call("GET", "/api/wishes", { cookie: a.cookie })).json()).toEqual({ open: [], received: [], partnerJarEmpty: true });
  });

  it("wishes AC14 (R10, R1): reveals only a boolean, never a partner wish count or details", async () => {
    const { a, b } = await paired();
    for (const title of ["Scarf", "Candle"]) {
      expect((await call("POST", "/api/wishes", { cookie: b.cookie, body: { title, price: 450000 } })).status).toBe(201);
    }
    expect(await (await call("GET", "/api/wishes", { cookie: a.cookie })).json()).toEqual({ open: [], received: [], partnerJarEmpty: false });
  });

  it("wishes AC14 (R10, R1): an unpaired user still gets not_in_couple without jar information", async () => {
    const outsider = await user("Outsider");
    const res = await call("GET", "/api/wishes", { cookie: outsider.cookie });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_in_couple" });
  });

  it("wishes AC2 (R3-R5): validates title, positive integer VND, web links and priority", async () => {
    const { a } = await paired();
    for (const [input, error] of [
      [{ title: " " }, "wish_title_invalid"], [{ title: "x".repeat(101) }, "wish_title_invalid"],
      ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "12"].map((price) => [{ title: "Scarf", price }, "wish_price_invalid"]),
      [{ title: "Scarf", link: "javascript:alert(1)" }, "wish_link_invalid"],
      [{ title: "Scarf", priority: 4 }, "invalid_body"],
    ] as const) {
      const res = await call("POST", "/api/wishes", { cookie: a.cookie, body: input });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error });
    }
    const res = await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "💛".repeat(100), link: " https://example.com " } });
    expect(res.status).toBe(201);
  });

  it("wishes AC13 (R6, R23): keeps one photo, swaps and deletes its objects, and rejects others' pending photos", async () => {
    const { a, b, couple } = await paired();
    const first = await upload(a);
    const second = await upload(a);
    const theirs = await upload(b);
    expect((await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "Scarf", photoId: theirs } })).status).toBe(400);
    const created = await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "Scarf", photoId: first } });
    expect(created.status).toBe(201);
    const { wish } = await created.json<{ wish: { id: string } }>();
    const batch = env.DB.batch.bind(env.DB);
    vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      await env.DB.prepare("UPDATE photos SET created_at = 0 WHERE id = ?").bind(second).run();
      return batch(statements);
    });
    const refused = await call("PUT", `/api/wishes/${wish.id}`, { cookie: a.cookie, body: { title: "Changed", photoId: second } });
    expect(refused.status).toBe(400);
    expect(await env.DB.prepare("SELECT title FROM wishes WHERE id = ?").bind(wish.id).first("title")).toBe("Scarf");
    expect(await env.PHOTOS.head(photoKey(couple.id, first, "full"))).not.toBeNull();
    await env.DB.prepare("UPDATE photos SET created_at = ? WHERE id = ?").bind(Date.now(), second).run();
    const changed = await call("PUT", `/api/wishes/${wish.id}`, { cookie: a.cookie, body: { title: "Scarf", photoId: second } });
    expect(changed.status).toBe(200);
    expect(await env.PHOTOS.head(photoKey(couple.id, first, "full"))).toBeNull();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE wish_id = ?").bind(wish.id).first("n")).toBe(1);
    expect((await call("DELETE", `/api/wishes/${wish.id}`, { cookie: a.cookie })).status).toBe(200);
    expect(await env.PHOTOS.head(photoKey(couple.id, second, "full"))).toBeNull();
  });

  it("wishes AC13 (R6): wish photos survive pending cleanup, deletion, cap counting and journal attachment", async () => {
    const { a, b, couple } = await paired();
    const photoId = await upload(a);
    expect((await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "Scarf", photoId } })).status).toBe(201);
    await env.DB.prepare("UPDATE photos SET created_at = 0 WHERE id = ?").bind(photoId).run();
    expect(await sweepPhotos(env, Date.now())).toBe(0);
    expect((await call("DELETE", `/api/photos/${photoId}`, { cookie: a.cookie })).status).toBe(404);
    const input = { date: "2023-02-12", text: "Memory", photoIds: [photoId] };
    expect((await call("POST", "/api/journal", { cookie: a.cookie, body: input })).status).toBe(400);
    const entry = await (await call("POST", "/api/journal", { cookie: a.cookie, body: { ...input, photoIds: [] } })).json<{ entry: { id: string } }>();
    expect((await call("PUT", `/api/journal/${entry.entry.id}`, { cookie: a.cookie, body: input })).status).toBe(400);
    for (const cookie of [a.cookie, b.cookie]) expect((await call("GET", `/api/photos/${photoId}/thumb`, { cookie })).status).toBe(200);
    // Test the final row guard without asking purge to remove live objects.
    vi.spyOn(env.PHOTOS, "delete").mockResolvedValueOnce(undefined);
    await purgePhotos(env, [{ id: photoId, couple_id: couple.id }]);
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(photoId).first()).not.toBeNull();
    await env.DB.prepare("UPDATE photos SET created_at = ? WHERE id = ?").bind(Date.now(), photoId).run();
    for (let i = 0; i < 12; i++) await upload(a);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE uploader_id = ?").bind(a.id).first("n")).toBe(13);
  });
});
