import { formatNumber } from "./format";
import { swipedPhotoIndex } from "./photoSwipe";
import type { Locale } from "../../shared/types";
import type { CardBoxDetail, CardBoxSummary } from "../../shared/cardBox";
export type Play = { stack: string[]; index: number; startedOver: boolean };
export function cardBoxEndMessage(open: boolean) {
  return open ? "cardBox.startOver" : "cardBox.previewEnd";
}
export function cardBoxLoadMessage(loaded: boolean, online: boolean, error: "notFound" | "loadError" | null) {
  return loaded ? null : !online ? "needsConnection" : error;
}
export function nextCard(detail: CardBoxDetail, play: Play, seen: string[], random = Math.random): { play: Play; seen: string[] } {
  if (play.index < play.stack.length - 1) return { play: { ...play, index: play.index + 1, startedOver: false }, seen };
  return randomCard(detail, play, seen, random);
}
export function randomCard(detail: CardBoxDetail, play: Play, seen: string[], random = Math.random): { play: Play; seen: string[] } {
  const ids = detail.cards.map(card => card.id);
  if (!ids.length) return { play: { stack: [], index: -1, startedOver: false }, seen: [] };
  let validSeen = seen.filter(id => ids.includes(id));
  const current = play.stack[play.index] ?? validSeen.at(-1);
  let available = ids.filter(id => !validSeen.includes(id) && id !== current);
  const startedOver = available.length === 0;
  if (startedOver) { validSeen = []; available = ids.filter(id => id !== current); }
  const id = available[Math.floor(random() * available.length)] ?? ids[0]!;
  return { play: { stack: [...play.stack.slice(0, play.index + 1), id], index: play.index + 1, startedOver }, seen: [...validSeen, id] };
}
export function previousCard(play: Play): Play { return { ...play, index: Math.max(0, play.index - 1), startedOver: false }; }
export function readSeen(scope: string, boxId: string): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(`bisou.cardBox.v1:${scope}:seen:${boxId}`) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}
export function writeSeen(scope: string, boxId: string, seen: string[]): void {
  try { localStorage.setItem(`bisou.cardBox.v1:${scope}:seen:${boxId}`, JSON.stringify(seen)); } catch { /* Drawing still works in memory. */ }
}

type CardBoxCache = { list: CardBoxSummary[]; [key: `box:${string}`]: CardBoxDetail };
export function readCache<K extends keyof CardBoxCache>(scope: string, key: K): CardBoxCache[K] | null {
  try { return JSON.parse(localStorage.getItem(`bisou.cardBox.v1:${scope}:${key}`) ?? "null") as CardBoxCache[K] | null; } catch { return null; }
}
export function writeCache<K extends keyof CardBoxCache>(scope: string, key: K, value: CardBoxCache[K]): void {
  try { localStorage.setItem(`bisou.cardBox.v1:${scope}:${key}`, JSON.stringify(value)); } catch { /* Play remains available without persistent storage. */ }
}
export function clearCardBoxCache(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("bisou.cardBox.")) localStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable. */ }
}

export function formatBoxPrice(price: number, locale: Locale): string {
  return formatNumber(price, locale) + (locale === "vi" ? "đ" : "₫");
}
export function cardSwipe(dx: number, dy: number, width: number): "next" | "previous" | null {
  const index = swipedPhotoIndex(1, 3, dx, dy, width);
  return index === 2 ? "next" : index === 0 ? "previous" : null;
}
