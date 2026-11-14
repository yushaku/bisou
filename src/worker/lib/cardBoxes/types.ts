import type { CardBoxCard, CardBoxText } from "../../../shared/cardBox";

export interface Box { id: string; name: CardBoxText; description: CardBoxText; free: boolean; adult?: true; cover: string; price: number | null; cards: CardBoxCard[] }
