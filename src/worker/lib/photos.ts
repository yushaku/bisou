import type { PhotoSize } from "../../shared/types";
import type { Env } from "../env";
import { DAY } from "./time";

export function avatarKey(userId: string, id: string): string {
  return `users/${userId}/avatar/${id}`;
}

export async function reserveAvatarUpload(db: D1Database, userId: string, id: string, now: number): Promise<number | null> {
  const [, , counted] = await db.batch([
    db.prepare("DELETE FROM avatar_uploads WHERE user_id = ? AND created_at <= ?").bind(userId, now - DAY),
    db.prepare("INSERT INTO avatar_uploads (id, user_id, created_at) VALUES (?, ?, ?)").bind(id, userId, now),
    db.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM avatar_uploads WHERE user_id = ?").bind(userId),
  ]);
  const stats = (counted!.results as { n: number; oldest: number }[])[0]!;
  if (stats.n <= 20) return null;
  await db.prepare("DELETE FROM avatar_uploads WHERE id = ?").bind(id).run();
  return Math.max(1, Math.ceil((stats.oldest + DAY - now) / 1000));
}

export async function purgeAvatars(env: Env, userId: string, completedId?: string): Promise<void> {
  try {
    if (completedId) await env.DB.prepare("UPDATE avatar_uploads SET pending = 0 WHERE id = ?").bind(completedId).run();
    let cursor: string | undefined;
    do {
      const page = await env.PHOTOS.list({ prefix: avatarKey(userId, ""), cursor });
      // Read after listing and keep pending uploads that could commit during cleanup.
      const { results } = await env.DB.prepare(`SELECT avatar_id AS id FROM users WHERE id = ?
        UNION ALL SELECT id FROM avatar_uploads WHERE user_id = ? AND pending = 1`).bind(userId, userId).all<{ id: string | null }>();
      const keep = new Set(results.map((row) => avatarKey(userId, row.id ?? "")));
      const keys = page.objects.map((object) => object.key).filter((key) => !keep.has(key));
      if (keys.length) await env.PHOTOS.delete(keys);
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  } catch {
    console.error("[bisou] avatar purge failed");
  }
}

export function photoKey(coupleId: string, id: string, size: PhotoSize): string {
  return `couples/${coupleId}/photos/${id}/${size}`;
}

export function photoKeys(row: { id: string; couple_id: string }): string[] {
  return [photoKey(row.couple_id, row.id, "full"), photoKey(row.couple_id, row.id, "thumb")];
}

// Header checks and metadata removal; the client re-encodes the cropped pixels before uploading.
export function checkPhotoBytes(bytes: Uint8Array, type: string): { side: number; bytes: Uint8Array } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  if (type === "image/jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff
      || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
    const kept: Uint8Array[] = [];
    let start = 0;
    let removed = 0;
    let offset = 2;
    let scanned = false;
    while (offset < bytes.length) {
      const markerStart = offset;
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) return null;
      if (offset + 2 > bytes.length) return null;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (marker === 0xda) {
        if (length < 6 || offset + length > bytes.length - 2) return null;
        // Refuse metadata between scans and appended images without decoding pixels (R16).
        for (let i = offset + length; i < bytes.length - 2; i++) {
          if (bytes[i] !== 0xff) continue;
          const next = bytes[i + 1]!;
          if ((next >= 0xe0 && next <= 0xef) || next === 0xfe || next === 0xd9) return null;
        }
        scanned = true;
        break;
      }
      const icc = marker === 0xe2 && length >= 16
        && String.fromCharCode(...bytes.subarray(offset + 2, offset + 14)) === "ICC_PROFILE\0";
      const identifier = length >= 7 ? String.fromCharCode(...bytes.subarray(offset + 2, offset + 7)) : "";
      const jfif = marker === 0xe0 && length === 16 && identifier === "JFIF\0";
      const adobe = marker === 0xee && length === 14 && identifier === "Adobe";
      if (marker === 0xfe || (marker >= 0xe0 && marker <= 0xef && !jfif && !adobe && !icc)) {
        kept.push(bytes.subarray(start, markerStart));
        start = offset + length;
        removed += start - markerStart;
      }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        if (length < 8 || width !== 0) return null;
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
      }
      offset += length;
    }
    if (!scanned) return null;
    if (removed) {
      kept.push(bytes.subarray(start));
      const stripped = new Uint8Array(bytes.length - removed);
      let position = 0;
      for (const chunk of kept) {
        stripped.set(chunk, position);
        position += chunk.length;
      }
      bytes = stripped;
    }
  } else if (type === "image/webp") {
    const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WEBP" || view.getUint32(4, true) + 8 !== bytes.length) return null;
    let offset = 12;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) return null;
      const kind = tag(offset);
      const length = view.getUint32(offset + 4, true);
      const data = offset + 8;
      const end = data + length + length % 2;
      if (end > bytes.length || kind === "EXIF" || kind === "XMP ") return null;
      let w = 0;
      let h = 0;
      if (kind === "VP8X") {
        if (length !== 10 || (bytes[data]! & 0x0c) !== 0) return null;
        w = 1 + bytes[data + 4]! + (bytes[data + 5]! << 8) + (bytes[data + 6]! << 16);
        h = 1 + bytes[data + 7]! + (bytes[data + 8]! << 8) + (bytes[data + 9]! << 16);
      } else if (kind === "VP8 ") {
        if (length < 10 || (bytes[data]! & 1) !== 0 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 1 || bytes[data + 5] !== 0x2a) return null;
        w = view.getUint16(data + 6, true) & 0x3fff;
        h = view.getUint16(data + 8, true) & 0x3fff;
      } else if (kind === "VP8L") {
        if (length < 5 || bytes[data] !== 0x2f) return null;
        const bits = view.getUint32(data + 1, true);
        if (bits >>> 29 !== 0) return null;
        w = (bits & 0x3fff) + 1;
        h = ((bits >>> 14) & 0x3fff) + 1;
      }
      if (w || h) {
        if (width && (width !== w || height !== h)) return null;
        width = w;
        height = h;
      }
      offset = end;
    }
  } else {
    return null;
  }
  return width > 0 && width === height ? { side: width, bytes } : null;
}

export async function purgePhotos(env: Env, rows: { id: string; couple_id: string }[]): Promise<void> {
  if (!rows.length) return;
  try {
    await env.PHOTOS.delete(rows.flatMap(photoKeys));
    await env.DB.prepare(`DELETE FROM photos WHERE id IN (${rows.map(() => "?").join(",")}) AND entry_id IS NULL AND wish_id IS NULL`)
      .bind(...rows.map((row) => row.id)).run();
  } catch {
    console.error("[bisou] photo purge failed", rows.length);
  }
}
