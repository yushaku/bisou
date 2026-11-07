import { CONTROL_CHARACTERS } from "./text";
import type { Locale } from "./types";
import { daysBetween } from "./days";

export const GARDEN_ANSWER_MAX = 1000;
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
  day: string;
  today: GardenCardState | null;
  swapLocked: boolean;
  plants: GardenPlant[];
  freshness: Freshness;
}
export interface GardenDeckState { active: GardenCardState | null; history: GardenCardState[] }

export function answerText(raw: unknown): { text: string } | { error: "invalid_answer" | "answer_too_long" } {
  if (typeof raw !== "string" || CONTROL_CHARACTERS.test(raw)) return { error: "invalid_answer" };
  const text = raw.trim();
  if (!text) return { error: "invalid_answer" };
  if ([...text].length > GARDEN_ANSWER_MAX) return { error: "answer_too_long" };
  return { text };
}

export function cardById(id: string): GardenCard | undefined { return CARDS.find((card) => card.id === id); }

export interface DrawInput { played?: string[]; previousDeck?: string; excludedCard?: string; excludedDeck?: string; stages?: Record<string, number>; swapped?: string[] }
export function drawCard(input: DrawInput, seed: number): GardenCard | null {
  const cards = CARDS.filter((card) => !card.retired && !input.played?.includes(card.id) && card.id !== input.excludedCard);
  let decks = DECKS.filter((deck) => cards.some((card) => card.deckId === deck.id));
  for (const excluded of [input.previousDeck, input.excludedDeck]) {
    const alternatives = decks.filter((deck) => deck.id !== excluded);
    if (alternatives.length) decks = alternatives;
  }
  if (!decks.length) return null;
  const weight = (deckId: string) => 1 + Math.min(2, Math.max(0, 7 - (input.stages?.[deckId] ?? 0)));
  let bucket = (seed >>> 0) % decks.reduce((sum, deck) => sum + weight(deck.id), 0);
  const deck = decks.find((candidate) => { bucket -= weight(candidate.id); return bucket < 0; })!;
  const inDeck = cards.filter((card) => card.deckId === deck.id);
  return inDeck.find((card) => !input.swapped?.includes(card.id))
    ?? inDeck.sort((a, b) => input.swapped!.indexOf(a.id) - input.swapped!.indexOf(b.id))[0] ?? null;
}

interface GardenDeck { id: string; name: Record<Locale, string>; purpose: Record<Locale, string> }
export interface GardenCard { id: string; deckId: string; depth: "light" | "medium" | "deep"; text: Record<Locale, string>; retired?: boolean }

export const DECKS: GardenDeck[] = [
  {"id": "memories", "name": {"vi": "Ký ức", "en": "Memories"}, "purpose": {"vi": "Những điều đã làm nên mỗi đứa, và những lúc của hai đứa.", "en": "What shaped each of us, and the moments we share."}},
  {"id": "dreams", "name": {"vi": "Ước mơ", "en": "Dreams"}, "purpose": {"vi": "Điều mỗi đứa mong cho mình và cho hai đứa.", "en": "What each of us hopes for, alone and together."}},
  {"id": "money", "name": {"vi": "Tiền bạc", "en": "Money"}, "purpose": {"vi": "Mỗi đứa lớn lên cùng tiền ra sao, và muốn giữ tiền chung thế nào.", "en": "How each of us grew up with money, and how we want to handle it together."}},
  {"id": "disagree", "name": {"vi": "Khi bất đồng", "en": "When we disagree"}, "purpose": {"vi": "Hiểu mỗi đứa cảm thấy gì khi nghĩ khác nhau, để nói về nó, không phải để phân thắng thua.", "en": "Understand how each of us feels when we see things differently, to talk about it, not to win."}},
  {"id": "families", "name": {"vi": "Gia đình hai bên", "en": "Both families"}, "purpose": {"vi": "Biết về gia đình của nhau, và điều mỗi đứa mong giữa hai nhà.", "en": "Know each other's families, and what each of us hopes for between them."}},
  {"id": "everyday", "name": {"vi": "Mỗi ngày của mình", "en": "Everyday us"}, "purpose": {"vi": "Những chuyện nhỏ của bây giờ: điều làm mỗi đứa vui, mệt, và thấy được thương.", "en": "The small things of now: what makes each of us happy, tired, and feel loved."}}
];

