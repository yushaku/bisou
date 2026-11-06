import { validateWish } from "../../shared/wishes";
import type { ApiErrorCode, WishInput } from "../../shared/types";
import type { MessageKey } from "../i18n/vi";
import type { PhotoState } from "./compose";

export type JarLevel = 0 | 1 | 2 | 3 | 4;

export function wishJarLevels(jar: { open: { length: number }; partnerJarEmpty: boolean } | null): { mine: JarLevel; partner: JarLevel } {
  const count = jar?.open.length ?? 0;
  return {
    mine: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4,
    partner: jar && !jar.partnerJarEmpty ? 2 : 0,
  };
}

export function parseVnd(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^\d+$/.test(value) && !/^\d{1,3}([.,\s])\d{3}(?:\1\d{3})*$/.test(value)) return NaN;
  return Number(value.replace(/[.,\s]/g, ""));
}

export function wishSaveBlock(input: WishInput, photos: { state: PhotoState }[]): MessageKey | null {
  const parsed = validateWish(input);
  if ("error" in parsed) return wishErrorKey(parsed.error);
  return photos.some((p) => p.state !== "done") ? "compose.waitPhotos" : null;
}

export function wishErrorKey(code?: ApiErrorCode): MessageKey {
  switch (code) {
    case "wish_title_invalid": return "wish.titleInvalid";
    case "wish_price_invalid": return "wish.priceInvalid";
    case "wish_link_invalid": return "wish.linkInvalid";
    case "photo_invalid": return "compose.photoExpired";
    case "not_found": return "compose.gone";
    case "wish_received": return "wish.alreadyReceived";
    default: return "compose.saveError";
  }
}
