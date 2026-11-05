import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wish, JournalEntry, Claim } from "../src/shared/types";
import { latestDay } from "../src/shared/days";
import { call, paired, resetDb, upload, type TestUser } from "./helpers";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
const input = { date: "2023-02-12", note: "From An, so soft", photoIds: [] as string[] };
async function create(owner: TestUser) {
  return (await (await call("POST", "/api/wishes", { cookie: owner.cookie, body: { title: "Linen scarf", price: 450000 } })).json<{ wish: Wish }>()).wish;
}
const receive = (owner: TestUser, id: string, body: unknown = input) => call("POST", `/api/wishes/${id}/received`, { cookie: owner.cookie, body });

describe("wish receipt", () => {
  it("AC11 (R18, R19, R22): only the owner receives, for a valid day, permanently; the claim follows", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    await call("POST", `/api/wishes/${wish.id}/claim`, { cookie: a.cookie });
    expect((await receive(a, wish.id)).status).toBe(404);
    for (const date of ["2023-02-29", "1899-12-31", "9999-12-31"]) {
      const invalid = await receive(b, wish.id, { ...input, date });
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toEqual({ error: "invalid_entry_date" });
    }
    const res = await receive(b, wish.id);
    expect(res.status).toBe(201);
    const { wish: received } = await res.json<{ wish: Wish }>();
    expect(received).toMatchObject({ status: "received", receivedOn: input.date, note: input.note });
    const jar = await (await call("GET", "/api/wishes", { cookie: b.cookie })).json<{ open: Wish[]; received: Wish[] }>();
    expect(jar.open).toEqual([]);
    expect(jar.received.map((w) => w.id)).toEqual([wish.id]);
    expect((await call("PUT", `/api/wishes/${wish.id}`, { cookie: b.cookie, body: { title: "Changed" } })).status).toBe(409);
    const { claims } = await (await call("GET", "/api/wishes/claims", { cookie: a.cookie })).json<{ claims: Claim[] }>();
    expect(claims[0]?.status).toBe("received");
    expect((await call("DELETE", `/api/wishes/claims/${claims[0]!.id}`, { cookie: a.cookie })).status).toBe(409);
    expect(await (await call("POST", "/api/wishes/spin", { cookie: a.cookie, body: { budget: 500000 } })).json()).toEqual({ wish: null });
    expect((await call("DELETE", `/api/wishes/${wish.id}`, { cookie: b.cookie })).status).toBe(200);
  });

  it.each(["vi", "en"] as const)("AC12 (R20, R21): creates one ordinary journal entry with 4 photos in %s", async (locale) => {
    const { a, b } = await paired();
    await call("PATCH", "/api/me", { cookie: b.cookie, body: { locale } });
    const wish = await create(b);
    const photoIds = [];
    for (let i = 0; i < 4; i++) photoIds.push(await upload(b));
    const res = await receive(b, wish.id, { ...input, photoIds });
    expect(res.status).toBe(201);
    const { entry } = await res.json<{ entry: JournalEntry }>();
    expect(entry).toMatchObject({ authorId: b.id, date: input.date, source: "wish", photoIds,
      text: `${locale === "vi" ? "Đã nhận" : "Received"}: Linen scarf. ${input.note}` });
    const feed = await (await call("GET", "/api/journal", { cookie: a.cookie })).json<{ entries: JournalEntry[] }>();
    expect(feed.entries).toEqual([entry]);
    expect((await receive(b, wish.id)).status).toBe(409);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(1);
    for (const method of ["PUT", "DELETE"]) expect((await call(method, `/api/journal/${entry.id}`, { cookie: a.cookie, body: { date: input.date, text: "Changed", photoIds } })).status).toBe(403);
    expect((await call("PUT", `/api/journal/${entry.id}`, { cookie: b.cookie, body: { date: input.date, text: "Edited memory", photoIds } })).status).toBe(200);
    expect((await call("DELETE", `/api/journal/${entry.id}`, { cookie: b.cookie })).status).toBe(200);
    expect(await env.DB.prepare("SELECT status FROM wishes WHERE id = ?").bind(wish.id).first("status")).toBe("received");
  });

  it("AC11, AC12 (R18-R20): simultaneous receipt submissions create exactly one entry", async () => {
    const { b } = await paired();
    const wish = await create(b);
    const results = await Promise.all([receive(b, wish.id), receive(b, wish.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(1);
  });

  it("AC12, AC13 (R6, R18, R20): invalid or raced photos save neither receipt nor entry", async () => {
    const { a, b } = await paired();
    const wish = await create(b);
    const theirs = await upload(a);
    const attached = await upload(b);
    await call("POST", "/api/wishes", { cookie: b.cookie, body: { title: "Other", photoId: attached } });
    for (const photoIds of [[theirs], [attached], ["missing"], [theirs, theirs], ["1", "2", "3", "4", "5"]]) {
      expect((await receive(b, wish.id, { ...input, photoIds })).status).toBe(400);
    }
    expect((await receive(b, wish.id, { ...input, note: "x".repeat(2000) })).status).toBe(400);
    expect((await receive(b, wish.id, { ...input, note: 42 })).status).toBe(400);
    const photoId = await upload(b);
    const batch = env.DB.batch.bind(env.DB);
    vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      await env.DB.prepare("UPDATE photos SET created_at = 0 WHERE id = ?").bind(photoId).run();
      return batch(statements);
    });
    const raced = await receive(b, wish.id, { ...input, photoIds: [photoId] });
    expect(raced.status).toBe(400);
    expect(await raced.json()).toEqual({ error: "photo_invalid" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
    expect(await env.DB.prepare("SELECT status FROM wishes WHERE id = ?").bind(wish.id).first("status")).toBe("open");
  });

  it("AC11 (R18): accepts the latest journal day and an empty note", async () => {
    const { b } = await paired();
    const wish = await create(b);
    const res = await receive(b, wish.id, { date: latestDay(Date.now()), note: "  ", photoIds: [] });
    expect(res.status).toBe(201);
    expect((await res.json<{ entry: JournalEntry }>()).entry.text).toBe("Đã nhận: Linen scarf");
  });
});
