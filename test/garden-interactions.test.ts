import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { StarredBlock, StarredCard } from "../src/client/components/bisou/StarredCards";
import { EmptyState } from "../src/client/components/bisou/EmptyState";
import { GardenCard } from "../src/client/components/bisou/GardenCard";
import { GardenStageNotice } from "../src/client/components/bisou/GardenStageNotice";
import { GardenStageView } from "../src/client/components/bisou/GardenStageView";
import { GardenStageSheet } from "../src/client/components/bisou/GardenStageSheet";
import { GardenStageDecisions } from "../src/client/components/bisou/GardenStageDecisions";
import { decisionStatus, flipKey } from "../src/client/lib/garden";
import { GardenScene } from "../src/client/components/bisou/GardenScene";
import { Textarea } from "../src/client/components/ui/textarea";
import { ToggleGroup } from "../src/client/components/ui/toggle-group";
import { api } from "../src/client/api";
import { vi as messages } from "../src/client/i18n/vi";
import type { GardenCardState, GardenState } from "../src/shared/garden";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useId: () => "card-test",
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  },
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useContext: () => null,
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = { current: initial };
    return hooks.values[index];
  },
  useCallback: <T,>(callback: T) => callback,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ locale: "vi", t: (key: keyof typeof messages, vars?: Record<string, string | number>) => {
  let text: string = messages[key];
  for (const [name, value] of Object.entries(vars ?? {})) text = text.replaceAll(`{${name}}`, String(value));
  return text;
} }) }));
afterEach(() => { hooks.values = []; hooks.effects = []; hooks.index = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { children?: ReactNode; onClick?: () => unknown; onValueChange?: (value: string) => void; onSubmit?: (event: { preventDefault: () => void }) => void; open?: boolean };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function render(component: () => ReactNode) { hooks.index = 0; return elements(component()); }
function click(nodes: ReactElement<Props>[], label: string) { return nodes.find((node) => node.props.children === label)!.props.onClick!(); }
function setup() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  return store;
}
const card: GardenCardState = { starred: false, cardId: "L2-01", mine: null, mineChoice: null, mineDeleted: false, mineEdited: false, partner: null, partnerChoice: null, partnerAnswered: false, partnerDeleted: false, partnerEdited: false, flippedDay: null };
const state: GardenState = { day: "2026-11-09", today: null, swapLocked: false, freshness: "fresh", plants: [], levels: {
  revision: 3, initialLevelId: "in_love", selectedLevelId: "in_love", furthestLevelId: "in_love", placementComplete: true,
  proposal: { kind: "target", levelId: "living_together", agreed: false, proposedByMe: false }, decisions: [],
} };

it("garden-stages R43 R44 AC25 AC35: chips hide the text box, cancel submits nothing and place down sends the chosen response", async () => {
  setup();
  const changed = vi.fn();
  const save = vi.spyOn(api, "answerGarden").mockResolvedValue({ ok: true, data: { card } });
  const component = () => GardenCard({ card, myName: "An", partnerName: "Bình", memoryScope: "chips-test", onChanged: changed, onSignedOut: vi.fn() });
  // The write button also contains its pencil icon.
  render(component).find((node) => Array.isArray(node.props.children) && node.props.children.includes("Viết"))!.props.onClick!();
  expect(render(component).some((node) => node.type === Textarea)).toBe(true);
  const chips = render(component).find((node) => node.type === ToggleGroup)!;
  expect(elements(chips.props.children).map((node) => node.props.children)).toEqual(["Viết câu trả lời", "Không ghi chi tiết", "Để sau"]);
  chips.props.onValueChange!("no_details");
  expect(render(component).some((node) => node.type === Textarea)).toBe(false);
  click(render(component), "Thôi"); expect(save).not.toHaveBeenCalled();
  render(component).find((node) => Array.isArray(node.props.children) && node.props.children.includes("Viết"))!.props.onClick!();
  render(component).find((node) => node.type === ToggleGroup)!.props.onValueChange!("later_not_applicable");
  expect(render(component).some((node) => node.props.children === "Úp thẻ")).toBe(true);
  render(component).find((node) => node.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(save).toHaveBeenCalledWith("L2-01", { choice: "later_not_applicable" });
  expect(changed).toHaveBeenCalledOnce();
});

it("garden R15 AC9: repeated clicks and remounts never replay flip or watering", async () => {
  setup(); const flip = vi.fn();
  const flipped = { ...card, mine: "own", partner: "other", flippedDay: "2026-11-09" };
  const component = () => GardenCard({ card: flipped, myName: "An", partnerName: "Bình", memoryScope: "flip-click-test", onChanged: vi.fn(), onSignedOut: vi.fn(), onFlip: flip });
  const button = render(component).find((node) => Array.isArray(node.props.children) && node.props.children.includes("Lật thẻ"))!;
  await button.props.onClick!(); await button.props.onClick!();
  expect(flip).toHaveBeenCalledOnce();
  hooks.values = [];
  expect(render(component).some((node) => Array.isArray(node.props.children) && node.props.children.includes("Lật thẻ"))).toBe(false);
});

it("garden-stages R48 R50 R59 AC27 AC33: named banner accepts the displayed revision and opened stage celebrates only once", async () => {
  setup(); const changed = vi.fn();
  const accept = vi.spyOn(api, "gardenLevels").mockResolvedValue({ ok: true, data: { levels: state.levels } });
  const component = () => GardenStageNotice({ state, partnerName: "An", memoryScope: "banner-test", onChanged: changed, onSignedOut: vi.fn() });
  expect(render(component).some((node) => node.props.children === "An muốn hai đứa bước sang Sống chung")).toBe(true);
  await click(render(component), "Đồng ý");
  expect(accept).toHaveBeenCalledWith({ action: "accept", revision: 3 }); expect(changed).toHaveBeenCalledOnce();
  for (const effect of hooks.effects.splice(0)) effect();
  expect(render(component).find((node) => node.type === GardenScene)!.props.open).toBe(true);
  hooks.values = []; hooks.effects = [];
  render(component); for (const effect of hooks.effects.splice(0)) effect();
  expect(render(component).find((node) => node.type === GardenScene)!.props.open).toBe(false);
});

it("garden-stages R48 R54 AC27: the stage sheet has no checklist and never disables the next-stage choice", () => {
  setup();
  const nodes = render(() => GardenStageSheet({ levels: { ...state.levels, proposal: null }, levelId: "living_together", partnerName: "Bình", open: true, onClose: vi.fn(), onChanged: vi.fn(), onSignedOut: vi.fn(), onViewStage: vi.fn() }));
  expect(nodes.some((node) => node.props.children === "Điều cần bàn trước khi Sống chung")).toBe(false);
  const button = nodes.find((node) => node.props.children === "Muốn bước sang Sống chung")!;
  expect((button.props as { disabled?: boolean }).disabled).toBe(false);
});

it("garden-stages R54: the Garden lists the furthest stage's decisions, my turn first, three at a time", () => {
  setup();
  vi.spyOn(api, "gardenStageDecisions").mockResolvedValue({ ok: true, data: { cards: [] } });
  const props = { myName: "An", partnerName: "Bình", memoryScope: "decisions-test", onChanged: vi.fn(), onSignedOut: vi.fn() };
  hooks.values[0] = [
    { ...card, cardId: "L2-01", mine: "x", partner: "y", flippedDay: "2026-11-09" },
    { ...card, cardId: "L2-02" },
    { ...card, cardId: "L2-03", partnerAnswered: true },
    { ...card, cardId: "L2-04", mine: "mine" },
  ];
  const nodes = render(() => GardenStageDecisions({ ...props, stageId: "in_love" }));
  const text = (value: string) => nodes.some((node) => node.props.children === value);
  expect(text("Điều cần bàn trước khi Sống chung")).toBe(true);
  expect(text("Còn 3 điều nên bàn")).toBe(true);
  expect(text("Xem cả 4 điều")).toBe(true);
  expect(nodes.filter((node) => node.type === "li").map((node) => node.key)).toEqual(["L2-03", "L2-02", "L2-04"]);
  expect(decisionStatus({ ...card, partnerAnswered: true })).toBe("turn");
  hooks.values = [];
  expect(GardenStageDecisions({ ...props, stageId: "with_children" })).toBeNull();
});

it("garden-stars R67 AC39: the stage answered list shows a star toggle on a revealed decision card", () => {
  const store = setup();
  const answered = { ...card, mine: "An's answer", partner: "Bình's answer", flippedDay: "2026-11-09" };
  store.set(flipKey("stage-stars", answered), "1");
  hooks.values[0] = [answered];
  const nodes = render(() => GardenStageView({ levels: state.levels, plants: [], freshness: "fresh", stageId: "in_love", myName: "An", partnerName: "Bình", memoryScope: "stage-stars", onOpenMap: vi.fn(), onSelectStage: vi.fn(), onOpenDeck: vi.fn(), onChanged: vi.fn(), onSignedOut: vi.fn() }));
  const listed = nodes.find(node => node.type === GardenCard)!;
  hooks.values = [];
  const rendered = render(() => GardenCard(listed.props as Parameters<typeof GardenCard>[0]));
  expect(rendered.some(node => Array.isArray(node.props.children) && node.props.children.includes("Gắn sao"))).toBe(true);
});

it.each([
  { starred: false, status: 200 },
  { starred: true, status: 200 },
  { starred: false, status: 500 },
  { starred: false, status: 401 },
])("garden-stars AC37 AC38: star click handles starred=$starred and status=$status", async ({ starred, status }) => {
  const store = setup();
  const flipped = { ...card, cardId: "money-01", mine: "own", partner: "other", flippedDay: "2026-11-09", starred };
  store.set(flipKey("star-click", flipped), "1");
  const changed = vi.fn();
  const signedOut = vi.fn();
  const result = status === 200 ? { ok: true as const, data: { card: { ...flipped, starred: !starred } } } : { ok: false as const, status, error: null };
  const star = vi.spyOn(api, "starGarden").mockResolvedValue(result);
  const unstar = vi.spyOn(api, "unstarGarden").mockResolvedValue(result);
  const component = () => GardenCard({ card: flipped, myName: "An", partnerName: "Bình", memoryScope: "star-click", onChanged: changed, onSignedOut: signedOut });
  const label = starred ? "Bỏ sao" : "Gắn sao";
  render(component).find(node => Array.isArray(node.props.children) && node.props.children.includes(label))!.props.onClick!();
  await Promise.resolve();
  expect(starred ? unstar : star).toHaveBeenCalledExactlyOnceWith("money-01");
  expect(starred ? star : unstar).not.toHaveBeenCalled();
  expect(changed).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
  expect(signedOut).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  const alerts = render(component).filter(node => (node.props as { role?: string }).role === "alert");
  expect(alerts.some(node => node.props.children === messages["error.generic"])).toBe(status === 500);
});

const starredProps = {
  couple: { id: "stars-couple", members: [], events: [], startDate: null },
  user: { id: "stars-user", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null, locale: "vi" as const, createdAt: 0 },
  onSignedOut: () => {},
};
const starredCards = ["money-01", "money-02", "money-03", "money-04"].map(cardId => ({
  ...card, cardId, mine: "own", partner: "other", flippedDay: "2026-11-09", starred: true,
}));
async function loadStars(cards: GardenCardState[], component: () => ReactNode) {
  const store = setup();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  for (const card of cards) store.set(flipKey("stars-couple:stars-user", card), "1");
  vi.spyOn(api, "gardenStars").mockResolvedValue({ ok: true, data: { cards } });
  render(component);
  for (const effect of hooks.effects.splice(0)) effect();
  await Promise.resolve();
  return render(component);
}

it.each([
  { count: 4, expected: ["money-01", "money-02", "money-03"], seeAll: true },
  { count: 3, expected: ["money-01", "money-02", "money-03"], seeAll: false },
  { count: 0, expected: [], seeAll: false },
])("garden-stars AC41 AC42 R70 R71: Home with $count seen stars shows the preview and link threshold", async ({ count, expected, seeAll }) => {
  const component = () => StarredBlock(starredProps);
  const nodes = await loadStars(starredCards.slice(0, count), component);
  expect(nodes.filter(node => node.type === StarredCard).map(node => node.key)).toEqual(expected);
  const links = nodes.filter(node => node.props.children === messages["home.seeAll"]);
  expect(links).toHaveLength(seeAll ? 1 : 0);
  if (seeAll) expect(links[0]!.props).toMatchObject({ href: "/stars" });
  if (!count) expect(nodes).toEqual([]);
});

it.each([{ cards: [] }, { cards: [starredCards[0]!] }])("garden-stars AC42: full stars shows an empty state when no loaded cards are visible ($cards)", async ({ cards }) => {
  const component = () => StarredBlock({ ...starredProps, full: true });
  const nodes = await loadStars([], component);
  // A server result can also contain a card this device has never revealed.
  vi.mocked(api.gardenStars).mockResolvedValue({ ok: true, data: { cards } });
  document.dispatchEvent(new Event("visibilitychange"));
  await Promise.resolve();
  const loaded = render(component);
  expect(loaded.filter(node => node.type === StarredCard)).toHaveLength(0);
  expect(loaded.find(node => node.type === EmptyState)?.props).toMatchObject({ title: "Chưa có câu hỏi quan trọng nào." });
  expect(nodes.find(node => node.type === EmptyState)).toBeDefined();
});

it.each(["drawer", "partner"])("garden-stars AC42: full stars becomes empty after the last star is removed by %s", async source => {
  const component = () => StarredBlock({ ...starredProps, full: true });
  const nodes = await loadStars([starredCards[0]!], component);
  expect(nodes.some(node => node.type === EmptyState)).toBe(false);
  expect(nodes.filter(node => node.type === StarredCard)).toHaveLength(1);
  vi.mocked(api.gardenStars).mockResolvedValue({ ok: true, data: { cards: [] } });
  if (source === "drawer") {
    const preview = nodes.find(node => node.type === StarredCard)!;
    (preview.props as { onOpen: () => void }).onOpen();
    const drawerCard = render(component).find(node => node.type === GardenCard)!;
    (drawerCard.props as { onChanged: () => void }).onChanged();
  } else {
    document.dispatchEvent(new Event("visibilitychange"));
  }
  await Promise.resolve();
  const refreshed = render(component);
  expect(refreshed.filter(node => node.type === StarredCard)).toHaveLength(0);
  expect(refreshed.find(node => node.type === EmptyState)?.props).toMatchObject({ title: "Chưa có câu hỏi quan trọng nào." });
  expect(refreshed.some(node => node.type === GardenCard)).toBe(false);
});


it("garden-stars AC42: full stars keeps loading and failure distinct from an empty result", async () => {
  setup();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.spyOn(api, "gardenStars").mockResolvedValue({ ok: false, status: 500, error: null });
  const component = () => StarredBlock({ ...starredProps, full: true });
  expect(render(component).some(node => node.type === EmptyState)).toBe(false);
  for (const effect of hooks.effects.splice(0)) effect();
  await Promise.resolve();
  const failed = render(component);
  expect(failed.some(node => node.type === EmptyState)).toBe(false);
  expect(failed.some(node => (node.props as { role?: string }).role === "alert")).toBe(true);
});
