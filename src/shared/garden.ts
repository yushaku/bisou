import { CONTROL_CHARACTERS } from "./text";
import type { Locale } from "./types";
import { daysBetween } from "./days";

export const GARDEN_ANSWER_MAX = 1000;
export const LEVEL_IDS = ["acquainted", "in_love", "living_together", "married", "with_children"] as const;
export type RelationshipLevel = typeof LEVEL_IDS[number];
export type LevelKind = "placement" | "target" | "revisit";
export type LevelAction = { action: "propose"; kind: LevelKind; levelId: RelationshipLevel; revision: number }
  | { action: "accept" | "decline" | "withdraw"; revision: number };
export interface GardenLevels {
  revision: number; initialLevelId: RelationshipLevel | null; selectedLevelId: RelationshipLevel | null;
  furthestLevelId: RelationshipLevel | null; placementComplete: boolean;
  proposal: { kind: LevelKind; levelId: RelationshipLevel; agreed: boolean; proposedByMe: boolean } | null;
  decisions: { cardId: string; complete: boolean }[];
}
export const levelRank = (id: RelationshipLevel) => LEVEL_IDS.indexOf(id);
export function ordinaryEligible(card: GardenCard, furthestLevel: number | null = null): boolean {
  return card.kind === "ordinary" && (furthestLevel === null ? !card.id.startsWith("L") : levelRank(card.levelId) <= furthestLevel);
}
export type Freshness = "fresh" | "dry" | "wilted";
export function plantStage(growthDays: number): number { return Math.min(7, Math.max(0, growthDays)); }
export function freshness(lastFlipDay: string, today: string): Freshness {
  const days = daysBetween(lastFlipDay, today);
  return days >= 14 ? "wilted" : days >= 3 ? "dry" : "fresh";
}
export interface GardenCardState {
  cardId: string;
  mine: string | null;
  partner: string | null;
  mineEdited: boolean;
  partnerEdited: boolean;
  mineDeleted: boolean;
  partnerDeleted: boolean;
  flippedDay: string | null;
}
export interface GardenPlant { deckId: string; stage: number }
export interface GardenState {
  levels: GardenLevels;
  day: string;
  today: GardenCardState | null;
  swapLocked: boolean;
  plants: GardenPlant[];
  freshness: Freshness;
}
export interface GardenDeckState { active: GardenCardState | null; history: GardenCardState[]; decisions: GardenCardState[]; locked: string[] }

export function answerText(raw: unknown): { text: string } | { error: "invalid_answer" | "answer_too_long" } {
  if (typeof raw !== "string") return { error: "invalid_answer" };
  const normalized = raw.replace(/\r\n/g, "\n");
  if (CONTROL_CHARACTERS.test(normalized.replace(/\n/g, ""))) return { error: "invalid_answer" };
  const text = normalized.trim();
  if (!text) return { error: "invalid_answer" };
  if ([...text].length > GARDEN_ANSWER_MAX) return { error: "answer_too_long" };
  return { text };
}

export function cardById(id: string): GardenCard | undefined { return CARDS.find((card) => card.id === id); }

export interface DrawInput { furthestLevel?: number | null; waiting?: string[]; played?: string[]; previousDeck?: string; excludedCard?: string; excludedDeck?: string; stages?: Record<string, number>; swapped?: string[] }
export function drawCard(input: DrawInput, seed: number): GardenCard | null {
  const cards = CARDS.filter((card) => !card.retired && ordinaryEligible(card, input.furthestLevel) && !input.played?.includes(card.id) && card.id !== input.excludedCard);
  let decks = DECKS.filter((deck) => cards.some((card) => card.deckId === deck.id));
  for (const excluded of [input.previousDeck, input.excludedDeck]) {
    const alternatives = decks.filter((deck) => deck.id !== excluded);
    if (alternatives.length) decks = alternatives;
  }
  if (!decks.length) return null;
  const weight = (deckId: string) => 1 + Math.min(2, Math.max(0, 7 - (input.stages?.[deckId] ?? 0)));
  let bucket = (seed >>> 0) % decks.reduce((sum, deck) => sum + weight(deck.id), 0);
  const deck = decks.find((candidate) => { bucket -= weight(candidate.id); return bucket < 0; })!;
  const available = cards.filter((card) => card.deckId === deck.id);
  const untouched = available.filter((card) => !input.waiting?.includes(card.id));
  const inDeck = untouched.length ? untouched : available;
  return inDeck.find((card) => !input.swapped?.includes(card.id))
    ?? inDeck.sort((a, b) => input.swapped!.indexOf(a.id) - input.swapped!.indexOf(b.id))[0] ?? null;
}

