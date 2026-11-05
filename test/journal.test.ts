import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntryInput, JournalEntry, JournalPage } from "../src/shared/types";
import { HOUR, PENDING_PHOTO_TTL } from "../src/worker/lib/time";
import { call, paired, resetDb, upload, user, type TestUser } from "./helpers";

const NOW = Date.parse("2026-11-07T09:00:00Z");
const input = (overrides: Partial<EntryInput> = {}): EntryInput => ({ date: "2026-11-05", text: "Our evening", photoIds: [], ...overrides });
const post = (who: TestUser, body: unknown = input()) => call("POST", "/api/journal", { cookie: who.cookie, body });
async function create(who: TestUser, body = input()): Promise<JournalEntry> {
  const res = await post(who, body);
  expect(res.status).toBe(201);
  return (await res.json<{ entry: JournalEntry }>()).entry;
}
async function page(who: TestUser, cursor?: string): Promise<JournalPage> {
  const res = await call("GET", `/api/journal${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cookie: who.cookie });
  expect(res.status).toBe(200);
  return res.json<JournalPage>();
}
async function error(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ error: code });
}

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("journal create and feed", () => {
  it("AC1 (R1, R2): requires a session and a paired couple, isolating another couple's feed", async () => {
    await error(await call("GET", "/api/journal"), 401, "unauthorized");
    const lone = await user("Lan");
    for (const waiting of [false, true]) {
      if (waiting) await call("POST", "/api/couple", { cookie: lone.cookie });
      await error(await call("GET", "/api/journal", { cookie: lone.cookie }), 404, "not_in_couple");
      await error(await post(lone), 404, "not_in_couple");
    }
    const { a } = await paired();
    await create(a);
    const other = await user("Hoa");
    const ownCouple = await call("GET", "/api/couple", { cookie: lone.cookie });
    const { couple: { pendingCode: { code } } } = await ownCouple.json<{ couple: { pendingCode: { code: string } } }>();
    await call("POST", "/api/couple/join", { cookie: other.cookie, body: { code } });
    expect(await page(lone)).toEqual({ entries: [], nextCursor: null });
    await error(await call("POST", "/api/journal", { cookie: a.cookie, origin: "https://elsewhere.example", body: input() }), 403, "forbidden_origin");
  });

  it("AC2 (R3): refuses empty and whitespace-only entries", async () => {
    const { a } = await paired();
    for (const text of ["", " \n\t "]) await error(await post(a, input({ text })), 400, "entry_empty");
  });

  it("AC3 (R3, R5): saves four photos without text in the requested order and refuses five", async () => {
    const { a } = await paired();
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push(await upload(a));
    await error(await post(a, input({ text: "", photoIds: ids })), 400, "too_many_photos");
    const photoIds = ids.slice(0, 4).reverse();
    expect((await create(a, input({ text: "", photoIds }))).photoIds).toEqual(photoIds);
    expect((await page(a)).entries[0]?.photoIds).toEqual(photoIds);
  });

  it("AC4 (R4): trims text and counts code points, including emoji", async () => {
    const { a } = await paired();
    await error(await post(a, input({ text: "x".repeat(2001) })), 400, "entry_text_too_long");
    expect((await create(a, input({ text: `  ${"x".repeat(2000)} \n` }))).text).toBe("x".repeat(2000));
    expect((await create(a, input({ text: "😘".repeat(2000) }))).text).toBe("😘".repeat(2000));
  });

  it("AC5, AC6, AC8, AC11 (R7, R9, R12, R13, R15): shares partner entries newest first by day then creation time", async () => {
    const { a, b } = await paired();
    vi.setSystemTime(Date.parse("2026-11-06T12:30:00Z"));
    const lunch = await create(b, input({ date: "2026-11-06", text: "Lunch call" }));
    vi.setSystemTime(Date.parse("2026-11-06T22:00:00Z"));
    const evening = await create(b, input({ date: "2026-11-06", text: "Rain" }));
    const past = await create(a, input({ date: "2023-02-12" }));
    const yesterday = await create(a);
    expect((await page(a)).entries.map((entry) => entry.id)).toEqual([evening.id, lunch.id, yesterday.id, past.id]);
    expect((await page(b)).entries).toEqual((await page(a)).entries);
    expect(evening).toEqual({ id: evening.id, authorId: b.id, date: "2026-11-06", text: "Rain", source: "partner", photoIds: [], createdAt: Date.now(), updatedAt: Date.now() });
  });

  it("AC7 (R7, R8): accepts the date boundaries and refuses future or invalid calendar days", async () => {
    const { a } = await paired();
    for (const date of ["2026-11-08", "1899-12-31", "2026-02-29", "2026-11-31", "2026-1-1"]) {
      await error(await post(a, input({ date })), 400, "invalid_entry_date");
    }
    for (const date of ["2026-11-07", "1900-01-01"]) expect((await create(a, input({ date }))).date).toBe(date);
    vi.setSystemTime(NOW + HOUR);
    expect((await create(a, input({ date: "2026-11-08" }))).date).toBe("2026-11-08");
  });

  it("AC2, AC3, AC4 (R3, R4, R5): validates JSON shape before entry values", async () => {
    const { a } = await paired();
    for (const body of [null, [], {}, { ...input(), date: 1 }, { ...input(), text: null }, { ...input(), photoIds: "id" }, { ...input(), photoIds: [1] }, input({ photoIds: ["id", "id"] })]) {
      await error(await post(a, body), 400, "invalid_body");
    }
  });

  it("AC1, AC12 (R1, R17): refuses unknown, partner-owned, expired and already attached photo ids", async () => {
    const { a, b } = await paired();
    const partner = await upload(b);
    const expired = await upload(a);
    await env.DB.prepare("UPDATE photos SET created_at = ? WHERE id = ?").bind(NOW - PENDING_PHOTO_TTL, expired).run();
    const attached = await upload(a);
    await create(a, input({ photoIds: [attached] }));
    for (const id of ["missing", partner, expired, attached]) {
      await error(await post(a, input({ photoIds: [id] })), 400, "photo_invalid");
    }
    expect((await page(a)).entries).toHaveLength(1);
  });

  it("AC3 (R3, R5): concurrent saves of one pending photo leave only the successful entry", async () => {
    const { a } = await paired();
    const photoId = await upload(a);
    const responses = await Promise.all([post(a, input({ text: "", photoIds: [photoId] })), post(a, input({ text: "", photoIds: [photoId] }))]);
    expect(responses.map((res) => res.status).sort()).toEqual([201, 400]);
    expect((await page(a)).entries).toHaveLength(1);
    expect((await page(a)).entries[0]?.photoIds).toEqual([photoId]);
  });

  it("AC15 (R12, R13, R21): pages a split day with tied timestamps without duplicates or gaps", async () => {
    const { a, couple } = await paired();
    const ids = Array.from({ length: 25 }, (_, i) => `entry-${String(i).padStart(2, "0")}`);
    await env.DB.batch(ids.map((id) => env.DB.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, created_at, updated_at)
      VALUES (?, ?, ?, '2026-11-05', ?, ?)`).bind(id, couple.id, a.id, NOW, NOW)));
    const first = await page(a);
    expect(first.entries).toHaveLength(20);
    expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    const second = await page(a, first.nextCursor!);
    expect(second.entries).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect([...first.entries, ...second.entries].map((entry) => entry.id)).toEqual(ids.reverse());
  });

  it("AC15 (R21): rejects malformed cursors", async () => {
    const { a } = await paired();
    for (const cursor of ["", "bad!", btoa("{}"), btoa('["2026-02-30",1,"id"]'), btoa('["2026-11-05",1.5,"id"]'), btoa('["2026-11-05",1,2]'), btoa('["2026-11-05",1,"id",4]')]) {
      await error(await call("GET", `/api/journal?cursor=${encodeURIComponent(cursor)}`, { cookie: a.cookie }), 400, "invalid_body");
    }
  });
});
