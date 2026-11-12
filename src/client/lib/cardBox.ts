import type { CardBoxDetail } from "../../shared/cardBox";
export type Play = { stack: string[]; index: number; startedOver: boolean };
export function nextCard(detail: CardBoxDetail, play: Play, seen: string[], random = Math.random): { play: Play; seen: string[] } {
  if (play.index < play.stack.length - 1) return { play: { ...play, index: play.index + 1, startedOver: false }, seen };
  const ids = detail.cards.map(card => card.id);
  if (!ids.length) return { play: { stack: [], index: -1, startedOver: false }, seen: [] };
  let validSeen = seen.filter(id => ids.includes(id));
  const current = play.stack[play.index] ?? validSeen.at(-1);
  let available = ids.filter(id => !validSeen.includes(id) && id !== current);
  const startedOver = available.length === 0;
  if (startedOver) { validSeen = []; available = ids.filter(id => id !== current); }
  const id = available[Math.floor(random() * available.length)] ?? ids[0]!;
  return { play: { stack: [...play.stack, id], index: play.stack.length, startedOver }, seen: [...validSeen, id] };
}
export function previousCard(play: Play): Play { return { ...play, index: Math.max(0, play.index - 1), startedOver: false }; }
export function readSeen(scope: string, boxId: string): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(`bisou.cardBox.v1:${scope}:seen:${boxId}`) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}
export function writeSeen(scope: string, boxId: string, seen: string[]): void {
  try { localStorage.setItem(`bisou.cardBox.v1:${scope}:seen:${boxId}`, JSON.stringify(seen)); } catch { /* Drawing still works in memory. */ }
}