interface GardenDeck { id: string; name: Record<Locale, string>; purpose: Record<Locale, string> }
export interface GardenCard { id: string; deckId: string; levelId: RelationshipLevel; kind: "ordinary" | "decision"; depth: "light" | "medium" | "deep"; text: Record<Locale, string>; retired?: boolean }

export const DECKS: GardenDeck[] = [
  {"id": "memories", "name": {"vi": "Ký ức", "en": "Memories"}, "purpose": {"vi": "Những điều đã làm nên mỗi đứa, và những lúc của hai đứa.", "en": "What shaped each of us, and the moments we share."}},
  {"id": "dreams", "name": {"vi": "Ước mơ", "en": "Dreams"}, "purpose": {"vi": "Điều mỗi đứa mong cho mình và cho hai đứa.", "en": "What each of us hopes for, alone and together."}},
  {"id": "money", "name": {"vi": "Tiền bạc", "en": "Money"}, "purpose": {"vi": "Mỗi đứa lớn lên cùng tiền ra sao, và muốn giữ tiền chung thế nào.", "en": "How each of us grew up with money, and how we want to handle it together."}},
  {"id": "disagree", "name": {"vi": "Khi bất đồng", "en": "When we disagree"}, "purpose": {"vi": "Hiểu mỗi đứa cảm thấy gì khi nghĩ khác nhau, để nói về nó, không phải để phân thắng thua.", "en": "Understand how each of us feels when we see things differently, to talk about it, not to win."}},
  {"id": "families", "name": {"vi": "Gia đình hai bên", "en": "Both families"}, "purpose": {"vi": "Biết về gia đình của nhau, và điều mỗi đứa mong giữa hai nhà.", "en": "Know each other's families, and what each of us hopes for between them."}},
  {"id": "everyday", "name": {"vi": "Mỗi ngày của mình", "en": "Everyday us"}, "purpose": {"vi": "Những chuyện nhỏ của bây giờ: điều làm mỗi đứa vui, mệt, và thấy được thương.", "en": "The small things of now: what makes each of us happy, tired, and feel loved."}}
];

