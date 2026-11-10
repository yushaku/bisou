import { cardById, type GardenCardState } from "../../shared/garden";
import type { Locale } from "../../shared/types";
import type { Translate } from "../i18n";

export function cardPhase(card: GardenCardState): "open" | "waiting" | "flipped" {
  return card.flippedDay ? "flipped" : (card.mine !== null || card.mineChoice != null) ? "waiting" : "open";
}
export function gardenQuestion(id: string, locale: Locale, t: Translate): string {
  return cardById(id)?.text[locale] ?? t("garden.unknownCard");
}

const seenThisSession = new Set<string>();
export function gardenMemoryKey(scope: string, kind: "flip" | "stage", id: string): string {
  return `bisou.garden.v1:${scope}:${kind}:${id}`;
}
export function gardenSeen(key: string): boolean {
  try { return localStorage.getItem(key) === "1" || seenThisSession.has(key); }
  catch { return seenThisSession.has(key); }
}
export function rememberGarden(key: string): void {
  seenThisSession.add(key);
  try { localStorage.setItem(key, "1"); } catch { /* Keep the scene seen for this session. */ }
  window.dispatchEvent(new Event("bisou:garden-seen"));
}
