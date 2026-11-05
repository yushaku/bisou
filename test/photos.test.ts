import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHOTO_SIZES, PHOTO_UPLOAD_MAX_BYTES } from "../src/shared/journal";
import { app } from "../src/worker/app";
import { PENDING_PHOTO_TTL } from "../src/worker/lib/time";
import { checkPhotoBytes, purgePhotos } from "../src/worker/lib/photos";
import { call, explain, jpeg, ORIGIN, paired, photoForm, resetDb, upload, user, webp } from "./helpers";

const full = () => jpeg({ width: 1440, height: 1440 });
const thumb = () => jpeg({ width: 480, height: 480 });
const key = (coupleId: string, id: string, size: string) => `couples/${coupleId}/photos/${id}/${size}`;

async function attach(coupleId: string, authorId: string, photoId: string) {
  await env.DB.prepare(`INSERT INTO journal_entries (id, couple_id, author_id, entry_date, created_at, updated_at)
    VALUES ('entry', ?, ?, '2026-11-05', 1, 1)`).bind(coupleId, authorId).run();
  await env.DB.prepare("UPDATE photos SET entry_id = 'entry', position = 0 WHERE id = ?").bind(photoId).run();
}

async function error(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ error: code });
  expect(res.headers.get("Cache-Control")).toBe("no-store");
}

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T09:00:00Z"));
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("private photo upload and serving", () => {
  it("AC1 (R1, R2): requires a session, same origin, and two partners for upload", async () => {
    await error(await call("POST", "/api/photos", { form: photoForm(full(), thumb()) }), 401, "unauthorized");
    await error(await call("GET", "/api/photos/unknown/full"), 401, "unauthorized");
    const lone = await user("Lan");
    for (const waiting of [false, true]) {
      if (waiting) await call("POST", "/api/couple", { cookie: lone.cookie });
      await error(await call("POST", "/api/photos", { cookie: lone.cookie, form: photoForm(full(), thumb()) }), 404, "not_in_couple");
    }
    const { a } = await paired();
    await error(await call("POST", "/api/photos", { cookie: a.cookie, origin: "https://outsider.example", form: photoForm(full(), thumb()) }), 403, "forbidden_origin");
  });

  it("AC12, AC1 (R1, R16, R17): keeps both renditions private until attached and serves exact bytes to either partner", async () => {
    const { a, b, couple } = await paired();
    const id = await upload(a);
    const outsider = await user("Lan");
    const otherPartner = await user("Hoa");
    const otherCouple = await call("POST", "/api/couple", { cookie: outsider.cookie });
    const { couple: { pendingCode: { code } } } = await otherCouple.json<{ couple: { pendingCode: { code: string } } }>();
    await call("POST", "/api/couple/join", { cookie: otherPartner.cookie, body: { code } });
    expect(await env.DB.prepare("SELECT couple_id, uploader_id, entry_id, created_at FROM photos WHERE id = ?").bind(id).first())
      .toEqual({ couple_id: couple.id, uploader_id: a.id, entry_id: null, created_at: Date.now() });
    for (const size of ["full", "thumb"]) {
      await error(await call("GET", `/api/photos/${id}/${size}`, { cookie: a.cookie }), 404, "not_found");
    }
    await attach(couple.id, a.id, id);
    for (const who of [a, b]) {
      for (const [size, bytes] of [["full", full()], ["thumb", thumb()]] as const) {
        const res = await call("GET", `/api/photos/${id}/${size}`, { cookie: who.cookie });
        expect(res.status).toBe(200);
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
        expect(res.headers.get("Content-Type")).toBe("image/jpeg");
        expect(res.headers.get("Content-Length")).toBe(String(bytes.length));
        expect(res.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        await error(await call("GET", `/api/photos/${id}/${size}`, { cookie: outsider.cookie }), 404, "not_found");
      }
    }
    await error(await call("GET", `/api/photos/${id}/original`, { cookie: a.cookie }), 404, "not_found");
    await error(await call("GET", "/api/photos/missing/full", { cookie: a.cookie }), 404, "not_found");
    await env.PHOTOS.delete(key(couple.id, id, "thumb"));
    await error(await call("GET", `/api/photos/${id}/thumb`, { cookie: a.cookie }), 404, "not_found");
    await env.DB.prepare("UPDATE photos SET entry_id = NULL WHERE id = ?").bind(id).run();
    await error(await call("GET", `/api/photos/${id}/full`, { cookie: b.cookie }), 404, "not_found");
  });

  it.each(["VP8", "VP8L", "VP8X"] as const)("AC13 (R16, R18): accepts square %s headers including a small crop", async (kind) => {
    const { a, b, couple } = await paired();
    const bytes = webp({ width: 300, height: 300, kind });
    const id = await upload(a, photoForm(bytes, bytes, { full: "image/webp", thumb: "image/webp" }));
    await attach(couple.id, a.id, id);
    const res = await call("GET", `/api/photos/${id}/full`, { cookie: b.cookie });
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("AC12 (R16): refuses WebP EXIF or XMP in either rendition", async () => {
    const { a } = await paired();
    for (const size of ["full", "thumb"] as const) {
      for (const kind of ["VP8", "VP8L", "VP8X"] as const) {
        for (const xmp of [false, true]) {
          const bytes = webp({ width: 300, height: 300, kind, exif: true });
          if (xmp) bytes.set(new TextEncoder().encode("XMP "), bytes.length - 14);
          const form = photoForm(full(), thumb());
          form.set(size, new File([bytes], size, { type: "image/webp" }));
          await error(await call("POST", "/api/photos", { cookie: a.cookie, form }), 400, "photo_invalid");
        }
      }
    }
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(0);
  });

  it("AC12 (R16): strips every Exif GPS and XMP APP1 segment from both stored JPEG renditions", async () => {
    const { a, couple } = await paired();
    // Little-endian TIFF: IFD0 points to a GPS IFD with a north latitude reference.
    const exif = new Uint8Array([69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0,
      1, 0, 0x25, 0x88, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 1, 0, 2, 0, 2, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0]);
    const xmp = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta exif:GPSLatitude="10,46N"/>');
    const segment = (data: Uint8Array) => [0xff, 0xe1, (data.length + 2) >> 8, (data.length + 2) & 255, ...data];
    const addMetadata = (clean: Uint8Array) => new Uint8Array([
      ...clean.subarray(0, 2), ...segment(exif), ...clean.subarray(2, 15), ...segment(xmp), ...segment(exif), ...clean.subarray(15),
    ]);
    const id = await upload(a, photoForm(addMetadata(full()), addMetadata(thumb())));
    for (const [size, clean] of [["full", full()], ["thumb", thumb()]] as const) {
      const stored = new Uint8Array(await (await env.PHOTOS.get(key(couple.id, id, size)))!.arrayBuffer());
      expect(stored).toEqual(clean);
      expect(stored.some((byte, i) => byte === 0xff && stored[i + 1] === 0xe1)).toBe(false);
      expect(new TextDecoder().decode(stored)).not.toContain("Exif");
      expect(new TextDecoder().decode(stored)).not.toContain("GPSLatitude");
    }
  });

  it("AC12 (R16): refuses JPEGs truncated in APP1, scan headers, or before the end marker", async () => {
    const { a } = await paired();
    const bytes = jpeg({ width: 300, height: 300, exif: true });
    for (const truncated of [full().subarray(0, -2), bytes.subarray(0, 8), bytes.subarray(0, -5), bytes.subarray(0, -2), bytes.subarray(0, -1)]) {
      await error(await call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(truncated, thumb()) }), 400, "photo_invalid");
    }
  });

  it.each([
    [1440, 1000, 480, 480], [1440, 1440, 480, 479], [1441, 1441, 480, 480],
    [1440, 1440, 481, 481], [500, 500, 600, 600], [300, 300, 400, 400], [0, 0, 0, 0],
  ])("AC13 (R16, R18): refuses invalid full %ix%i and thumb %ix%i dimensions", async (fw, fh, tw, th) => {
    const { a } = await paired();
    await error(await call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(jpeg({ width: fw, height: fh }), jpeg({ width: tw, height: th })) }), 400, "photo_invalid");
  });

  it("AC12, AC13 (R16, R18): rejects malformed, missing, empty, non-file and mismatched parts", async () => {
    const { a } = await paired();
    for (const part of [null, "text", new File([], "empty", { type: "image/jpeg" }), new File(["bad"], "bad", { type: "image/jpeg" }), new File([full()], "wrong", { type: "image/webp" })]) {
      const form = photoForm(full(), thumb());
      form.delete("thumb");
      if (part !== null) form.set("thumb", part);
      await error(await call("POST", "/api/photos", { cookie: a.cookie, form }), 400, "photo_invalid");
    }
    await error(await app.request("/api/photos", { method: "POST", headers: { Cookie: a.cookie, Origin: "http://localhost", "Content-Type": "multipart/form-data" }, body: "broken" }, env), 400, "photo_invalid");
  });

  it("AC12 (R16, R17): enforces body and part types and byte limits", async () => {
    const { a } = await paired();
    await error(await app.request(`${ORIGIN}/api/photos`, { method: "POST", headers: { Cookie: a.cookie, Origin: ORIGIN, "Content-Type": "image/jpeg" }, body: full() }, env), 415, "unsupported_photo_type");
    await error(await call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(full(), thumb(), { thumb: "image/png" }) }), 415, "unsupported_photo_type");
    for (const size of ["full", "thumb"] as const) {
      const form = photoForm(full(), thumb());
      form.set(size, new File([new Uint8Array(PHOTO_SIZES[size].maxBytes + 1)], size, { type: "image/jpeg" }));
      await error(await call("POST", "/api/photos", { cookie: a.cookie, form }), 413, "photo_too_large");
    }
    await error(await app.request(`${ORIGIN}/api/photos`, { method: "POST", headers: { Cookie: a.cookie, Origin: ORIGIN, "Content-Type": "multipart/form-data; boundary=x", "Content-Length": String(PHOTO_UPLOAD_MAX_BYTES + 1) }, body: "x" }, env), 413, "photo_too_large");
    const form = photoForm(full(), thumb());
    form.set("extra", "x".repeat(PHOTO_UPLOAD_MAX_BYTES));
    await error(await call("POST", "/api/photos", { cookie: a.cookie, form }), 413, "photo_too_large");
  });

  it("AC12 (R17): caps pending photos per uploader at twelve", async () => {
    const { a, b, couple } = await paired();
    const ids = [];
    for (let i = 0; i < 12; i++) ids.push(await upload(a));
    await error(await call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(full(), thumb()) }), 429, "too_many_pending_photos");
    await upload(b);
    await attach(couple.id, a.id, ids[0]!);
    await upload(a);
  });

  it.each(["expired", "boundary", "purge"])("AC12 (R17): twelve %s rows do not use live pending slots", async (kind) => {
    const { a } = await paired();
    for (let i = 0; i < 12; i++) await upload(a);
    const createdAt = kind === "purge" ? 0 : Date.now() - PENDING_PHOTO_TTL - (kind === "expired" ? 1 : 0);
    await env.DB.prepare("UPDATE photos SET created_at = ?").bind(createdAt).run();
    await upload(a);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(13);
  });

  it("removes only the uploader's unattached photo and frees its slot", async () => {
    const { a, b, couple } = await paired();
    const id = await upload(a);
    for (let i = 1; i < 12; i++) await upload(a);
    const path = `/api/photos/${id}`;
    await error(await call("DELETE", path), 401, "unauthorized");
    await error(await call("DELETE", path, { cookie: a.cookie, origin: "https://outsider.example" }), 403, "forbidden_origin");
    await error(await call("DELETE", path, { cookie: b.cookie }), 404, "not_found");
    await error(await call("DELETE", "/api/photos/missing", { cookie: a.cookie }), 404, "not_found");
    const res = await call("DELETE", path, { cookie: a.cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(id).first()).toBeNull();
    for (const size of ["full", "thumb"]) expect(await env.PHOTOS.head(key(couple.id, id, size))).toBeNull();
    await error(await call("DELETE", path, { cookie: a.cookie }), 404, "not_found");
    const attached = await upload(a);
    await attach(couple.id, a.id, attached);
    await error(await call("DELETE", `/api/photos/${attached}`, { cookie: a.cookie }), 404, "not_found");
    expect(await env.PHOTOS.head(key(couple.id, attached, "full"))).not.toBeNull();
  });

  it("expires a removed photo before R2 deletion so a racing save cannot attach it", async () => {
    const { a } = await paired();
    const id = await upload(a);
    const batch = env.DB.batch.bind(env.DB);
    const removeObjects = env.PHOTOS.delete.bind(env.PHOTOS);
    vi.spyOn(env.DB, "batch").mockImplementationOnce(async (statements) => {
      let saved: D1Result[] = [];
      vi.spyOn(env.PHOTOS, "delete").mockImplementationOnce(async (keys) => {
        saved = await batch(statements);
        await removeObjects(keys);
      });
      expect((await call("DELETE", `/api/photos/${id}`, { cookie: a.cookie })).status).toBe(200);
      return saved;
    });
    await error(await call("POST", "/api/journal", { cookie: a.cookie, body: { date: "2026-11-05", text: "", photoIds: [id] } }), 400, "photo_invalid");
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM journal_entries").first("n")).toBe(0);
  });

  it("keeps failed photo deletion marked for the sweep without using a pending slot", async () => {
    const { a } = await paired();
    const id = await upload(a);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(env.PHOTOS, "delete").mockRejectedValueOnce(new Error("unavailable"));
    expect((await call("DELETE", `/api/photos/${id}`, { cookie: a.cookie })).status).toBe(200);
    expect(await env.DB.prepare("SELECT created_at FROM photos WHERE id = ?").bind(id).first("created_at")).toBe(0);
    expect((await call("DELETE", `/api/photos/${id}`, { cookie: a.cookie })).status).toBe(200);
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(id).first()).toBeNull();
  });

  it("AC12 (R17): concurrent uploads cannot exceed the pending cap or leave extra objects", async () => {
    const { a, couple } = await paired();
    for (let i = 0; i < 11; i++) await upload(a);
    const responses = await Promise.all(Array.from({ length: 3 }, () => call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(full(), thumb()) })));
    expect(responses.map((res) => res.status).sort()).toEqual([201, 429, 429]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE uploader_id = ?").bind(a.id).first("n")).toBe(12);
    expect((await env.PHOTOS.list({ prefix: `couples/${couple.id}/` })).objects).toHaveLength(24);
  });

  it.each(["put", "insert"])("AC12 (R17): a failed %s removes both objects without a pending row", async (failure) => {
    const { a, couple } = await paired();
    vi.spyOn(console, "error").mockImplementation(() => {});
    if (failure === "put") {
      const put = env.PHOTOS.put.bind(env.PHOTOS);
      vi.spyOn(env.PHOTOS, "put").mockImplementation((objectKey, bytes, options) => {
        if (objectKey.endsWith("/thumb")) return Promise.reject(new Error("put failed"));
        return put(objectKey, bytes, options);
      });
    } else {
      const prepare = env.DB.prepare.bind(env.DB);
      vi.spyOn(env.DB, "prepare").mockImplementation((sql) => {
        if (sql.startsWith("INSERT INTO photos")) throw new Error("insert failed");
        return prepare(sql);
      });
    }
    await error(await call("POST", "/api/photos", { cookie: a.cookie, form: photoForm(full(), thumb()) }), 500, "server_error");
    expect((await env.PHOTOS.list({ prefix: `couples/${couple.id}/` })).objects).toHaveLength(0);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM photos").first("n")).toBe(0);
  });

  it("AC10, AC12 (R11, R17): purges both renditions and pending rows, retaining failed purges for the sweep", async () => {
    const { a, couple } = await paired();
    const id = await upload(a);
    const rows = [{ id, couple_id: couple.id }];
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(env.PHOTOS, "delete").mockRejectedValueOnce(new Error("unavailable"));
    await purgePhotos(env, rows);
    expect(log).toHaveBeenCalledWith("[bisou] photo purge failed", 1);
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(id).first("id")).toBe(id);
    for (const size of ["full", "thumb"]) expect(await env.PHOTOS.head(key(couple.id, id, size))).not.toBeNull();
    await purgePhotos(env, rows);
    expect(await env.DB.prepare("SELECT id FROM photos WHERE id = ?").bind(id).first()).toBeNull();
    for (const size of ["full", "thumb"]) expect(await env.PHOTOS.head(key(couple.id, id, size))).toBeNull();
    await purgePhotos(env, []);
  });
});

