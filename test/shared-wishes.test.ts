import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedWish, Wish } from "../src/shared/types";
import { sweepPhotos } from "../src/worker/lib/cleanup";
import type { JournalEntry } from "../src/shared/types";
import { call, paired, resetDb, upload, user, waitForBackground, type TestUser } from "./helpers";
import { decrypt, device, mockPush, subscribe } from "./push-helpers";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

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

describe("marking a shared wish done", () => {
  const done = (who: TestUser, id: string, body: Record<string, unknown> = {}) =>
    call("POST", `/api/shared-wishes/${id}/done`, {
      cookie: who.cookie,
      body: { date: "2023-02-12", note: "Vui lắm", photoIds: [], locale: "vi", ...body },
    });
  const entries = async (who: TestUser) =>
    (await (await call("GET", "/api/journal", { cookie: who.cookie })).json<{ entries: JournalEntry[] }>()).entries;

  it("makes one ordinary journal entry by the caller, both see it, and the wish moves to the done list", async () => {
    const { a, b } = await paired();
    const wish = await created(a, { title: "Đà Lạt" });
    const res = await done(b, wish.id);
    expect(res.status).toBe(201);
    const body = await res.json<{ wish: SharedWish; entry: JournalEntry }>();
    expect(body.wish).toMatchObject({ id: wish.id, status: "done", doneOn: "2023-02-12", note: "Vui lắm" });
    expect(body.entry).toMatchObject({ authorId: b.id, date: "2023-02-12", source: "partner" });
    expect(body.entry.text).toBe("Đã làm cùng nhau: Đà Lạt. Vui lắm");
    for (const who of [a, b]) {
      expect((await entries(who)).map((e) => e.id)).toEqual([body.entry.id]);
    }
    const jar = await list(a);
    expect(jar.open).toEqual([]);
    expect(jar.done.map((w) => w.id)).toEqual([wish.id]);
  });

  it("writes the text in the caller's app language, with or without a note", async () => {
    const { a } = await paired();
    const wish = await created(a, { title: "Pizza" });
    const res = await done(a, wish.id, { locale: "en", note: "" });
    expect((await res.json<{ entry: JournalEntry }>()).entry.text).toBe("Done together: Pizza");
    const second = await created(a, { title: "Phở" });
    const fallback = await done(a, second.id, { locale: "xx", note: "Ngon" });
    expect((await fallback.json<{ entry: JournalEntry }>()).entry.text).toBe("Đã làm cùng nhau: Phở. Ngon");
  });

  it("is done once: a repeat is 409 and both partners at once make exactly one entry", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    const [one, two] = await Promise.all([done(a, wish.id), done(b, wish.id)]);
    expect([one.status, two.status].sort()).toEqual([201, 409]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(1);
    const repeat = await done(a, wish.id);
    expect(repeat.status).toBe(409);
    expect(await repeat.json()).toEqual({ error: "shared_wish_done" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(1);
  });

  it("refuses an outsider, another couple, an unknown wish and invalid input, and leaves the wish open", async () => {
    const { a } = await paired();
    const wish = await created(a);
    expect((await done(await user("Outside"), wish.id)).status).toBe(404);
    expect((await done(await paired2(), wish.id)).status).toBe(404);
    expect((await done(a, "missing")).status).toBe(404);
    for (const [body, error] of [
      [{ date: "2023-02-29" }, "invalid_entry_date"],
      [{ date: "9999-12-31" }, "invalid_entry_date"],
      [{ note: "x".repeat(2001) }, "entry_text_too_long"],
      [{ note: 5 }, "invalid_body"],
      [{ photoIds: ["a", "b", "c", "d", "e"] }, "too_many_photos"],
      [{ photoIds: ["nope"] }, "photo_invalid"],
    ] as const) {
      const res = await done(a, wish.id, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error });
    }
    expect((await list(a)).open).toHaveLength(1);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
  });

  it("counts the prefix and title inside the 2000 code point limit", async () => {
    const { a } = await paired();
    const wish = await created(a, { title: "Pizza" });
    const prefix = Array.from("Done together: Pizza. ").length;
    expect((await done(a, wish.id, { locale: "en", note: "x".repeat(2000 - prefix + 1) })).status).toBe(400);
    expect((await done(a, wish.id, { locale: "en", note: "x".repeat(2000 - prefix) })).status).toBe(201);
  });

  it("attaches up to 4 of the caller's photos, and a raced or foreign photo rolls everything back", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    const mine = [await upload(b), await upload(b)];
    const theirs = await upload(a);
    const expired = await upload(b);
    await env.DB.prepare("UPDATE photos SET created_at = 1 WHERE id = ?").bind(expired).run();
    for (const photoIds of [
      [mine[0]!, theirs],
      [mine[0]!, expired],
    ]) {
      const bad = await done(b, wish.id, { photoIds });
      expect(bad.status).toBe(400);
      expect(await bad.json()).toEqual({ error: "photo_invalid" });
    }
    expect((await list(a)).open).toHaveLength(1);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE entry_id IS NOT NULL").first("n")).toBe(0);
    const ok = await done(b, wish.id, { photoIds: mine });
    expect(ok.status).toBe(201);
    expect((await ok.json<{ entry: JournalEntry }>()).entry.photoIds).toEqual(mine);
  });

  it("keeps the wish's own photo on the done list", async () => {
    const { a } = await paired();
    const photoId = await upload(a);
    const wish = await created(a, { title: "Ảnh", photoId });
    expect((await done(a, wish.id)).status).toBe(201);
    expect((await list(a)).done[0]).toMatchObject({ id: wish.id, photoId });
  });

  it("cannot be edited afterwards, but deleting it keeps the journal entry", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    const { entry } = await (await done(b, wish.id)).json<{ entry: JournalEntry }>();
    expect(
      (await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: a.cookie, body: { title: "Changed" } })).status,
    ).toBe(409);
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: a.cookie })).status).toBe(200);
    expect((await list(b)).done).toEqual([]);
    expect((await entries(b)).map((e) => e.id)).toEqual([entry.id]);
  });

  // Runs `between` right before, or after, the done route's one D1 batch, to exercise a racing partner.
  function aroundDoneBatch(hooks: { before?: () => Promise<unknown>; after?: () => Promise<unknown> }) {
    const real = env.DB.batch.bind(env.DB);
    vi.spyOn(env.DB, "batch").mockImplementation(async (statements) => {
      await hooks.before?.();
      const result = await real(statements);
      await hooks.after?.();
      return result;
    });
  }

  it("lists the done wishes newest done first, whatever order they were created in", async () => {
    const { a } = await paired();
    const first = await created(a, { title: "A" });
    const second = await created(a, { title: "B" });
    await env.DB.prepare("UPDATE shared_wishes SET created_at = 1 WHERE id = ?").bind(first.id).run();
    await env.DB.prepare("UPDATE shared_wishes SET created_at = 2 WHERE id = ?").bind(second.id).run();
    expect((await done(a, second.id)).status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await done(a, first.id)).status).toBe(201);
    expect((await list(a)).done.map((w) => w.title)).toEqual(["A", "B"]);
  });

  it("writes the title the wish has when it is committed, even if a partner renames it meanwhile", async () => {
    const { a, b } = await paired();
    const wish = await created(a, { title: "A" });
    let renamed = false;
    aroundDoneBatch({
      before: async () => {
        if (renamed) return;
        renamed = true;
        expect(
          (await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie, body: { title: "Updated A" } }))
            .status,
        ).toBe(200);
      },
    });
    const res = await done(a, wish.id);
    expect(res.status).toBe(201);
    const body = await res.json<{ wish: SharedWish; entry: JournalEntry }>();
    expect(body.wish.title).toBe("Updated A");
    expect(body.entry.text).toBe("Đã làm cùng nhau: Updated A. Vui lắm");
    expect((await list(b)).done[0]?.title).toBe("Updated A");
  });

  it("returns the wish as committed when a partner changes its price or photo just before the batch", async () => {
    const { a, b } = await paired();
    const oldPhoto = await upload(a);
    const newPhoto = await upload(b);
    const wish = await created(a, { title: "Pizza", price: 100, photoId: oldPhoto });
    let edited = false;
    aroundDoneBatch({
      before: async () => {
        if (edited) return;
        edited = true;
        const res = await call("PUT", `/api/shared-wishes/${wish.id}`, {
          cookie: b.cookie,
          body: { title: "Pizza", price: 200, photoId: newPhoto },
        });
        expect(res.status).toBe(200);
      },
    });
    const res = await done(a, wish.id);
    expect(res.status).toBe(201);
    const body = await res.json<{ wish: SharedWish }>();
    expect(body.wish).toMatchObject({ price: 200, photoId: newPhoto, status: "done" });
    expect(body.wish).toEqual((await list(b)).done[0]);
  });

  it("keeps the 2000 limit on the committed title when a partner renames it to a longer one", async () => {
    const { a, b } = await paired();
    const wish = await created(a, { title: "A" });
    let renamed = false;
    aroundDoneBatch({
      before: async () => {
        if (renamed) return;
        renamed = true;
        await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie, body: { title: "y".repeat(100) } });
      },
    });
    const res = await done(a, wish.id, { locale: "en", note: "x".repeat(1970) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "entry_text_too_long" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
    expect((await list(a)).open).toHaveLength(1);
  });

  it("answers and notifies even if the wish is deleted right after the done batch commits", async () => {
    const { a, b } = await paired();
    const partner = await device("partner");
    await subscribe(a, partner);
    const send = mockPush();
    const wish = await created(b);
    await waitForBackground();
    send.sent.length = 0;
    aroundDoneBatch({
      after: async () => {
        await env.DB.prepare("DELETE FROM shared_wishes WHERE id = ?").bind(wish.id).run();
      },
    });
    const res = await done(b, wish.id);
    expect(res.status).toBe(201);
    const body = await res.json<{ wish: SharedWish; entry: JournalEntry }>();
    expect(body.wish).toMatchObject({ id: wish.id, status: "done", doneOn: "2023-02-12", note: "Vui lắm" });
    expect(body.entry.text).toBe("Đã làm cùng nhau: Đà Lạt. Vui lắm");
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
    expect(await decrypt(send.sent[0]!.body, partner)).toMatchObject({ tag: "journal" });
    expect((await entries(a)).map((e) => e.id)).toEqual([body.entry.id]);
  });

  it("rolls back when a photo becomes unavailable after validation, and the other upload stays reusable", async () => {
    const { a, b } = await paired();
    const wish = await created(a);
    const keep = await upload(b);
    const lost = await upload(b);
    let expired = false;
    aroundDoneBatch({
      before: async () => {
        if (expired) return;
        expired = true;
        await env.DB.prepare("UPDATE photos SET created_at = 1 WHERE id = ?").bind(lost).run();
      },
    });
    const bad = await done(b, wish.id, { photoIds: [keep, lost] });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "photo_invalid" });
    expect((await list(a)).open).toHaveLength(1);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
    expect(await env.DB.prepare("SELECT entry_id FROM photos WHERE id = ?").bind(keep).first("entry_id")).toBeNull();
    vi.restoreAllMocks();
    const ok = await done(b, wish.id, { photoIds: [keep] });
    expect(ok.status).toBe(201);
    expect((await ok.json<{ entry: JournalEntry }>()).entry.photoIds).toEqual([keep]);
  });

  it("sends only the usual journal push to the other partner", async () => {
    const { a, b } = await paired();
    const own = await device("own");
    const partner = await device("partner");
    await subscribe(a, own);
    await subscribe(b, partner);
    const send = mockPush();
    const wish = await created(a);
    await waitForBackground();
    send.sent.length = 0;
    expect((await done(b, wish.id)).status).toBe(201);
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
    expect(send.sent[0]!.endpoint).toBe(own.body.endpoint);
    expect(await decrypt(send.sent[0]!.body, own)).toMatchObject({ title: "Minh vừa viết nhật ký", tag: "journal" });
    expect((await done(b, wish.id)).status).toBe(409);
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
  });
});

