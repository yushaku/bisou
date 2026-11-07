import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntryInput, JournalEntry, JournalPage } from "../src/shared/types";
import { HOUR, PENDING_PHOTO_TTL } from "../src/worker/lib/time";
import { photoKey } from "../src/worker/lib/photos";
import { app } from "../src/worker/app";
import { call, ORIGIN, paired, resetDb, testContext, upload, user, type TestUser } from "./helpers";

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

describe("journal edit and delete", () => {
  it("AC9 (R10): only the author can edit and changing the day preserves creation time and origin", async () => {
    const { a, b } = await paired();
    const entry = await create(a);
    vi.setSystemTime(NOW + HOUR);
    await error(await call("PUT", `/api/journal/${entry.id}`, { cookie: b.cookie, body: input({ text: "not mine" }) }), 403, "not_author");
    expect((await page(a)).entries[0]).toEqual(entry);
    const res = await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input({ date: "2023-02-12", text: "  Fixed typo  " }) });
    expect(res.status).toBe(200);
    const changed = (await res.json<{ entry: JournalEntry }>()).entry;
    expect(changed).toEqual({ ...entry, date: "2023-02-12", text: "Fixed typo", updatedAt: NOW + HOUR });
    expect((await page(b)).entries[0]).toEqual(changed);
  });

  it("AC1, AC9, AC10 (R1, R10, R11): foreign and unknown entry ids reveal nothing", async () => {
    const { a } = await paired();
    const entry = await create(a);
    const outsider = await user("Lan");
    for (const method of ["PUT", "DELETE"]) {
      for (const id of [entry.id, "unknown"]) {
        const res = await call(method, `/api/journal/${id}`, { cookie: outsider.cookie, body: method === "PUT" ? input() : undefined });
        expect(res.status).toBe(404);
      }
      await error(await call(method, "/api/journal/unknown", { cookie: a.cookie, body: method === "PUT" ? input() : undefined }), 404, "not_found");
    }
    expect((await page(a)).entries[0]).toEqual(entry);
  });

  it("AC7, AC9 (R3, R4, R7, R8, R10): edits enforce the same shape, date, text and empty rules", async () => {
    const { a } = await paired();
    const entry = await create(a);
    for (const [body, code] of [
      [{}, "invalid_body"], [input({ date: "2026-11-08" }), "invalid_entry_date"],
      [input({ date: "1899-12-31" }), "invalid_entry_date"], [input({ text: "x".repeat(2001) }), "entry_text_too_long"],
      [input({ text: " " }), "entry_empty"], [input({ photoIds: ["a", "b", "c", "d", "e"] }), "too_many_photos"],
      [input({ photoIds: ["a", "a"] }), "invalid_body"],
    ] as const) {
      await error(await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body }), 400, code);
    }
    expect((await page(a)).entries[0]).toEqual(entry);
    for (const date of ["1900-01-01", "2026-11-07"]) {
      expect((await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input({ date }) })).status).toBe(200);
    }
  });

  it("AC9, AC12 (R10, R17): keeps, reorders, adds and removes photos with both removed objects purged", async () => {
    const { a, b, couple } = await paired();
    const first = await upload(a);
    const second = await upload(a);
    const added = await upload(a);
    const entry = await create(a, input({ photoIds: [first, second] }));
    const photoIds = [added, second];
    const res = await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input({ photoIds }) });
    expect(res.status).toBe(200);
    expect((await res.json<{ entry: JournalEntry }>()).entry.photoIds).toEqual(photoIds);
    expect((await page(b)).entries[0]?.photoIds).toEqual(photoIds);
    for (const size of ["full", "thumb"] as const) {
      expect(await env.PHOTOS.head(photoKey(couple.id, first, size))).toBeNull();
      await error(await call("GET", `/api/photos/${first}/${size}`, { cookie: b.cookie }), 404, "not_found");
    }
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(first).first()).toBeNull();
    const cleared = await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input() });
    expect(cleared.status).toBe(200);
    expect((await page(b)).entries[0]?.photoIds).toEqual([]);
  });

  it("AC1, AC9, AC12 (R1, R10, R17): rejects another entry's photos, partner pending photos and expired uploads on edit", async () => {
    const { a, b } = await paired();
    const partner = await upload(b);
    const attached = await upload(a);
    const expired = await upload(a);
    await env.DB.prepare("UPDATE photos SET created_at = ? WHERE id = ?").bind(NOW - PENDING_PHOTO_TTL, expired).run();
    await create(a, input({ photoIds: [attached] }));
    const entry = await create(a);
    for (const photoId of [partner, attached, expired, "unknown"]) {
      await error(await call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input({ photoIds: [photoId] }) }), 400, "photo_invalid");
    }
    expect((await page(a)).entries.find((row) => row.id === entry.id)).toEqual(entry);
  });

  it("AC10 (R11, R20): only the author deletes the entry, both renditions and all photo rows", async () => {
    const { a, b, couple } = await paired();
    const photoIds = [await upload(a), await upload(a)];
    const entry = await create(a, input({ photoIds }));
    await error(await call("DELETE", `/api/journal/${entry.id}`, { cookie: b.cookie }), 403, "not_author");
    expect((await page(b)).entries[0]).toEqual(entry);
    const res = await call("DELETE", `/api/journal/${entry.id}`, { cookie: a.cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await page(b)).entries).toEqual([]);
    for (const id of photoIds) {
      for (const size of ["full", "thumb"] as const) {
        await error(await call("GET", `/api/photos/${id}/${size}`, { cookie: b.cookie }), 404, "not_found");
        expect(await env.PHOTOS.head(photoKey(couple.id, id, size))).toBeNull();
      }
    }
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(0);
  });

  it("AC10 (R11, R17): a failed R2 purge never leaves deleted photos readable", async () => {
    const { a, b } = await paired();
    const photoId = await upload(a);
    const entry = await create(a, input({ photoIds: [photoId] }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(env.PHOTOS, "delete").mockRejectedValueOnce(new Error("unavailable"));
    expect((await call("DELETE", `/api/journal/${entry.id}`, { cookie: a.cookie })).status).toBe(200);
    expect(log).toHaveBeenCalledWith("[bisou] photo purge failed", 1);
    for (const size of ["full", "thumb"]) await error(await call("GET", `/api/photos/${photoId}/${size}`, { cookie: b.cookie }), 404, "not_found");
    expect(await env.DB.prepare("SELECT entry_id, position, created_at FROM photos WHERE id = ?").bind(photoId).first())
      .toEqual({ entry_id: null, position: null, created_at: 0 });
  });

  it("AC9, AC10 (R10, R11): a concurrent delete and edit cannot resurrect the entry or attach a new photo to it", async () => {
    const { a } = await paired();
    const entry = await create(a);
    const photoId = await upload(a);
    const [edited, deleted] = await Promise.all([
      call("PUT", `/api/journal/${entry.id}`, { cookie: a.cookie, body: input({ photoIds: [photoId] }) }),
      call("DELETE", `/api/journal/${entry.id}`, { cookie: a.cookie }),
    ]);
    expect([200, 404]).toContain(edited.status);
    expect(deleted.status).toBe(200);
    expect((await page(a)).entries).toEqual([]);
    await error(await call("GET", `/api/photos/${photoId}/full`, { cookie: a.cookie }), 404, "not_found");
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("journal create and feed", () => {
  it.each(["POST", "PUT"])("R4: %s accepts 16 KB JSON and rejects larger bodies before saving", async (method) => {
    const { a } = await paired();
    const entry = await create(a);
    const path = method === "POST" ? "/api/journal" : `/api/journal/${entry.id}`;
    const json = JSON.stringify(input({ text: "😀".repeat(2000) }));
    const body = json + " ".repeat(16 * 1024 - new TextEncoder().encode(json).length);
    for (const contentLength of [true, false]) {
      for (const extra of [0, 1]) {
        const bytes = new TextEncoder().encode(body + " ".repeat(extra));
        const headers = new Headers({ Cookie: a.cookie, Origin: ORIGIN, "Content-Type": "application/json" });
        if (contentLength) headers.set("Content-Length", String(bytes.length));
        const res = await app.request(`${ORIGIN}${path}`, {
          method, headers,
          body: contentLength ? bytes : new ReadableStream({ start(controller) {
            controller.enqueue(bytes.subarray(0, 8192));
            controller.enqueue(bytes.subarray(8192));
            controller.close();
          } }),
        }, env, testContext);
        if (extra) await error(res, 413, "body_too_large");
        else expect(res.status).toBe(method === "POST" ? 201 : 200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
      }
    }
    const entries = (await page(a)).entries;
    expect(entries).toHaveLength(method === "POST" ? 3 : 1);
    expect(entries.find((row) => row.id === entry.id)?.text).toBe(method === "POST" ? entry.text : "😀".repeat(2000));
  });

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
