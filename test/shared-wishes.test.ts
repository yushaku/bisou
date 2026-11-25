import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { SharedWish, Wish } from "../src/shared/types";
import { sweepPhotos } from "../src/worker/lib/cleanup";
import { call, paired, resetDb, upload, user, type TestUser } from "./helpers";

beforeEach(resetDb);

const create = async (who: TestUser, body: unknown = { title: "Đà Lạt" }) =>
  call("POST", "/api/shared-wishes", { cookie: who.cookie, body });
const created = async (who: TestUser, body: unknown = { title: "Đà Lạt" }) =>
  (await (await create(who, body)).json<{ wish: SharedWish }>()).wish;
const list = async (who: TestUser) =>
  (await call("GET", "/api/shared-wishes", { cookie: who.cookie })).json<{ open: SharedWish[]; done: SharedWish[] }>();

describe("shared wishes", () => {
  it("both partners create, list, edit and delete each other's wishes", async () => {
    const { a, b } = await paired();
    const wish = await created(a, { title: "  Đà Lạt  ", price: 3000000, link: "https://example.com/trip" });
    expect(wish).toMatchObject({
      creatorId: a.id,
      title: "Đà Lạt",
      price: 3000000,
      link: "https://example.com/trip",
      photoId: null,
      status: "open",
      doneOn: null,
    });
    const mine = await list(a);
    const theirs = await list(b);
    expect(theirs).toEqual(mine);
    expect(theirs.open.map((w) => w.id)).toEqual([wish.id]);
    const edited = await call("PUT", `/api/shared-wishes/${wish.id}`, {
      cookie: b.cookie,
      body: { title: "Đà Lạt 3N2Đ" },
    });
    expect(edited.status).toBe(200);
    expect((await edited.json<{ wish: SharedWish }>()).wish).toMatchObject({
      creatorId: a.id,
      title: "Đà Lạt 3N2Đ",
      price: null,
      link: null,
    });
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
    expect(await list(a)).toEqual({ open: [], done: [] });
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: a.cookie })).status).toBe(404);
  });

  it("an outsider and an unpaired user get nothing, and cannot touch a couple's wish", async () => {
    const { a } = await paired();
    const wish = await created(a);
    const outsider = await user("Outside");
    for (const [method, path, body] of [
      ["GET", "", undefined],
      ["POST", "", { title: "x" }],
      ["PUT", `/${wish.id}`, { title: "x" }],
      ["DELETE", `/${wish.id}`, undefined],
    ] as const) {
      const res = await call(method, `/api/shared-wishes${path}`, { cookie: outsider.cookie, body });
      expect(res.status).toBe(404);
    }
    // A member of another couple sees only their own jar and cannot reach this couple's wish.
    const other = await paired2();
    expect(await list(other)).toEqual({ open: [], done: [] });
    expect(
      (await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: other.cookie, body: { title: "x" } })).status,
    ).toBe(404);
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: other.cookie })).status).toBe(404);
    expect((await call("GET", "/api/shared-wishes")).status).toBe(401);
    expect((await list(a)).open[0]).toMatchObject({ title: "Đà Lạt" });
  });

  it.each([
    [{ title: "" }, "wish_title_invalid"],
    [{ title: "   " }, "wish_title_invalid"],
    [{ title: "x".repeat(101) }, "wish_title_invalid"],
    [{ title: "ok", price: 0 }, "wish_price_invalid"],
    [{ title: "ok", price: -5 }, "wish_price_invalid"],
    [{ title: "ok", price: 1.5 }, "wish_price_invalid"],
    [{ title: "ok", link: "javascript:alert(1)" }, "wish_link_invalid"],
    [{ title: "ok", photoId: "missing" }, "photo_invalid"],
  ])("invalid input %j saves nothing", async (body, error) => {
    const { a } = await paired();
    const res = await create(a, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(await list(a)).toEqual({ open: [], done: [] });
  });

  it("accepts a 100 character title and returns open wishes newest first", async () => {
    const { a, b } = await paired();
    const first = await created(a, { title: "ê".repeat(100) });
    await created(b, { title: "second" });
    await env.DB.prepare("UPDATE shared_wishes SET created_at = 1 WHERE id = ?").bind(first.id).run();
    const { open } = await list(a);
    expect(open[0]?.title).toBe("second");
    expect(open[1]?.title).toHaveLength(100);
  });

  it("a done wish cannot be edited but can be deleted, and sits in the done list", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    await env.DB.prepare("UPDATE shared_wishes SET status = 'done', done_on = '2026-11-01', note = 'Vui' WHERE id = ?")
      .bind(wish.id)
      .run();
    const jar = await list(b);
    expect(jar.open).toEqual([]);
    expect(jar.done[0]).toMatchObject({ id: wish.id, status: "done", doneOn: "2026-11-01", note: "Vui" });
    const res = await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie, body: { title: "Changed" } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "shared_wish_done" });
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
    expect(await list(a)).toEqual({ open: [], done: [] });
  });

  it("shared rows never change private jars, the partner-empty flag, spin or claims", async () => {
    const { a, b } = await paired();
    const before = await (await call("GET", "/api/wishes", { cookie: b.cookie })).text();
    await created(a);
    await created(b);
    expect(await (await call("GET", "/api/wishes", { cookie: b.cookie })).text()).toBe(before);
    expect(await (await call("GET", "/api/wishes", { cookie: a.cookie })).json()).toMatchObject({
      open: [],
      partnerJarEmpty: true,
    });
    const spin = await call("POST", "/api/wishes/spin", { cookie: a.cookie, body: { budget: 1000000 } });
    expect(await spin.json()).toEqual({ wish: null });
    const { wish } = await (
      await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "Scarf" } })
    ).json<{ wish: Wish }>();
    const shared = (await list(b)).open[0]!;
    expect((await call("POST", `/api/wishes/${shared.id}/claim`, { cookie: a.cookie })).status).toBe(404);
    expect((await call("PUT", `/api/wishes/${shared.id}`, { cookie: b.cookie, body: { title: "x" } })).status).toBe(
      404,
    );
    expect(
      (await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: a.cookie, body: { title: "x" } })).status,
    ).toBe(404);
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(404);
  });

  it("deleting the couple row removes its shared wishes", async () => {
    const { a, couple } = await paired();
    await created(a);
    const other = await paired2();
    await created(other);
    await env.DB.prepare("DELETE FROM photos").run();
    await env.DB.prepare("DELETE FROM journal_entries").run();
    await env.DB.prepare("DELETE FROM couples WHERE id = ?").bind(couple.id).run();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM shared_wishes").first("n")).toBe(1);
  });
});