export const CARDS: GardenCard[] = [
  {"id": "memories-01", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Món ăn nào làm mình nhớ ngay tới tuổi thơ? Nó gợi lại ai, ở đâu?", "en": "Which food takes you straight back to childhood? Who and where does it bring back?"}},
  {"id": "memories-02", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Lần đầu gặp người ấy, điều gì mình còn nhớ rõ nhất?", "en": "What do you remember most clearly about the first time we met?"}},
  {"id": "memories-03", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Một bài hát gắn với một quãng đời của mình. Giờ nghe lại thấy thế nào?", "en": "A song tied to a time in your life. How does it feel to hear it now?"}},
  {"id": "memories-04", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Hồi nhỏ, mình hay trốn ở góc nào nhất? Ở đó mình thấy ra sao?", "en": "As a kid, where did you like to hide away? How did it feel there?"}},
  {"id": "memories-05", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khoảnh khắc nào của hai đứa mình muốn giữ lại mãi? Lúc đó mình cảm thấy gì?", "en": "Which moment of ours would you keep forever? What did you feel then?"}},
  {"id": "memories-06", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Hồi nhỏ, mình hay được khen vì điều gì? Giờ nghĩ lại mình thấy sao?", "en": "What were you often praised for as a child? How do you feel about it now?"}},
  {"id": "memories-07", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Có ai (thầy cô, bạn bè hay họ hàng) đã làm mình nhìn đời khác đi? Chuyện thế nào?", "en": "Someone (a teacher, friend or relative) who changed how you see life. What happened?"}},
  {"id": "memories-08", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Lúc nào mình thấy tự hào về bản thân nhất? Khi đó có ai bên cạnh không?", "en": "When were you proudest of yourself? Was anyone with you?"}},
  {"id": "memories-09", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Một quãng khó khăn mình đã đi qua. Điều gì đã giúp mình đứng dậy?", "en": "A hard stretch you went through. What helped you get back up?"}},
  {"id": "memories-10", "deckId": "memories", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Có chuyện ngày xưa nào mình chưa kể với ai, nhưng muốn người ấy biết?", "en": "Is there something from long ago you've told no one, but would like your partner to know?"}},
  {"id": "dreams-01", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Nếu có trọn một ngày rảnh, mình muốn sống ngày đó thế nào?", "en": "With one whole free day, how would you spend it?"}},
  {"id": "dreams-02", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Nơi nào mình muốn hai đứa cùng đến một lần trong đời? Vì sao lại là nơi đó?", "en": "Where would you like us to go together once in our lives? Why there?"}},
  {"id": "dreams-03", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Hồi nhỏ mình mơ làm nghề gì? Giấc mơ đó còn chút nào trong mình không?", "en": "What did you dream of becoming as a kid? Is any of it still in you?"}},
  {"id": "dreams-04", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Có điều gì mình luôn muốn học mà chưa có dịp?", "en": "Something you've always wanted to learn but never had the chance?"}},
  {"id": "dreams-05", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Năm năm nữa, một ngày bình thường của hai đứa trông thế nào trong mắt mình?", "en": "Five years from now, what does an ordinary day of ours look like to you?"}},
  {"id": "dreams-06", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Ngôi nhà mơ ước của mình có những gì? Góc nào là góc của riêng mình?", "en": "What is in your dream home? Which corner is yours?"}},
  {"id": "dreams-07", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Một ước mơ mình từng gác lại. Giờ nghĩ đến nó, mình thấy thế nào?", "en": "A dream you once set aside. How do you feel when you think of it now?"}},
  {"id": "dreams-08", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Điều gì làm mình thấy cuộc sống này đáng sống nhất?", "en": "What makes life feel most worth living to you?"}},
  {"id": "dreams-09", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Có ước mơ nào mình ngại nói ra vì sợ bị cho là viển vông?", "en": "Is there a dream you're shy to say out loud, afraid it sounds far-fetched?"}},
  {"id": "dreams-10", "deckId": "dreams", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Khi về già, mình mong nhìn lại và thấy hai đứa đã cùng làm được điều gì?", "en": "When we're old, what do you hope to look back on and see we did together?"}},
  {"id": "money-01", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Hồi nhỏ, nhà mình nói chuyện tiền bạc với nhau như thế nào?", "en": "Growing up, how did your family talk about money?"}},
  {"id": "money-02", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Món đồ nhỏ nào mình mua mà tới giờ vẫn thấy vui?", "en": "Which small thing you bought still makes you happy?"}},
  {"id": "money-03", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Đồng tiền đầu tiên mình tự kiếm được là từ đâu? Mình đã làm gì với nó?", "en": "Where did the first money you earned come from? What did you do with it?"}},
  {"id": "money-04", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Tiêu vào điều gì khiến mình thấy đáng nhất? Điều gì thì thấy tiếc?", "en": "What spending feels most worth it to you? What feels like a waste?"}},
  {"id": "money-05", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Với mình, điều gì về tiền bạc giúp mình thấy an tâm?", "en": "What about money helps you feel secure?"}},
  {"id": "money-06", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi nói chuyện tiền với người ấy, mình thấy thoải mái hay ngại? Vì sao?", "en": "When we talk about money, do you feel at ease or awkward? Why?"}},
  {"id": "money-07", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Tiền chung, tiền riêng: cách nào khiến mình thấy dễ chịu nhất?", "en": "Shared money, own money: what arrangement feels most comfortable to you?"}},
  {"id": "money-08", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Mình muốn hai đứa cùng để dành cho điều gì nhất?", "en": "What would you most like us to save for together?"}},
  {"id": "money-09", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Có nỗi lo nào về tiền mình hay giữ trong lòng, ít khi nói ra?", "en": "Is there a money worry you keep to yourself and rarely say?"}},
  {"id": "money-10", "deckId": "money", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Phụ giúp tiền cho gia đình hai bên: thế nào thì mình thấy yên lòng?", "en": "Helping our families with money: what would let you feel at peace?"}},
  {"id": "disagree-01", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Khi bực mình, mình cần gì trước: nói ra ngay, hay yên một lúc?", "en": "When you're upset, what do you need first: to talk right away, or some quiet?"}},
  {"id": "disagree-02", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Một câu nói hay cử chỉ nhỏ nào giúp mình dịu lại nhanh nhất?", "en": "Which small word or gesture calms you down fastest?"}},
  {"id": "disagree-03", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Mình thích làm lành theo kiểu nào: một cái ôm, một bữa ăn, hay một lời nói?", "en": "How do you like to make up: a hug, a meal, or a few words?"}},
  {"id": "disagree-04", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Hồi nhỏ, người lớn trong nhà mình giận nhau rồi làm lành ra sao?", "en": "Growing up, how did the adults at home fall out and make up?"}},
  {"id": "disagree-05", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi hai đứa nghĩ khác nhau, điều gì khiến mình thấy được lắng nghe?", "en": "When we see things differently, what makes you feel heard?"}},
  {"id": "disagree-06", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Có chuyện nào mình thấy khó mở lời với người ấy? Điều gì sẽ giúp dễ hơn?", "en": "Is there something you find hard to bring up with your partner? What would make it easier?"}},
  {"id": "disagree-07", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Sau một lần to tiếng, trong lòng mình thường thấy thế nào?", "en": "After raised voices, how do you usually feel inside?"}},
  {"id": "disagree-08", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Một điều hai đứa nghĩ khác nhau mà mình thấy cứ khác vậy cũng ổn.", "en": "One thing we see differently that you think is fine to keep different."}},
  {"id": "disagree-09", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Khi bất đồng, điều mình sợ xảy ra nhất là gì?", "en": "In a disagreement, what are you most afraid might happen?"}},
  {"id": "disagree-10", "deckId": "disagree", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Có chuyện nào hai đứa hay quay lại? Với mình, điều quan trọng nằm bên dưới chuyện đó là gì?", "en": "Is there a topic we keep coming back to? For you, what matters underneath it?"}},
  {"id": "families-01", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Món nào ở nhà (mẹ hay ai đó nấu) mà mình nhớ nhất?", "en": "Which dish from home (your mum's or whoever cooked) do you miss most?"}},
  {"id": "families-02", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Tết ở nhà mình có thói quen nào mà mình thích nhất?", "en": "Which Tết habit in your family do you love most?"}},
  {"id": "families-03", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Trong nhà, mình giống ai nhất? Giống ở điểm nào?", "en": "Who in your family are you most like? In what way?"}},
  {"id": "families-04", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Một kỷ niệm vui với ông bà mà mình hay nghĩ tới?", "en": "A happy memory with your grandparents that you often think of?"}},
  {"id": "families-05", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Lần đầu gặp gia đình người ấy, mình đã cảm thấy thế nào?", "en": "How did you feel the first time you met your partner's family?"}},
  {"id": "families-06", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Mình mong hai bên gia đình gần nhau hơn ở điểm nào?", "en": "In what way would you like our two families to be closer?"}},
  {"id": "families-07", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Điều gì của gia đình mình mà mình muốn giữ cho tổ ấm của hai đứa?", "en": "What from your family would you like to keep in our own home?"}},
  {"id": "families-08", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Điều gì của gia đình mình mà mình muốn hai đứa làm khác đi?", "en": "What from your family would you like us to do differently?"}},
  {"id": "families-09", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Khi đứng giữa gia đình mình và người ấy, mình thấy khó nhất ở đâu?", "en": "When you feel caught between your family and your partner, what is hardest?"}},
  {"id": "families-10", "deckId": "families", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Sau này khi bố mẹ hai bên cần chăm sóc, mình mong hai đứa sẽ cùng làm thế nào?", "en": "Later, when our parents need care, how do you hope we'll handle it together?"}},
  {"id": "everyday-01", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Dạo này điều gì làm mình vui nhất trong ngày?", "en": "Lately, what's the best part of your day?"}},
  {"id": "everyday-02", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Một việc nhỏ người ấy làm khiến mình thấy được thương. Đó là việc gì?", "en": "A small thing your partner does that makes you feel loved. What is it?"}},
  {"id": "everyday-03", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Buổi tối lý tưởng của hai đứa sau một ngày dài trông thế nào?", "en": "What does our ideal evening after a long day look like?"}},
  {"id": "everyday-04", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "light", "text": {"vi": "Dạo này mình đang mê gì: một bài hát, một món ăn hay một bộ phim?", "en": "What are you into lately: a song, a dish or a show?"}},
  {"id": "everyday-05", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Dạo này điều gì làm mình mệt hoặc lo nhất?", "en": "Lately, what's tiring or worrying you most?"}},
  {"id": "everyday-06", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi mình mệt, người ấy làm gì thì mình thấy đỡ hơn?", "en": "When you're worn out, what can your partner do that helps?"}},
  {"id": "everyday-07", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Mình thấy gần người ấy nhất vào những lúc nào?", "en": "When do you feel closest to your partner?"}},
  {"id": "everyday-08", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "medium", "text": {"vi": "Có điều gì mình muốn hai đứa làm cùng nhau thường hơn?", "en": "Is there something you'd like us to do together more often?"}},
  {"id": "everyday-09", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Điều gì ở người ấy mình biết ơn mà ít khi nói thành lời?", "en": "What about your partner are you grateful for but rarely say?"}},
  {"id": "everyday-10", "deckId": "everyday", "levelId": "acquainted", "kind": "ordinary", "depth": "deep", "text": {"vi": "Gần đây có lúc nào mình thấy chơi vơi không? Lúc đó mình cần điều gì?", "en": "Lately, have you felt a little lost? What did you need then?"}}
,
  {"id": "L1-01", "deckId": "dreams", "levelId": "acquainted", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu gọi nhau là người yêu, mỗi đứa mong điều gì ở mối quan hệ này?", "en": "If we call ourselves partners, what would each of us hope for in this relationship?"}},
  {"id": "L1-02", "deckId": "everyday", "levelId": "acquainted", "kind": "decision", "depth": "deep", "text": {"vi": "Mình muốn hai đứa nói rõ thế nào về việc tìm hiểu người khác, thời gian riêng và nhịp liên lạc?", "en": "How would I like us to talk about seeing other people, time alone and how often we stay in touch?"}},
  {"id": "L1-03", "deckId": "disagree", "levelId": "acquainted", "kind": "decision", "depth": "deep", "text": {"vi": "Khi một đứa chưa sẵn sàng tiến xa hơn hoặc muốn dừng lại, mình mong hai đứa nói và đón nhận điều đó thế nào?", "en": "If one of us is not ready to go further or wants to stop, how would I like us to say and receive that?"}},
  {"id": "L2-01", "deckId": "money", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Tiền thuê nhà, tiền cọc và các hoá đơn nên chia thế nào để mỗi đứa vẫn thấy vừa sức?", "en": "How could we split rent, the deposit and household bills so each of us can afford our share?"}},
  {"id": "L2-02", "deckId": "money", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Nếu thu nhập hai đứa chênh nhau hoặc một người tạm mất thu nhập, mình mong cách góp tiền chung thay đổi ra sao?", "en": "If our incomes differ or one of us temporarily loses income, how would I like our contributions to shared costs to change?"}},
  {"id": "L2-03", "deckId": "money", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu có khoản nợ hay trách nhiệm tài chính ảnh hưởng đến tiền nhà, mình muốn chia sẻ phần nào để hai đứa cùng tính, mà chưa cần nêu con số hay chi tiết riêng tư?", "en": "If a debt or financial responsibility affects housing costs, what would I like to share so we can plan together without giving exact amounts or private details?"}},
  {"id": "L2-04", "deckId": "money", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi có chi phí bất ngờ như sửa đồ hoặc phải chuyển nhà gấp, mình muốn hai đứa chuẩn bị và bàn cách chi thế nào?", "en": "How would I like us to prepare and talk about paying for unexpected costs, such as a broken appliance or an urgent move?"}},
  {"id": "L2-05", "deckId": "everyday", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Những việc như nấu ăn, dọn dẹp, mua đồ và nhớ lịch thanh toán nên chia thế nào để không dồn vào một người?", "en": "How could we share cooking, cleaning, shopping and remembering bill deadlines so they do not fall on one person?"}},
  {"id": "L2-06", "deckId": "everyday", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi một đứa quá bận hoặc mệt, mình muốn nhờ đổi việc nhà ra sao, và lúc nào nên cùng xem lại cách chia?", "en": "When one of us is too busy or tired, how would I like to ask to swap chores, and when should we review the arrangement?"}},
  {"id": "L2-07", "deckId": "everyday", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Khi sống chung, mình cần khoảng thời gian hay góc riêng nào để nghỉ ngơi mà vẫn thấy được tôn trọng?", "en": "When we live together, what time or space of my own would help me rest and feel respected?"}},
  {"id": "L2-08", "deckId": "everyday", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Với điện thoại, đồ cá nhân và thời gian gặp bạn bè riêng, mình muốn hai đứa hỏi ý nhau ở những việc nào?", "en": "For phones, personal belongings and time with our own friends, when would I like us to ask each other first?"}},
  {"id": "L2-09", "deckId": "disagree", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Khi tranh luận căng lên, mình muốn báo cần tạm dừng bằng cách nào và hẹn nói tiếp ra sao?", "en": "When an argument gets tense, how would I like to ask for a pause and arrange a time to return to it?"}},
  {"id": "L2-10", "deckId": "disagree", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Điều gì trong lúc bất đồng khiến mình thấy bị tổn thương, và mình muốn hai đứa giữ giới hạn nào khi nói chuyện?", "en": "What hurts me during a disagreement, and what boundaries would I like us to keep when talking?"}},
  {"id": "L2-11", "deckId": "families", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Trước khi mời bạn bè hoặc người thân đến chơi hay ở lại, mình muốn hai đứa thống nhất những gì?", "en": "Before inviting friends or family to visit or stay over, what would I like us to agree on?"}},
  {"id": "L2-12", "deckId": "families", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Chuyện riêng của hai đứa, chuyện nhà cửa hay tiền bạc: phần nào mình muốn hỏi ý nhau trước khi kể với gia đình?", "en": "Which private matters about us, our home or money would I like us to check with each other before telling family?"}},
  {"id": "L2-13", "deckId": "everyday", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Mình muốn hai đứa hỏi ý và đón nhận câu “không” hoặc “dừng lại” thế nào để không ai thấy có lỗi hay mắc nợ?", "en": "How would I like us to ask for consent and accept a no or a stop without either person feeling guilty or obliged?"}},
  {"id": "L2-14", "deckId": "everyday", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Có cách gần gũi nào mình thấy thoải mái, và có giới hạn nào mình muốn người ấy luôn hỏi trước, kể cả khi trước đây mình từng đồng ý?", "en": "What kinds of closeness feel comfortable to me, and what boundaries would I like my partner to always ask about, even if I agreed before?"}},
  {"id": "L2-15", "deckId": "everyday", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi một người muốn gần gũi tình dục còn người kia không muốn, mình mong hai đứa nói ra và chăm sóc nhau theo cách nào mà không gây áp lực?", "en": "When one person wants sexual intimacy and the other does not, how would I like us to talk and care for each other without pressure?"}},
  {"id": "L2-16", "deckId": "everyday", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Nếu tránh thai là điều liên quan đến hai đứa, mình muốn bắt đầu cuộc trao đổi về lựa chọn, trách nhiệm và điều cần tìm hiểu cùng người có chuyên môn như thế nào?", "en": "If contraception is relevant to us, how would I like to start a conversation about choices, responsibilities and questions to discuss with a qualified professional?"}},
  {"id": "L2-17", "deckId": "dreams", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Mình mong điều gì ở việc sống chung, và có điều gì mình chưa muốn coi là bước tiếp theo đã được quyết định, như kết hôn hay có con?", "en": "What do I hope living together will bring, and what would I not want treated as already decided, such as marriage or having children?"}},
  {"id": "L2-18", "deckId": "dreams", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Nếu công việc, nơi ở hoặc mong muốn có con của một đứa thay đổi, mình muốn hai đứa dành lúc nào và cách nào để nói lại kế hoạch?", "en": "If our work, location or wishes about children change, when and how would I like us to revisit our plans?"}},
  {"id": "L2-19", "deckId": "disagree", "levelId": "in_love", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu một người muốn ngừng sống chung, mình muốn có thể mở lời thế nào để không phải chứng minh ai đúng hay sai?", "en": "If one person wants to stop living together, how would I like them to be able to say it without having to prove who is right or wrong?"}},
  {"id": "L2-20", "deckId": "money", "levelId": "in_love", "kind": "ordinary", "depth": "medium", "text": {"vi": "Nếu dọn ra riêng, mình muốn hai đứa bàn trước những gì về tiền cọc, đồ chung, chi phí còn lại và thời gian tìm chỗ ở?", "en": "If we move apart, what would I like us to discuss in advance about the deposit, shared belongings, remaining costs and time to find somewhere to live?"}},
  {"id": "L3-01", "deckId": "dreams", "levelId": "living_together", "kind": "decision", "depth": "deep", "text": {"vi": "Kết hôn có ý nghĩa gì với mình, và có điều gì mình muốn giữ dù hai đứa có cưới hay không?", "en": "What does marriage mean to me, and what would I want to keep whether or not we marry?"}},
  {"id": "L3-02", "deckId": "money", "levelId": "living_together", "kind": "decision", "depth": "deep", "text": {"vi": "Với một cam kết lâu dài, mình muốn hai đứa bàn lại thế nào về tiền chung, tiền riêng và trách nhiệm với gia đình?", "en": "For a long-term commitment, how would I like us to revisit shared money, personal money and responsibilities to family?"}},
  {"id": "L3-03", "deckId": "families", "levelId": "living_together", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu tổ chức cưới hoặc một dịp cam kết chung, mình muốn giữ giới hạn nào về mong đợi của gia đình, khách mời và chi phí?", "en": "If we have a wedding or another commitment celebration, what boundaries would I want around family expectations, guests and costs?"}},
  {"id": "L3-04", "deckId": "dreams", "levelId": "living_together", "kind": "decision", "depth": "deep", "text": {"vi": "Về chuyện có con, không có con hoặc chưa biết, mình muốn người ấy hiểu điều gì và muốn nói lại khi nào?", "en": "About having children, not having children or being unsure, what would I like my partner to understand, and when would I want to revisit it?"}},
  {"id": "L4-01", "deckId": "dreams", "levelId": "married", "kind": "decision", "depth": "deep", "text": {"vi": "Mình có muốn nuôi dạy con không, đang còn phân vân điều gì, và cần điều gì trước khi bàn bước tiếp?", "en": "Do I want to raise a child, what am I unsure about, and what would I need before discussing a next step?"}},
  {"id": "L4-02", "deckId": "everyday", "levelId": "married", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu chăm sóc một đứa trẻ, mình muốn hai đứa chia việc chăm con, việc nhà, nghỉ ngơi và công việc như thế nào?", "en": "If we care for a child, how would I like us to share childcare, housework, rest and paid work?"}},
  {"id": "L4-03", "deckId": "money", "levelId": "married", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu có con, mình muốn hai đứa chuẩn bị chi phí và trao đổi ra sao nếu một người giảm thời gian làm việc hoặc cần hỗ trợ thêm?", "en": "If we have a child, how would I like us to prepare for costs and discuss one person working less or needing more support?"}},
  {"id": "L4-04", "deckId": "families", "levelId": "married", "kind": "decision", "depth": "deep", "text": {"vi": "Nếu cần người thân hỗ trợ chăm con, mình muốn nhờ những gì và giữ ranh giới nào về cách nuôi dạy?", "en": "If we ask family to help care for a child, what help would I want and what boundaries would I keep around parenting?"}},
  {"id": "L5-01", "deckId": "everyday", "levelId": "with_children", "kind": "ordinary", "depth": "medium", "text": {"vi": "Dạo này việc chăm con nào làm mình mệt nhất, và mình muốn nhờ người ấy giúp điều gì cụ thể?", "en": "Which part of caring for our child is tiring me most lately, and what specific help would I like to ask my partner for?"}},
  {"id": "L5-02", "deckId": "disagree", "levelId": "with_children", "kind": "ordinary", "depth": "medium", "text": {"vi": "Khi khác ý về cách chăm con, mình muốn hai đứa trao đổi thế nào để vẫn tôn trọng nhau?", "en": "When we disagree about caring for our child, how would I like us to talk while respecting each other?"}},
  {"id": "L5-03", "deckId": "everyday", "levelId": "with_children", "kind": "ordinary", "depth": "medium", "text": {"vi": "Bên cạnh việc chăm con, mình đang cần khoảng riêng hoặc cách gần gũi nào với người ấy mà không tạo thêm áp lực?", "en": "Alongside caring for our child, what time alone or closeness with my partner do I need without adding pressure?"}},
  {"id": "L5-04", "deckId": "memories", "levelId": "with_children", "kind": "ordinary", "depth": "medium", "text": {"vi": "Một khoảnh khắc nhỏ với con gần đây mà mình muốn kể lại cho người ấy là gì?", "en": "What small recent moment with our child would I like to tell my partner about?"}}
];

export const gateIds = (rank: number) => CARDS.filter((card) => card.kind === "decision" && levelRank(card.levelId) === rank).map((card) => card.id);
