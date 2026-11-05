export const ENTRY_TEXT_MAX = 2000;
export const ENTRY_PHOTOS_MAX = 4;

export const PHOTO_SIZES = {
  full: { side: 1440, maxBytes: 1_572_864 },
  thumb: { side: 480, maxBytes: 262_144 },
} as const;

export const PHOTO_UPLOAD_MAX_BYTES = PHOTO_SIZES.full.maxBytes + PHOTO_SIZES.thumb.maxBytes + 16_384;
export const PHOTO_TYPES = ["image/webp", "image/jpeg"] as const;
export const FEED_PAGE_SIZE = 20;

export function entryText(raw: string): string {
  return raw.trim();
}