describe("photo header bounds", () => {
  it("AC12, AC13 (R16, R18): rejects truncated JPEG and WebP headers without throwing", () => {
    for (const [bytes, type, headerEnd] of [
      [full(), "image/jpeg", 25],
      ...(["VP8", "VP8L", "VP8X"] as const).map((kind) => [webp({ width: 300, height: 300, kind }), "image/webp", kind === "VP8L" ? 26 : 30] as const),
    ] as const) {
      for (let length = 0; length < headerEnd; length++) expect(checkPhotoBytes(bytes.subarray(0, length), type)).toBeNull();
    }
  });

  it("AC12 (R16): strips APP1 after JPEG dimensions and rejects metadata after WebP image data", () => {
    const clean = full();
    const app1 = jpeg({ width: 300, height: 300, exif: true }).subarray(2, 12);
    const bytes = new Uint8Array([...clean.subarray(0, 15), ...app1, ...clean.subarray(15)]);
    expect(checkPhotoBytes(bytes, "image/jpeg")).toEqual({ side: 1440, bytes: clean });
    for (const kind of ["VP8", "VP8L", "VP8X"] as const) {
      const metadata = webp({ width: 300, height: 300, kind, exif: true });
      metadata[20] = kind === "VP8X" ? 0 : metadata[20]!;
      expect(checkPhotoBytes(metadata, "image/webp")).toBeNull();
    }
  });

  it("AC13 (R18): rejects nonsquare WebP and invalid chunk lengths or signatures", () => {
    for (const kind of ["VP8", "VP8L", "VP8X"] as const) {
      expect(checkPhotoBytes(webp({ width: 300, height: 299, kind }), "image/webp")).toBeNull();
      const bytes = webp({ width: 300, height: 300, kind });
      new DataView(bytes.buffer).setUint32(16, 0xffffffff, true);
      expect(checkPhotoBytes(bytes, "image/webp")).toBeNull();
    }
    for (const kind of ["VP8", "VP8L"] as const) {
      const bytes = webp({ width: 300, height: 300, kind });
      bytes[kind === "VP8" ? 23 : 20] = 0;
      expect(checkPhotoBytes(bytes, "image/webp")).toBeNull();
    }
  });
});

