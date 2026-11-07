import { isValidElement, type ReactNode, type ReactElement } from "react";
import { expect, it, vi } from "vitest";
import { EntryCard, type Entry } from "../src/client/components/bisou/EntryCard";
import { WishCard, type Wish } from "../src/client/components/bisou/WishCard";
import { JournalDetailSheet } from "../src/client/components/bisou/JournalDetailSheet";
import { WishDetailSheet } from "../src/client/components/bisou/WishDetailSheet";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useId: () => "test", useState: (value: unknown) => [value, vi.fn()], useRef: (value: unknown) => ({ current: value }) }));
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
it.each([true, false])("shows journal actions only for own entries: %s", own => {
  const result = nodes(EntryActions({ entry: null, own, onClose: vi.fn(), onEdit: vi.fn(), onDeleted: vi.fn(), onSignedOut: vi.fn() }));
  for (const key of ["entry.edit", "entry.delete"]) expect(result.some(n => Array.isArray(n.props.children) && n.props.children.includes(key))).toBe(own);
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