describe("shared wish photos", () => {
  const put = (who: TestUser, id: string, body: unknown) =>
    call("PUT", `/api/shared-wishes/${id}`, { cookie: who.cookie, body });

  it("attaches, keeps for either partner, replaces and removes a photo", async () => {
    const { a, b } = await paired();
    const photoId = await upload(a);
    const wish = await created(a, { title: "Ảnh", photoId });
    expect(wish.photoId).toBe(photoId);
    // Either partner sees it through GET, and it survives the pending sweep.
    expect((await call("GET", `/api/photos/${photoId}/thumb`, { cookie: b.cookie })).status).toBe(200);
    await env.DB.prepare("UPDATE photos SET created_at = 1 WHERE id = ?").bind(photoId).run();
    await sweepPhotos(env, Date.now());
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE id = ?").bind(photoId).first("n")).toBe(1);
    // The partner edits the title and keeps the photo they never uploaded.
    const kept = await put(b, wish.id, { title: "Ảnh mới", photoId });
    expect(kept.status).toBe(200);
    expect((await kept.json<{ wish: SharedWish }>()).wish).toMatchObject({ title: "Ảnh mới", photoId });
    // Replace with the partner's own pending upload; the old one is released.
    const next = await upload(b);
    const replaced = await put(b, wish.id, { title: "Ảnh mới", photoId: next });
    expect((await replaced.json<{ wish: SharedWish }>()).wish.photoId).toBe(next);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE id = ?").bind(photoId).first("n")).toBe(0);
    // Removing the photo detaches and purges it.
    const removed = await put(a, wish.id, { title: "Ảnh mới", photoId: null });
    expect((await removed.json<{ wish: SharedWish }>()).wish.photoId).toBeNull();
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE id = ?").bind(next).first("n")).toBe(0);
  });

  it("a partner cannot attach the other's pending upload; the wish stays unchanged", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    const theirs = await upload(a);
    const res = await put(b, wish.id, { title: "Hijack", photoId: theirs });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "photo_invalid" });
    expect((await list(a)).open[0]).toMatchObject({ title: "Đà Lạt", photoId: null });
    expect((await create(b, { title: "New", photoId: theirs })).status).toBe(400);
    expect((await list(a)).open).toHaveLength(1);
    // Still pending for its uploader.
    expect((await put(a, wish.id, { title: "Mine", photoId: theirs })).status).toBe(200);
  });

  it("rolls back every change when the new photo is invalid", async () => {
    const { a, b } = await paired();
    const photoId = await upload(a);
    const wish = await created(a, { title: "Keep", photoId });
    const stranger = await paired2();
    const foreign = await upload(stranger);
    for (const bad of [foreign, "nope"]) {
      expect((await put(b, wish.id, { title: "Changed", photoId: bad })).status).toBe(400);
    }
    expect((await list(a)).open[0]).toMatchObject({ title: "Keep", photoId });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE id = ?").bind(photoId).first("n")).toBe(1);
  });

  it("a photo attached to a shared wish is not pending: it cannot be reused or deleted by upload routes", async () => {
    const { a } = await paired();
    const photoId = await upload(a);
    const wish = await created(a, { title: "Ảnh", photoId });
    expect((await call("DELETE", `/api/photos/${photoId}`, { cookie: a.cookie })).status).toBe(404);
    expect((await create(a, { title: "Second", photoId })).status).toBe(400);
    const entry = await call("POST", "/api/journal", {
      cookie: a.cookie,
      body: { date: "2026-11-01", text: "hi", photoIds: [photoId] },
    });
    expect(entry.status).toBe(400);
    const privateWish = await call("POST", "/api/wishes", { cookie: a.cookie, body: { title: "p", photoId } });
    expect(privateWish.status).toBe(400);
    expect((await list(a)).open[0]).toMatchObject({ id: wish.id, photoId });
  });

  it("deleting a shared wish purges its photo", async () => {
    const { a, b } = await paired();
    const photoId = await upload(a);
    const wish = await created(a, { title: "Ảnh", photoId });
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE id = ?").bind(photoId).first("n")).toBe(0);
    expect((await call("GET", `/api/photos/${photoId}/thumb`, { cookie: a.cookie })).status).toBe(404);
  });
});

let second = 0;
// A second, separate couple.
async function paired2(): Promise<TestUser> {
  const x = await user(`Xa${second++}`);
  const y = await user(`Yb${second++}`);
  const made = await call("POST", "/api/couple", { cookie: x.cookie });
  const code = (await made.json<{ couple: { pendingCode: { code: string } } }>()).couple.pendingCode.code;
  await call("POST", "/api/couple/join", { cookie: y.cookie, body: { code } });
  return x;
}
