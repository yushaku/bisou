import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Journal } from "../src/client/screens/Journal";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
import { NoteForm, NoteSheet } from "../src/client/components/bisou/NoteSheet";
import { BottomBar } from "../src/client/components/bisou/AppShell";
import { DrawerContent, DrawerHeader, DrawerTitle } from "../src/client/components/ui/drawer";
import { vi as vietnamese } from "../src/client/i18n/vi";
import { en as english } from "../src/client/i18n/en";
import { JournalComposeSheet } from "../src/client/components/bisou/JournalComposeSheet";
import { ComposeForm, ComposeSheet } from "../src/client/components/bisou/ComposeSheet";
import { ComposeBody, ComposeFooter } from "../src/client/components/bisou/ComposeLayout";
import { PhotoPicker } from "../src/client/components/bisou/PhotoPicker";
import { PersonAvatar } from "../src/client/components/bisou/CoupleAvatars";
import { DayField } from "../src/client/components/bisou/DayField";
import { Tabs, TabsContent, TabsTrigger } from "../src/client/components/ui/tabs";
import { Dialog } from "../src/client/components/ui/dialog";
import { api } from "../src/client/api";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, refs: [] as { current: unknown }[], refIndex: 0, locale: "vi", effects: [] as (() => unknown)[], requests: new Map<string, () => void>() }));
const notesRefresh = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  },
  useRef: (initial: unknown) => hooks.refs[hooks.refIndex++] ?? (hooks.refs[hooks.refIndex - 1] = { current: initial }),
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useId: () => "test",
  useLayoutEffect: vi.fn(), useContext: () => null, useCallback: <T,>(callback: T) => callback,
  useImperativeHandle: (ref: { current: unknown } | undefined, create: () => unknown) => { if (ref) ref.current = create(); },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/lib/useNotes", () => ({ useNotes: () => ({ lists: { fromMe: [], toMe: [] }, failed: false, refresh: notesRefresh }) }));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ locale: hooks.locale, t: (key: keyof typeof vietnamese) => (hooks.locale === "vi" ? vietnamese : english)[key] }) }));

vi.mock("../src/client/lib/useTabNavigation", async (original) => ({ ...await original<typeof import("../src/client/lib/useTabNavigation")>(), useCreateRequest: (destination: string, onOpen: () => void) => { hooks.requests.set(destination, onOpen); } }));

vi.mock("../src/client/components/bisou/useUploadQueue", () => ({ useUploadQueue: () => ({ items: [], saved: vi.fn() }) }));

