// Turns a picked photo into the two square renditions the server stores, and uploads them.
// Only the chosen square leaves the phone, re-encoded; the server strips JPEG metadata (R16, R18).
import { PHOTO_SIZES } from "../../shared/journal";
import { AVATAR_MAX_BYTES, AVATAR_PICK_MAX_BYTES, AVATAR_PICK_TYPES, AVATAR_SIDE } from "../../shared/avatar";
import type { ApiError, PhotoUploadResponse } from "../../shared/types";
import type { ApiResult } from "../api";

/** A square in the bitmap's pixels: the part of the photo the author keeps. */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Renditions {
  full: Blob;
  thumb: Blob;
}

/* Bakes the EXIF rotation into the pixels before the metadata is dropped by re-encoding. */
export function decodePhoto(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

export function avatarFileError(file: File): "avatar.wrongType" | "avatar.tooLarge" | null {
  if (!AVATAR_PICK_TYPES.includes(file.type) && !(file.type === "" && /\.(jpe?g|png|heic|heif)$/i.test(file.name))) return "avatar.wrongType";
  return file.size > AVATAR_PICK_MAX_BYTES ? "avatar.tooLarge" : null;
}

export async function renderAvatar(bitmap: ImageBitmap, area: Area): Promise<Blob> {
  const [el, ctx] = canvas(AVATAR_SIDE);
  try {
    ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
    const blob = await encode(el, AVATAR_MAX_BYTES);
    if (blob.size > AVATAR_MAX_BYTES) throw new Error("avatar encode too large");
    return blob;
  } finally {
    bitmap.close();
    el.width = el.height = 0;
  }
}

function canvas(side: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement("canvas");
  el.width = side;
  el.height = side;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.imageSmoothingQuality = "high";
  return [el, ctx];
}

function toBlob(el: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    el.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), type, quality),
  );
}

/* WebP where the browser can encode it (Safari cannot and hands back PNG), else JPEG; once more at 0.6 if too big. */
async function encode(el: HTMLCanvasElement, maxBytes: number, type = "image/webp"): Promise<Blob> {
  let blob = await toBlob(el, type, type === "image/webp" ? 0.8 : 0.85);
  if (blob.type !== "image/webp" && blob.type !== "image/jpeg") blob = await toBlob(el, "image/jpeg", 0.85);
  if (blob.size > maxBytes) blob = await toBlob(el, blob.type, 0.6);
  return blob;
}

/**
 * Draws only the area onto a canvas of at most 1440 px (never the whole photo, which keeps iOS
 * under its canvas memory cap), then scales that to the thumb. Never upscales. Closes the bitmap.
 */
export async function renderSquare(bitmap: ImageBitmap, area: Area): Promise<Renditions> {
  const side = Math.max(1, Math.min(Math.round(area.width), PHOTO_SIZES.full.side));
  const thumbSide = Math.min(side, PHOTO_SIZES.thumb.side);
  const [fullEl, fullCtx] = canvas(side);
  const [thumbEl, thumbCtx] = canvas(thumbSide);
  try {
    fullCtx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, side, side);
    const full = await encode(fullEl, PHOTO_SIZES.full.maxBytes);
    thumbCtx.drawImage(fullEl, 0, 0, thumbSide, thumbSide);
    const thumb = await encode(thumbEl, PHOTO_SIZES.thumb.maxBytes, full.type);
    return { full, thumb };
  } finally {
    bitmap.close();
    // Frees the canvas memory now instead of at garbage collection (iOS counts it).
    fullEl.width = fullEl.height = thumbEl.width = thumbEl.height = 0;
  }
}

/**
 * POST /api/photos as multipart with both renditions. XMLHttpRequest because fetch has no upload
 * progress; the browser sets the multipart boundary. onProgress gets 0 to 1.
 */
export function uploadPhoto(
  photo: Renditions,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<ApiResult<PhotoUploadResponse>> {
  return new Promise((resolve) => {
    const failed = { ok: false, status: 0, error: null } as const;
    if (signal?.aborted) return resolve(failed);
    const ext = photo.full.type === "image/webp" ? "webp" : "jpg";
    const form = new FormData();
    form.append("full", photo.full, `full.${ext}`);
    form.append("thumb", photo.thumb, `thumb.${ext}`);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      const json: unknown = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true, data: json as PhotoUploadResponse });
      const error = json && typeof json === "object" && "error" in json ? (json as ApiError) : null;
      resolve({ ok: false, status: xhr.status, error });
    };
    xhr.onerror = xhr.onabort = () => resolve(failed);
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