describe("push on a new shared wish", () => {
  async function setup() {
    const { a, b } = await paired();
    await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "vi" } });
    const own = await device("own");
    const partner = await device("partner");
    const off = await device("off", { journal: false, reminders: true });
    await subscribe(a, own);
    await subscribe(b, partner);
    await subscribe(b, off);
    return { a, b, own, partner, send: mockPush() };
  }

  it("goes only to the other partner's devices with the journal switch on, in their language", async () => {
    const { a, b, partner, send } = await setup();
    expect((await create(a, { title: "Đà Lạt" })).status).toBe(201);
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
    expect(send.sent[0]!.endpoint).toBe(partner.body.endpoint);
    expect(await decrypt(send.sent[0]!.body, partner)).toEqual({
      title: "An vừa thêm một điều ước chung: Đà Lạt",
      url: "/wishes?section=shared",
      tag: "shared-wish",
    });
    expect(send.sent[0]!.headers.get("topic")).toBe("shared-wish");
    await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale: "en" } });
    await create(a, { title: "Pizza" });
    await waitForBackground();
    expect(await decrypt(send.sent[1]!.body, partner)).toMatchObject({ title: "An added a shared wish: Pizza" });
  });

  it("cuts a long title to about 60 characters, and the wish keeps its full title", async () => {
    const { a, partner, send } = await setup();
    const title = "ê".repeat(100);
    const wish = await created(a, { title });
    await waitForBackground();
    const { title: shown } = await decrypt(send.sent[0]!.body, partner);
    expect(shown).toBe(`An vừa thêm một điều ước chung: ${"ê".repeat(59)}…`);
    expect(wish.title).toBe(title);
    await create(a, { title: "x".repeat(60) });
    await waitForBackground();
    expect((await decrypt(send.sent[1]!.body, partner)).title).toBe(
      `An vừa thêm một điều ước chung: ${"x".repeat(60)}`,
    );
  });

  it("is sent for create only: not for edit, delete, a refused create, or by the other partner to the creator's own devices", async () => {
    const { a, b, own, partner, send } = await setup();
    const wish = await created(a);
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
    expect((await create(a, { title: "" })).status).toBe(400);
    expect(
      (await call("PUT", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie, body: { title: "Edit" } })).status,
    ).toBe(200);
    expect((await call("DELETE", `/api/shared-wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
    await waitForBackground();
    expect(send.sent).toHaveLength(1);
    // The creator's own device is never a recipient; the other partner's create reaches it instead.
    await create(b, { title: "Phở" });
    await waitForBackground();
    expect(send.sent).toHaveLength(2);
    expect(send.sent[1]!.endpoint).toBe(own.body.endpoint);
    expect(send.sent.filter((m) => m.endpoint === partner.body.endpoint)).toHaveLength(1);
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