type Props = { expandedPhotos?: boolean; expandedEmpty?: boolean; className?: string; id?: string; "aria-describedby"?: string; initialTab?: "feed" | "notes"; forceMount?: boolean; hidden?: boolean; disabled?: boolean; onLock?: (lock: "dirty" | "saving" | null) => void; onClose?: () => void; onDone?: () => void; onSaved?: (entry: never) => void; onNoteSaved?: (note: never) => void; onOpenChange?: (open: boolean) => void; onValueChange?: (value: string) => void; onEscapeKeyDown?: (event: { preventDefault: () => void }) => void; ref?: { current: { refresh: () => Promise<void> } | null }; onRefresh?: () => Promise<void>; value?: string; partnerName?: string; fromMenu?: boolean; author?: unknown; children?: ReactNode; label?: string; "aria-label"?: string; "data-create-button"?: boolean; onClick?: () => void; open?: boolean; onAnimationEnd?: (open: boolean) => void; onCloseAutoFocus?: (event: { preventDefault: () => void }) => void };
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
it.each(["vi", "en"])("Journal + opens the composer directly in %s", (locale) => {
  hooks.locale = locale;
  const create = vi.fn();
  render("journal", create).find(n => n.props["data-create-button"] !== undefined)!.props.onClick!();
  expect(create).toHaveBeenCalledWith("journal");
  expect(render("journal", create)[0]!.props.open).toBe(false);
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
  if (section === "notes") journal().find(n => n.type === Tabs)!.props.onValueChange!("notes");
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
it.each(["feed", "notes"] as const)("+ defaults to the current %s section without changing it", (section) => {
  journal().find(n => n.type === Tabs)!.props.onValueChange!(section);
  journal(); hooks.requests.get("journal")!();
  const tree = journal();
  expect(tree.find(n => n.type === Tabs)?.props.value).toBe(section);
  expect(tree.find(n => n.props.initialTab)?.props).toMatchObject({ initialTab: section, open: true });
});
it("saving each form selects its section", () => {
  journal(); hooks.requests.get("journal")!();
  journal().find(n => n.props.initialTab)!.props.onNoteSaved!({ state: "draft" } as never);
  expect(journal().find(n => n.type === Tabs)?.props.value).toBe("notes");
  journal().find(n => n.props.initialTab)!.props.onSaved!({ id: "entry", date: "2026-11-12", text: "hi", source: "partner", authorId: "a", createdAt: 1, updatedAt: 1, photoIds: [] } as never);
  expect(journal().find(n => n.type === Tabs)?.props.value).toBe("feed");
});
const composeProps = { open: true, initialTab: "feed" as const, partnerName: "Linh", onOpenChange: vi.fn(), onSaved: vi.fn(), onNoteSaved: vi.fn(), onSignedOut: vi.fn() };
function composer() { hooks.index = 0; return nodes(JournalComposeSheet(composeProps)); }
it.each(["vi", "en"])("the compose sheet has both mounted tabs in %s", (locale) => {
  hooks.locale = locale;
  let tree = composer();
  expect(tree.filter(n => n.type === TabsTrigger).map(n => n.props.children)).toEqual(locale === "vi" ? ["Nhật ký", "Lời nhắn nhỏ"] : ["Journal", "Kind note"]);
  const before = tree.filter(n => n.type === TabsContent);
  tree.find(n => n.type === Tabs)!.props.onValueChange!("notes");
  tree = composer();
  expect(tree.find(n => n.type === DrawerContent)?.props["aria-label"]).toBe(locale === "vi" ? "Lời nhắn nhỏ" : "Kind note");
  const after = tree.filter(n => n.type === TabsContent);
  expect(after.map(n => n.props.forceMount)).toEqual([true, true]);
  expect(after.map(n => n.props.hidden)).toEqual([true, false]);
  expect(after.map(n => (n.props.children as ReactElement).type)).toEqual(before.map(n => (n.props.children as ReactElement).type));
});
it("only the tabbed journal opts into the expanded photo picker", () => {
  expect(composer().find(n => n.type === ComposeForm)?.props.expandedPhotos).toBe(true);
  const props = { partnerName: "Linh", onSaved: vi.fn(), onSignedOut: vi.fn(), onLock: vi.fn(), onClose: vi.fn(), onDone: vi.fn() };
  hooks.values = []; hooks.index = 0;
  expect(nodes(ComposeForm({ ...props, expandedPhotos: true })).find(n => n.type === PhotoPicker)?.props.expandedEmpty).toBe(true);
  hooks.values = []; hooks.index = 0;
  expect(nodes(ComposeForm(props)).find(n => n.type === PhotoPicker)?.props.expandedEmpty).toBe(false);
});
it.each([0, 1])("closing checks unsaved form %s, including the hidden tab", (index) => {
  composer().filter(n => n.props.onLock)[index]!.props.onLock!("dirty");
  let tree = composer();
  const preventDefault = vi.fn();
  tree.find(n => n.type === DrawerContent)!.props.onEscapeKeyDown!({ preventDefault });
  tree = composer();
  expect(tree.find(n => n.type === Dialog)?.props.open).toBe(true);
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("saving blocks tab switching and dismissal", () => {
  composer().find(n => n.props.onLock)!.props.onLock!("saving");
  const tree = composer();
  expect(tree.filter(n => n.type === TabsTrigger).every(n => n.props.disabled)).toBe(true);
  tree.find(n => n.props.onClose)!.props.onClose!();
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("saving asks before discarding a draft in the other tab", () => {
  composer().filter(n => n.props.onLock)[1]!.props.onLock!("dirty");
  composer().find(n => n.props.onDone)!.props.onDone!();
  expect(composer().find(n => n.type === Dialog)?.props.open).toBe(true);
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("closing the tabbed composer restores focus to +", () => {
  const focus = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  composer().find(n => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault: vi.fn() });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
it("the entry form has no author avatar and the day field has no removed helper", () => {
  const tree = nodes(ComposeForm({ partnerName: "Linh", onSaved: vi.fn(), onSignedOut: vi.fn(), onLock: vi.fn(), onClose: vi.fn(), onDone: vi.fn() }));
  expect(tree.some(n => n.type === PersonAvatar)).toBe(false);
  expect(tree.some(n => n.props.children === "An")).toBe(false);
  hooks.index = 0;
  const day = nodes(DayField({ value: "2026-11-12", now: Date.now(), onChange: vi.fn() }));
  expect(JSON.stringify(day)).not.toContain("-help");
  expect(vietnamese).not.toHaveProperty("compose.dayHelp");
  expect(english).not.toHaveProperty("compose.dayHelp");
});
it("closing a note created from + returns focus to +", () => {
  const focus = vi.fn(), preventDefault = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  const tree = nodes(NoteSheet({ open: true, fromMenu: true, onOpenChange: vi.fn(), partnerName: "Linh", onSaved: vi.fn(), onRefresh: vi.fn(), onSignedOut: vi.fn() }));
  tree.find(n => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

it("editing an entry and receiving a wish keep the single-form sheet", () => {
  const entry = { id: "entry", authorId: "a", date: "2026-11-12", text: "hi", source: "partner" as const, photoIds: [], createdAt: 1, updatedAt: 1 };
  const props = { open: true, onOpenChange: vi.fn(), partnerName: "Linh", onSaved: vi.fn(), onSignedOut: vi.fn() };
  expect(nodes(ComposeSheet({ ...props, entry })).some(n => n.type === Tabs)).toBe(false);
  hooks.index = 0;
  const wish = { id: "w", title: "A book", price: null, link: null, priority: 2 as const, photoId: null, status: "open" as const, receivedOn: null, note: null, createdAt: 1, updatedAt: 1 };
  expect(nodes(ComposeSheet({ ...props, receiving: wish })).some(n => n.type === Tabs)).toBe(false);
});

it.each(["vi", "en"])("shared composer forms keep only screen reader titles in %s", (locale) => {
  hooks.locale = locale;
  const props = { partnerName: "Linh", onSaved: vi.fn(), onSignedOut: vi.fn(), onLock: vi.fn(), onClose: vi.fn(), onDone: vi.fn() };
  const journal = nodes(ComposeForm(props));
  expect(journal.find(n => n.type === DrawerTitle)?.props).toMatchObject({ className: "sr-only", children: (locale === "vi" ? vietnamese : english)["compose.new"] });
  expect(journal.some(n => n.type === DrawerHeader)).toBe(false);
  expect(journal.some(n => n.props.id === "test-hint" || n.props.id === "test-counter")).toBe(false);
  expect(journal.some(n => n.props["aria-describedby"]?.includes("test-hint") || n.props["aria-describedby"]?.includes("test-counter"))).toBe(false);
  hooks.values = []; hooks.index = 0;
  const note = nodes(NoteForm({ ...props, onRefresh: vi.fn() }));
  expect(note.find(n => n.type === DrawerTitle)?.props.className).toBe("sr-only");
  expect(note.some(n => n.type === DrawerHeader)).toBe(false);
  expect(note.some(n => n.props.children === (locale === "vi" ? vietnamese : english)["common.close"])).toBe(false);
  expect(note.find(n => n.type === "form")?.props.className).toBe(journal.find(n => n.type === "form")?.props.className);
  for (const form of [journal, note]) {
    expect(form.filter(n => n.type === ComposeBody)).toHaveLength(1);
    expect(form.filter(n => n.type === ComposeFooter)).toHaveLength(1);
  }
});