export const CARDS: GardenCard[] = [
  {"id": "memories-01", "deckId": "memories", "depth": "light", "text": {"vi": "Món ăn nào làm mình nhớ ngay tới tuổi thơ? Nó gợi lại ai, ở đâu?", "en": "Which food takes you straight back to childhood? Who and where does it bring back?"}},
  {"id": "memories-02", "deckId": "memories", "depth": "light", "text": {"vi": "Lần đầu gặp người ấy, điều gì mình còn nhớ rõ nhất?", "en": "What do you remember most clearly about the first time we met?"}},
  {"id": "memories-03", "deckId": "memories", "depth": "light", "text": {"vi": "Một bài hát gắn với một quãng đời của mình. Giờ nghe lại thấy thế nào?", "en": "A song tied to a time in your life. How does it feel to hear it now?"}},
  {"id": "memories-04", "deckId": "memories", "depth": "light", "text": {"vi": "Hồi nhỏ, mình hay trốn ở góc nào nhất? Ở đó mình thấy ra sao?", "en": "As a kid, where did you like to hide away? How did it feel there?"}},
  {"id": "memories-05", "deckId": "memories", "depth": "medium", "text": {"vi": "Khoảnh khắc nào của hai đứa mình muốn giữ lại mãi? Lúc đó mình cảm thấy gì?", "en": "Which moment of ours would you keep forever? What did you feel then?"}},
  {"id": "memories-06", "deckId": "memories", "depth": "medium", "text": {"vi": "Hồi nhỏ, mình hay được khen vì điều gì? Giờ nghĩ lại mình thấy sao?", "en": "What were you often praised for as a child? How do you feel about it now?"}},
  {"id": "memories-07", "deckId": "memories", "depth": "medium", "text": {"vi": "Có ai (thầy cô, bạn bè hay họ hàng) đã làm mình nhìn đời khác đi? Chuyện thế nào?", "en": "Someone (a teacher, friend or relative) who changed how you see life. What happened?"}},
  {"id": "memories-08", "deckId": "memories", "depth": "medium", "text": {"vi": "Lúc nào mình thấy tự hào về bản thân nhất? Khi đó có ai bên cạnh không?", "en": "When were you proudest of yourself? Was anyone with you?"}},
  {"id": "memories-09", "deckId": "memories", "depth": "deep", "text": {"vi": "Một quãng khó khăn mình đã đi qua. Điều gì đã giúp mình đứng dậy?", "en": "A hard stretch you went through. What helped you get back up?"}},
  {"id": "memories-10", "deckId": "memories", "depth": "deep", "text": {"vi": "Có chuyện ngày xưa nào mình chưa kể với ai, nhưng muốn người ấy biết?", "en": "Is there something from long ago you've told no one, but would like your partner to know?"}},
  {"id": "dreams-01", "deckId": "dreams", "depth": "light", "text": {"vi": "Nếu có trọn một ngày rảnh, mình muốn sống ngày đó thế nào?", "en": "With one whole free day, how would you spend it?"}},
  {"id": "dreams-02", "deckId": "dreams", "depth": "light", "text": {"vi": "Nơi nào mình muốn hai đứa cùng đến một lần trong đời? Vì sao lại là nơi đó?", "en": "Where would you like us to go together once in our lives? Why there?"}},
  {"id": "dreams-03", "deckId": "dreams", "depth": "light", "text": {"vi": "Hồi nhỏ mình mơ làm nghề gì? Giấc mơ đó còn chút nào trong mình không?", "en": "What did you dream of becoming as a kid? Is any of it still in you?"}},
  {"id": "dreams-04", "deckId": "dreams", "depth": "light", "text": {"vi": "Có điều gì mình luôn muốn học mà chưa có dịp?", "en": "Something you've always wanted to learn but never had the chance?"}},
  {"id": "dreams-05", "deckId": "dreams", "depth": "medium", "text": {"vi": "Năm năm nữa, một ngày bình thường của hai đứa trông thế nào trong mắt mình?", "en": "Five years from now, what does an ordinary day of ours look like to you?"}},
  {"id": "dreams-06", "deckId": "dreams", "depth": "medium", "text": {"vi": "Ngôi nhà mơ ước của mình có những gì? Góc nào là góc của riêng mình?", "en": "What is in your dream home? Which corner is yours?"}},
  {"id": "dreams-07", "deckId": "dreams", "depth": "medium", "text": {"vi": "Một ước mơ mình từng gác lại. Giờ nghĩ đến nó, mình thấy thế nào?", "en": "A dream you once set aside. How do you feel when you think of it now?"}},
  {"id": "dreams-08", "deckId": "dreams", "depth": "medium", "text": {"vi": "Điều gì làm mình thấy cuộc sống này đáng sống nhất?", "en": "What makes life feel most worth living to you?"}},
  {"id": "dreams-09", "deckId": "dreams", "depth": "deep", "text": {"vi": "Có ước mơ nào mình ngại nói ra vì sợ bị cho là viển vông?", "en": "Is there a dream you're shy to say out loud, afraid it sounds far-fetched?"}},
  {"id": "dreams-10", "deckId": "dreams", "depth": "deep", "text": {"vi": "Khi về già, mình mong nhìn lại và thấy hai đứa đã cùng làm được điều gì?", "en": "When we're old, what do you hope to look back on and see we did together?"}},
  {"id": "money-01", "deckId": "money", "depth": "light", "text": {"vi": "Hồi nhỏ, nhà mình nói chuyện tiền bạc với nhau như thế nào?", "en": "Growing up, how did your family talk about money?"}},
  {"id": "money-02", "deckId": "money", "depth": "light", "text": {"vi": "Món đồ nhỏ nào mình mua mà tới giờ vẫn thấy vui?", "en": "Which small thing you bought still makes you happy?"}},
  {"id": "money-03", "deckId": "money", "depth": "light", "text": {"vi": "Đồng tiền đầu tiên mình tự kiếm được là từ đâu? Mình đã làm gì với nó?", "en": "Where did the first money you earned come from? What did you do with it?"}},
  {"id": "money-04", "deckId": "money", "depth": "medium", "text": {"vi": "Tiêu vào điều gì khiến mình thấy đáng nhất? Điều gì thì thấy tiếc?", "en": "What spending feels most worth it to you? What feels like a waste?"}},
  {"id": "money-05", "deckId": "money", "depth": "medium", "text": {"vi": "Với mình, điều gì về tiền bạc giúp mình thấy an tâm?", "en": "What about money helps you feel secure?"}},
  {"id": "money-06", "deckId": "money", "depth": "medium", "text": {"vi": "Khi nói chuyện tiền với người ấy, mình thấy thoải mái hay ngại? Vì sao?", "en": "When we talk about money, do you feel at ease or awkward? Why?"}},
  {"id": "money-07", "deckId": "money", "depth": "medium", "text": {"vi": "Tiền chung, tiền riêng: cách nào khiến mình thấy dễ chịu nhất?", "en": "Shared money, own money: what arrangement feels most comfortable to you?"}},
  {"id": "money-08", "deckId": "money", "depth": "medium", "text": {"vi": "Mình muốn hai đứa cùng để dành cho điều gì nhất?", "en": "What would you most like us to save for together?"}},
  {"id": "money-09", "deckId": "money", "depth": "deep", "text": {"vi": "Có nỗi lo nào về tiền mình hay giữ trong lòng, ít khi nói ra?", "en": "Is there a money worry you keep to yourself and rarely say?"}},
  {"id": "money-10", "deckId": "money", "depth": "deep", "text": {"vi": "Phụ giúp tiền cho gia đình hai bên: thế nào thì mình thấy yên lòng?", "en": "Helping our families with money: what would let you feel at peace?"}},
  {"id": "disagree-01", "deckId": "disagree", "depth": "light", "text": {"vi": "Khi bực mình, mình cần gì trước: nói ra ngay, hay yên một lúc?", "en": "When you're upset, what do you need first: to talk right away, or some quiet?"}},
  {"id": "disagree-02", "deckId": "disagree", "depth": "light", "text": {"vi": "Một câu nói hay cử chỉ nhỏ nào giúp mình dịu lại nhanh nhất?", "en": "Which small word or gesture calms you down fastest?"}},
  {"id": "disagree-03", "deckId": "disagree", "depth": "light", "text": {"vi": "Mình thích làm lành theo kiểu nào: một cái ôm, một bữa ăn, hay một lời nói?", "en": "How do you like to make up: a hug, a meal, or a few words?"}},
  {"id": "disagree-04", "deckId": "disagree", "depth": "medium", "text": {"vi": "Hồi nhỏ, người lớn trong nhà mình giận nhau rồi làm lành ra sao?", "en": "Growing up, how did the adults at home fall out and make up?"}},
  {"id": "disagree-05", "deckId": "disagree", "depth": "medium", "text": {"vi": "Khi hai đứa nghĩ khác nhau, điều gì khiến mình thấy được lắng nghe?", "en": "When we see things differently, what makes you feel heard?"}},
  {"id": "disagree-06", "deckId": "disagree", "depth": "medium", "text": {"vi": "Có chuyện nào mình thấy khó mở lời với người ấy? Điều gì sẽ giúp dễ hơn?", "en": "Is there something you find hard to bring up with your partner? What would make it easier?"}},
  {"id": "disagree-07", "deckId": "disagree", "depth": "medium", "text": {"vi": "Sau một lần to tiếng, trong lòng mình thường thấy thế nào?", "en": "After raised voices, how do you usually feel inside?"}},
  {"id": "disagree-08", "deckId": "disagree", "depth": "medium", "text": {"vi": "Một điều hai đứa nghĩ khác nhau mà mình thấy cứ khác vậy cũng ổn.", "en": "One thing we see differently that you think is fine to keep different."}},
  {"id": "disagree-09", "deckId": "disagree", "depth": "deep", "text": {"vi": "Khi bất đồng, điều mình sợ xảy ra nhất là gì?", "en": "In a disagreement, what are you most afraid might happen?"}},
  {"id": "disagree-10", "deckId": "disagree", "depth": "deep", "text": {"vi": "Có chuyện nào hai đứa hay quay lại? Với mình, điều quan trọng nằm bên dưới chuyện đó là gì?", "en": "Is there a topic we keep coming back to? For you, what matters underneath it?"}},
  {"id": "families-01", "deckId": "families", "depth": "light", "text": {"vi": "Món nào ở nhà (mẹ hay ai đó nấu) mà mình nhớ nhất?", "en": "Which dish from home (your mum's or whoever cooked) do you miss most?"}},
  {"id": "families-02", "deckId": "families", "depth": "light", "text": {"vi": "Tết ở nhà mình có thói quen nào mà mình thích nhất?", "en": "Which Tết habit in your family do you love most?"}},
  {"id": "families-03", "deckId": "families", "depth": "light", "text": {"vi": "Trong nhà, mình giống ai nhất? Giống ở điểm nào?", "en": "Who in your family are you most like? In what way?"}},
  {"id": "families-04", "deckId": "families", "depth": "light", "text": {"vi": "Một kỷ niệm vui với ông bà mà mình hay nghĩ tới?", "en": "A happy memory with your grandparents that you often think of?"}},
  {"id": "families-05", "deckId": "families", "depth": "medium", "text": {"vi": "Lần đầu gặp gia đình người ấy, mình đã cảm thấy thế nào?", "en": "How did you feel the first time you met your partner's family?"}},
  {"id": "families-06", "deckId": "families", "depth": "medium", "text": {"vi": "Mình mong hai bên gia đình gần nhau hơn ở điểm nào?", "en": "In what way would you like our two families to be closer?"}},
  {"id": "families-07", "deckId": "families", "depth": "medium", "text": {"vi": "Điều gì của gia đình mình mà mình muốn giữ cho tổ ấm của hai đứa?", "en": "What from your family would you like to keep in our own home?"}},
  {"id": "families-08", "deckId": "families", "depth": "medium", "text": {"vi": "Điều gì của gia đình mình mà mình muốn hai đứa làm khác đi?", "en": "What from your family would you like us to do differently?"}},
  {"id": "families-09", "deckId": "families", "depth": "deep", "text": {"vi": "Khi đứng giữa gia đình mình và người ấy, mình thấy khó nhất ở đâu?", "en": "When you feel caught between your family and your partner, what is hardest?"}},
  {"id": "families-10", "deckId": "families", "depth": "deep", "text": {"vi": "Sau này khi bố mẹ hai bên cần chăm sóc, mình mong hai đứa sẽ cùng làm thế nào?", "en": "Later, when our parents need care, how do you hope we'll handle it together?"}},
  {"id": "everyday-01", "deckId": "everyday", "depth": "light", "text": {"vi": "Dạo này điều gì làm mình vui nhất trong ngày?", "en": "Lately, what's the best part of your day?"}},
  {"id": "everyday-02", "deckId": "everyday", "depth": "light", "text": {"vi": "Một việc nhỏ người ấy làm khiến mình thấy được thương. Đó là việc gì?", "en": "A small thing your partner does that makes you feel loved. What is it?"}},
  {"id": "everyday-03", "deckId": "everyday", "depth": "light", "text": {"vi": "Buổi tối lý tưởng của hai đứa sau một ngày dài trông thế nào?", "en": "What does our ideal evening after a long day look like?"}},
  {"id": "everyday-04", "deckId": "everyday", "depth": "light", "text": {"vi": "Dạo này mình đang mê gì: một bài hát, một món ăn hay một bộ phim?", "en": "What are you into lately: a song, a dish or a show?"}},
  {"id": "everyday-05", "deckId": "everyday", "depth": "medium", "text": {"vi": "Dạo này điều gì làm mình mệt hoặc lo nhất?", "en": "Lately, what's tiring or worrying you most?"}},
  {"id": "everyday-06", "deckId": "everyday", "depth": "medium", "text": {"vi": "Khi mình mệt, người ấy làm gì thì mình thấy đỡ hơn?", "en": "When you're worn out, what can your partner do that helps?"}},
  {"id": "everyday-07", "deckId": "everyday", "depth": "medium", "text": {"vi": "Mình thấy gần người ấy nhất vào những lúc nào?", "en": "When do you feel closest to your partner?"}},
  {"id": "everyday-08", "deckId": "everyday", "depth": "medium", "text": {"vi": "Có điều gì mình muốn hai đứa làm cùng nhau thường hơn?", "en": "Is there something you'd like us to do together more often?"}},
  {"id": "everyday-09", "deckId": "everyday", "depth": "deep", "text": {"vi": "Điều gì ở người ấy mình biết ơn mà ít khi nói thành lời?", "en": "What about your partner are you grateful for but rarely say?"}},
  {"id": "everyday-10", "deckId": "everyday", "depth": "deep", "text": {"vi": "Gần đây có lúc nào mình thấy chơi vơi không? Lúc đó mình cần điều gì?", "en": "Lately, have you felt a little lost? What did you need then?"}}
];
