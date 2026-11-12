import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { MascotPicker } from "../src/client/components/bisou/MascotPicker";
import { ToggleGroup } from "../src/client/components/ui/toggle-group";
import { CardBoxGift } from "../src/client/components/bisou/CardBoxGift";
import { CardBoxDeck } from "../src/client/components/bisou/CardBoxDeck";
import { Celebration } from "../src/client/components/bisou/Celebration";
import { CardBoxPlayer } from "../src/client/screens/CardBoxPlayer";
import { readMascot } from "../src/client/lib/mascots";
import { writeCache } from "../src/client/lib/cardBox";
import { api } from "../src/client/api";
import { vi as messages } from "../src/client/i18n/vi";
import type { CardBoxDetail } from "../src/shared/cardBox";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = { current: initial };
    return hooks.values[index];
  },
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useContext: () => null,
  useCallback: <T,>(callback: T) => callback,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ locale: "vi", t: (key: keyof typeof messages) => messages[key] }) }));
vi.mock("../src/client/lib/useTabNavigation", () => ({ useTabNavigation: () => ({}) }));
afterEach(() => { hooks.values = []; hooks.index = 0; hooks.effects = []; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { children?: ReactNode; onValueChange?: (id: string) => void; onNext?: () => void; onConfirm?: () => void; open?: boolean };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function render(component: () => ReactNode) { hooks.index = 0; hooks.effects = []; return elements(component()); }
function setup() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", new EventTarget());
  return values;
}
it("picker changes the device mascot immediately and ignores deselection", () => {
  setup();
  const picker = () => render(MascotPicker).find(node => node.type === ToggleGroup)!;
  picker().props.onValueChange!("boy");
  expect(readMascot().id).toBe("boy");
  picker().props.onValueChange!("");
  expect(readMascot().id).toBe("boy");
});
it.each([true, false])("gift unlock celebrates only after success (%s)", async success => {
  setup();
  const preview: CardBoxDetail = { box: { id: "sample", name: { vi: "Hộp", en: "Box" }, description: { vi: "", en: "" }, open: false, cardCount: 1, cover: "/sample.webp", price: null }, cards: [{ id: "a", kind: "question", text: { vi: "A", en: "A" } }] };
  writeCache("c:u", "box:sample", preview);
  vi.spyOn(api, "box").mockResolvedValue({ ok: true, data: preview });
  const unlock = vi.spyOn(api, "unlockBox").mockResolvedValue(success ? { ok: true, data: { ...preview, box: { ...preview.box, open: true } } } : { ok: false, status: 503, error: null });
  const user = { id: "u", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
  const player = () => CardBoxPlayer({ user, boxId: "sample", couple: { id: "c", members: [], events: [], startDate: null }, onUser() {}, onSignedOut() {} });
  expect(render(player).find(node => node.type === Celebration)!.props.open).toBe(false);
  for (const effect of hooks.effects) effect();
  await Promise.resolve();
  render(player).find(node => node.type === CardBoxDeck)!.props.onNext!();
  render(player).find(node => node.type === CardBoxGift)!.props.onConfirm!();
  await Promise.resolve();
  expect(unlock).toHaveBeenCalledWith("sample");
  expect(render(player).find(node => node.type === Celebration)!.props.open).toBe(success);
});