describe("photo mutation query plans", () => {
  it("AC12 (R17): the atomic pending cap uses the uploader index", async () => {
    const plan = await explain(`INSERT INTO photos (id, couple_id, uploader_id, created_at)
      SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND created_at > ?) < ?`,
    "photo", "couple", "user", 1, "user", 0, 12);
    expect(plan).toContain("SEARCH photos USING INDEX photos_uploader (uploader_id=? AND entry_id=?)");
    expect(plan.filter((line) => /SCAN|TEMP B-TREE/.test(line))).toEqual(["SCAN CONSTANT ROW"]);
  });

  it("counts live pending rows using the uploader index and claims deletion by primary key", async () => {
    const count = await explain("SELECT COUNT(*) AS n FROM photos WHERE uploader_id = ? AND entry_id IS NULL AND created_at > ?", "user", 1);
    expect(count).toEqual(["SEARCH photos USING INDEX photos_uploader (uploader_id=? AND entry_id=?)"]);
    const deletion = await explain("UPDATE photos SET created_at = 0 WHERE id = ? AND uploader_id = ? AND entry_id IS NULL RETURNING id, couple_id", "photo", "user");
    expect(deletion).toEqual(["SEARCH photos USING INDEX sqlite_autoindex_photos_1 (id=?)"]);
  });

  it("AC10, AC12 (R11, R17): purge deletes pending rows by primary key", async () => {
    const plan = (await explain("DELETE FROM photos WHERE id IN (?, ?) AND entry_id IS NULL", "photo-1", "photo-2")).join("\n");
    expect(plan).toContain("SEARCH photos USING INDEX sqlite_autoindex_photos_1 (id=?)");
    expect(plan).not.toMatch(/SCAN|TEMP B-TREE/);
  });
});
