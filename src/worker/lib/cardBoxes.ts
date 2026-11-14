import type { CardBoxSummary, CardBoxDetail } from "../../shared/cardBox";
import type { Box } from "./cardBoxes/types";
import { lamQuenLai } from "./cardBoxes/lam-quen-lai";
import { rauRam } from "./cardBoxes/rau-ram";
import { deepConnection } from "./cardBoxes/deep-connection";
import { truthOrDare } from "./cardBoxes/truth-or-dare";

export const CARD_BOXES: Box[] = [lamQuenLai, rauRam, deepConnection, truthOrDare];
function isOpen(box: Box, unlocked: Set<string>): boolean { return box.free || unlocked.has(box.id); }
function summary(box: Box, unlocked: Set<string>): CardBoxSummary { return { id: box.id, name: box.name, description: box.description, open: isOpen(box, unlocked), cardCount: box.cards.length, ...(box.adult ? { adult: box.adult } : {}), cover: box.cover, price: box.price }; }
export function boxList(unlocked = new Set<string>()): CardBoxSummary[] { return [...CARD_BOXES].sort((a, b) => Number(isOpen(b, unlocked)) - Number(isOpen(a, unlocked))).map(box => summary(box, unlocked)); }
export function boxDetail(boxId: string, unlocked = new Set<string>()): CardBoxDetail | null {
  const box = CARD_BOXES.find(box => box.id === boxId);
  return box ? { box: summary(box, unlocked), cards: isOpen(box, unlocked) ? box.cards : box.cards.filter(card => card.preview) } : null;
}
