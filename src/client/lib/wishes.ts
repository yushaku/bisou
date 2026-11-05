import { validateWish } from "../../shared/wishes";
import type { ApiErrorCode, WishInput } from "../../shared/types";
import type { MessageKey } from "../i18n";
import type { PhotoState } from "./compose";

export function parseVnd(input: string): number | null {
  const digits = input.replace(/[.,\s]/g, "");
  if (!digits) return null;
  return /^\d+$/.test(digits) ? Number(digits) : NaN;
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
