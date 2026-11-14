import { isValidElement, type ReactNode, type ReactElement, type ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { EntryCard, type Entry } from "../src/client/components/bisou/EntryCard";
import { WishCard, type Wish } from "../src/client/components/bisou/WishCard";
import { JournalDetailSheet } from "../src/client/components/bisou/JournalDetailSheet";
import { WishDetailSheet } from "../src/client/components/bisou/WishDetailSheet";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
import { Journal } from "../src/client/screens/Journal";
import type { JournalEntry } from "../src/shared/types";
import { createTabMemory } from "../src/client/lib/tabMemory";
const hooks = vi.hoisted(() => ({ active: false, index: 0, values: [] as unknown[], memory: null as unknown }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(), useId: () => "test",
  useContext: () => hooks.memory, useEffect: () => {}, useLayoutEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useState: (value: unknown) => {
    if (!hooks.active) return [value, vi.fn()];
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof value === "function" ? value() : value;
    return [hooks.values[index], (next: unknown) => { hooks.values[index] = typeof next === "function" ? next(hooks.values[index]) : next; }];
  },
  useRef: (value: unknown) => ({ current: value }),
}));
vi.mock("../src/client/lib/useTabNavigation", () => ({ useCreateRequest: () => {} }));
afterEach(() => { hooks.active = false; hooks.index = 0; hooks.values = []; hooks.memory = null; });
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "vi" }) }));
vi.mock("../src/client/lib/useOnline", () => ({ useOnline: () => true }));
type Props = { children?: ReactNode; onClick?: () => void; "aria-label"?: string; href?: string };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
const entry: Entry = { id: "entry", date: "2026-11-01", author: { name: "An", tone: "primary" }, body: "Hello", photos: [], note: "Ghi ngày yesterday" };
const wish: Wish = { id: "wish", title: "Book", price: null, link: null, photoId: null, priority: 2, status: "open", receivedOn: null, note: null, createdAt: 1, updatedAt: 1 };
it("hides the written date on cards", () => {
  expect(nodes(EntryCard({ entry })).some(n => n.props.children === entry.note)).toBe(false);
});
it.each(["journal", "wish"])("opens the %s card only when an opener is provided", kind => {
  const render = (onOpen?: () => void) => nodes(kind === "journal" ? EntryCard({ entry, onOpen }) : WishCard({ wish, onOpen }));
  expect(render().some(n => n.type === "button")).toBe(false);
  const onOpen = vi.fn();
  render(onOpen).find(n => n.type === "button")!.props.onClick!();
  expect(onOpen).toHaveBeenCalledOnce();
});
it("shows the written date only on back-filled journal details", () => {
  const render = (note?: string) => nodes(JournalDetailSheet({ entry: { ...entry, note }, onOpenPhoto: vi.fn() }));
  expect(render(entry.note).some(n => n.props.children === entry.note)).toBe(true);
  expect(render().some(n => n.props.children === entry.note)).toBe(false);
});
it.each([[true, undefined, true], [true, false, false], [false, undefined, false]] as const)("journal AC24, AC25: edit gate %s and delete permission %s", (own, canDelete, showsDelete) => {
  const result = nodes(EntryActions({ entry: null, own, canDelete, onClose: vi.fn(), onEdit: vi.fn(), onDeleted: vi.fn(), onSignedOut: vi.fn() }));
  const shows = (key: string) => result.some(n => Array.isArray(n.props.children) && n.props.children.includes(key));
  expect(shows("entry.edit")).toBe(own);
  expect(shows("entry.delete")).toBe(showsDelete);
});
it("shows a link only when the wish has one", () => {
  expect(nodes(WishDetailSheet({ wish })).some(n => n.type === "a")).toBe(false);
  expect(nodes(WishDetailSheet({ wish: { ...wish, link: "https://example.com" } })).find(n => n.type === "a")?.props.href).toBe("https://example.com");
});
it.each(["open", "received"] as const)("shows received details only for received wishes: %s", status => {
  const result = nodes(WishDetailSheet({ wish: { ...wish, status, note: "Thank you", receivedOn: "2026-11-01" } }));
  expect(result.some(n => n.props.children === "received.on")).toBe(status === "received");
  expect(result.some(n => n.props.children === "Thank you")).toBe(status === "received");
});
it("notes AC9 AC16: a read-only note detail has its state title and Close, without a journal date header", () => {
  const result = nodes(EntryActions({ entry: { id: "note", date: "2026-11-13", photoIds: [] }, title: "notes.opened", own: false, onClose: vi.fn(), onEdit: vi.fn(), onDeleted: vi.fn(), onSignedOut: vi.fn() }));
  expect(result.some(n => n.props.children === "notes.opened")).toBe(true);
  expect(result.some(n => n.props.children === "common.close")).toBe(true);
  expect(result.some(n => n.props.children === "entry.cancel")).toBe(false);
});

const members = [
  { id: "an", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", displayName: "Bình", birthDate: null, avatarId: null },
];
it.each(["partner", "wish", "note"] as const)("journal AC23, AC24, AC25: %s feed options and details keep edit/delete permissions separate", kind => {
  const shared: JournalEntry = { id: "shared", authorId: "an", date: "2026-11-01", text: "Our story", source: kind === "wish" ? "wish" : "partner", photoIds: [], createdAt: 1, updatedAt: 1,
    ...(kind === "note" ? { note: { id: "note", recipientId: "binh", happened: "h", feel: "f", need: "n", hope: "r", pick: "try" as const, line: "" } } : {}),
  };
  for (const member of members) {
    for (const path of ["options", "details"]) {
      hooks.active = true; hooks.values = [];
      const memory = createTabMemory(); memory.journal = { entries: [shared], nextCursor: null }; hooks.memory = memory;
      const render = () => {
        hooks.index = 0;
        return nodes(Journal({ couple: { id: "couple", startDate: null, members, events: [] }, user: { ...member, email: "a@example.com", locale: "vi", createdAt: 1 }, onSignedOut: vi.fn(), onUser: vi.fn() }));
      };
      const card = render().find(node => node.type === EntryCard)! as ReactElement<ComponentProps<typeof EntryCard>>;
      if (path === "details") card.props.onOpen!();
      else (card.props.actions as ReactElement<{ onClick: () => void }>).props.onClick();
      const actions = render().find(node => node.type === EntryActions && (node.props as ComponentProps<typeof EntryActions>).entry?.id === shared.id)! as ReactElement<ComponentProps<typeof EntryActions>>;
      expect(actions).toBeDefined();
      const controls = nodes(EntryActions(actions.props));
      const shows = (key: string) => controls.some(node => Array.isArray(node.props.children) && node.props.children.includes(key));
      expect(shows("entry.edit")).toBe(true);
      expect(shows("entry.delete")).toBe(member.id === "an" || kind === "note");
    }
  }
});
