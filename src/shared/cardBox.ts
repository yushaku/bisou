import type { Locale } from "./types";
export type CardBoxText = Record<Locale, string>;
export type CardBoxCard = ({ id: string; kind: "question" | "dare" | "point"; text: CardBoxText } | { id: string; kind: "rather"; options: [CardBoxText, CardBoxText] } | { id: string; kind: "truthDare"; truth: CardBoxText; dare: CardBoxText } | { id: string; kind: "scale"; text: CardBoxText; low: CardBoxText; high: CardBoxText }) & { preview?: true };
export interface CardBoxSummary { id: string; name: CardBoxText; description: CardBoxText; open: boolean; cover: string; price: number | null }
export interface CardBoxDetail { box: CardBoxSummary; cards: CardBoxCard[] }
