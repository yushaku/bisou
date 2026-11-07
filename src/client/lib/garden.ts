import { cardById, type GardenCardState } from "../../shared/garden";
import type { Locale } from "../../shared/types";
import type { Translate } from "../i18n";

export function cardPhase(card: GardenCardState): "open" | "waiting" | "flipped" {
  return card.flippedDay ? "flipped" : card.mine !== null ? "waiting" : "open";
}
export function gardenQuestion(id: string, locale: Locale, t: Translate): string {
  return cardById(id)?.text[locale] ?? t("garden.unknownCard");
}
