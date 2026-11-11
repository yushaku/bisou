import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Journal } from "../src/client/screens/Journal";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
import { NoteSheet } from "../src/client/components/bisou/NoteSheet";
import { BottomBar } from "../src/client/components/bisou/AppShell";
import { DrawerContent, DrawerTitle } from "../src/client/components/ui/drawer";
import { vi as vietnamese } from "../src/client/i18n/vi";
import { en as english } from "../src/client/i18n/en";
import { api } from "../src/client/api";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, refs: [] as { current: unknown }[], refIndex: 0, locale: "vi", effects: [] as (() => unknown)[], requests: new Map<string, () => void>() }));
const notesRefresh = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
  useRef: (initial: unknown) => hooks.refs[hooks.refIndex++] ?? (hooks.refs[hooks.refIndex - 1] = { current: initial }),
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useLayoutEffect: vi.fn(), useContext: () => null, useCallback: <T,>(callback: T) => callback,
  useImperativeHandle: (ref: { current: unknown } | undefined, create: () => unknown) => { if (ref) ref.current = create(); },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/lib/useNotes", () => ({ useNotes: () => ({ lists: { fromMe: [], toMe: [] }, failed: false, refresh: notesRefresh }) }));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: keyof typeof vietnamese) => (hooks.locale === "vi" ? vietnamese : english)[key] }) }));

vi.mock("../src/client/lib/useTabNavigation", async (original) => ({ ...await original<typeof import("../src/client/lib/useTabNavigation")>(), useCreateRequest: (destination: string, onOpen: () => void) => { hooks.requests.set(destination, onOpen); } }));

type Props = { ref?: { current: { refresh: () => Promise<void> } | null }; onRefresh?: () => Promise<void>; value?: string; composeRequested?: boolean; onComposeHandled?: () => void; partnerName?: string; fromMenu?: boolean; author?: unknown; children?: ReactNode; label?: string; "aria-label"?: string; "data-create-button"?: boolean; onClick?: () => void; open?: boolean; onAnimationEnd?: (open: boolean) => void; onCloseAutoFocus?: (event: { preventDefault: () => void }) => void };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
function render(active: "journal" | "home" | "garden" | "wishes", onCreate = vi.fn()) {
  hooks.index = 0; hooks.refIndex = 0;
  return nodes(BottomBar({ active, onCreate, onSelect: vi.fn() }));
}
afterEach(() => { hooks.values = []; hooks.refs = []; hooks.locale = "vi"; hooks.effects = []; hooks.requests.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); notesRefresh.mockReset(); });
it.each(["vi", "en"])("Journal + opens a titled sheet with journal and kind note rows in %s", (locale) => {
  hooks.locale = locale;
  const create = vi.fn();
  let tree = render("journal", create);
  const plus = tree.find(n => n.props["data-create-button"] !== undefined)!;
  expect(plus.props["aria-label"]).toBe(locale === "vi" ? "Thêm một chút" : "Add something");
  plus.props.onClick!();
  tree = render("journal", create);
  expect(tree[0]!.props.open).toBe(true);
  expect(create).not.toHaveBeenCalled();
  expect(tree.find(n => n.type === DrawerTitle)?.props.children).toBe(plus.props["aria-label"]);
  expect(tree.filter(n => n.props.label).map(n => n.props.label)).toEqual(locale === "vi" ? ["Viết nhật ký", "Viết lời nhắn nhỏ"] : ["Write a journal entry", "Write a kind note"]);
});
it.each(["journal", "notes"])("Journal row requests the %s composer after the drawer closes", (destination) => {
  const create = vi.fn(), tree = render("journal", create);
  tree.filter(n => n.props.label)[destination === "journal" ? 0 : 1]!.props.onClick!();
  expect(create).not.toHaveBeenCalled();
  tree[0]!.props.onAnimationEnd!(false);
  expect(create).toHaveBeenCalledWith(destination);
});
it.each([["home", "event"], ["wishes", "wishes"]] as const)("%s + still opens %s directly", (tab, destination) => {
  const create = vi.fn();
  render(tab, create).find(n => n.props["data-create-button"] !== undefined)!.props.onClick!();
  expect(create).toHaveBeenCalledWith(destination);
});
it("Garden create menu keeps only journal and wish rows", () => {
  expect(render("garden").filter(n => n.props.label).map(n => n.props.label)).toEqual(["Viết nhật ký", "Thêm điều ước"]);
});
it("closing the create menu returns focus to +", () => {
  const focus = vi.fn(), preventDefault = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  render("journal").find(n => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

const user = { id: "a", displayName: "An", email: "an@example.com", locale: "vi" as const, birthDate: null, avatarId: null, createdAt: 1 };
const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
function journal() {
  hooks.index = 0; hooks.refIndex = 0;
  return nodes(Journal({ user, couple, onSignedOut: vi.fn(), onUser: vi.fn() }));
}
it.each(["feed", "notes"])("pulling on %s refreshes its data and waits for completion", async (section) => {
  const feedRefresh = vi.spyOn(api, "journal").mockResolvedValue({ ok: true, data: { entries: [], nextCursor: null } });
  journal();
  if (section === "notes") hooks.requests.get("notes")!();
  const tree = journal();
  const notes = tree.find(n => n.type === NotesSection)!;
  hooks.values = []; hooks.index = 0; hooks.refIndex = 0;
  NotesSection({ user, couple, onSignedOut: vi.fn(), ref: notes.props.ref });
  let finish!: () => void;
  notesRefresh.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  let done = false;
  const pending = tree[0]!.props.onRefresh!().then(() => { done = true; });
  expect(feedRefresh).toHaveBeenCalledOnce();
  if (section === "notes") {
    expect(notesRefresh).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(done).toBe(false);
    finish();
  } else expect(notesRefresh).not.toHaveBeenCalled();
  await pending;
  expect(done).toBe(true);
});
it("the journal choice opens ComposeSheet on the feed", () => {
  journal(); hooks.requests.get("journal")!();
  const tree = journal();
  expect(tree.find(n => n.props.value === "feed")).toBeDefined();
  expect(tree.find(n => n.props.author && n.props.open)?.props.fromMenu).toBe(true);
});
it("the note choice selects notes and opens NoteSheet for the named partner", () => {
  journal(); hooks.requests.get("notes")!();
  const tree = journal();
  expect(tree.find(n => n.props.value === "notes")).toBeDefined();
  const section = tree.find(n => n.type === NotesSection)!;
  expect(section.props.composeRequested).toBe(true);
  // Mount the newly selected section, then run its composer request effect.
  hooks.values = []; hooks.refs = []; hooks.effects = []; hooks.index = 0; hooks.refIndex = 0;
  NotesSection({ user, couple, onSignedOut: vi.fn(), composeRequested: true, onComposeHandled: section.props.onComposeHandled });
  for (const effect of hooks.effects.splice(0)) effect();
  hooks.index = 0; hooks.refIndex = 0;
  const note = nodes(NotesSection({ user, couple, onSignedOut: vi.fn() })).find(n => n.props.partnerName === "Linh" && n.props.open)!;
  expect(note.props.fromMenu).toBe(true);
});
it("closing a note created from + returns focus to +", () => {
  const focus = vi.fn(), preventDefault = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  const tree = nodes(NoteSheet({ open: true, fromMenu: true, onOpenChange: vi.fn(), partnerName: "Linh", onSaved: vi.fn(), onRefresh: vi.fn(), onSignedOut: vi.fn() }));
  tree.find(n => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
