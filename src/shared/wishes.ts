import type { ApiErrorCode, Locale, WishInput, WishPriority } from "./types";

export const WISH_TITLE_MAX = 100;
export const WISH_LINK_MAX = 2048;
export const SPIN_MAX_PER_DAY = 20;

export function validateWish(body: unknown): { input: WishInput & { priority: WishPriority } } | { error: ApiErrorCode } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_body" };
  const value = body as Record<string, unknown>;
  if (typeof value.title !== "string" || !value.title.trim() || Array.from(value.title.trim()).length > WISH_TITLE_MAX) {
    return { error: "wish_title_invalid" };
  }
  const price = value.price ?? null;
  if (price !== null && (typeof price !== "number" || !Number.isSafeInteger(price) || price <= 0)) return { error: "wish_price_invalid" };
  let link: string | null = null;
  if (value.link != null && value.link !== "") {
    if (typeof value.link !== "string" || value.link.trim().length > WISH_LINK_MAX) return { error: "wish_link_invalid" };
    try {
      const url = new URL(value.link.trim());
      if (!["http:", "https:"].includes(url.protocol) || url.href.length > WISH_LINK_MAX) return { error: "wish_link_invalid" };
      link = url.href;
    } catch { return { error: "wish_link_invalid" }; }
  }
  const priority = value.priority === undefined ? 2 : value.priority;
  if (priority !== 1 && priority !== 2 && priority !== 3) return { error: "invalid_body" };
  const photoId = value.photoId ?? null;
  if (photoId !== null && (typeof photoId !== "string" || !photoId)) return { error: "photo_invalid" };
  return { input: { title: value.title.trim(), price, link, priority, photoId } };
}


export function receivedText(locale: Locale, title: string, note: string): string {
  const trimmed = note.trim();
  return `${locale === "vi" ? "Đã nhận: " : "Received: "}${title}${trimmed ? `. ${trimmed}` : ""}`;
}
