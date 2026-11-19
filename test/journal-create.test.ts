import { flushQueryWork } from "./query-fixture";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Journal } from "../src/client/screens/Journal";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
import { Card } from "../src/client/components/ui/card";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
import { ClosedNoteSheet } from "../src/client/components/bisou/ClosedNoteSheet";
import { CloseFields, NoteCloseSheet } from "../src/client/components/bisou/NoteCloseSheet";
import type { Locale, NoteLists } from "../src/shared/types";
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
import { ToggleGroup } from "../src/client/components/ui/toggle-group";
import { Textarea } from "../src/client/components/ui/textarea";
import { Input } from "../src/client/components/ui/input";
import { toast } from "../src/client/components/ui/ding-toaster";
import { api } from "../src/client/api";
import { formatDay, formatTime } from "../src/client/lib/format";

// Date text comes from the runtime ICU data, which differs between Node versions.
const at = (epochMs: number, locale: Locale) =>
  `${formatDay(new Date(epochMs), locale)} ${formatTime(epochMs, locale)}`;

interface Hooks {
  values: unknown[];
  index: number;
  refs: { current: unknown }[];
  refIndex: number;
  locale: string;
  notes: NoteLists;
  effects: (() => unknown)[];
  memory: null | { journalSection: "feed" | "notes" };
  requests: Map<string, () => void>;
}
const hooks = vi.hoisted((): Hooks => ({
  values: [],
  index: 0,
  refs: [],
  refIndex: 0,
  locale: "vi",
  notes: { fromMe: [], toMe: [] },
  effects: [],
  memory: null,
  requests: new Map(),
}));
const notesRefresh = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [
      hooks.values[index],
      (value: unknown) => {
        hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => hooks.refs[hooks.refIndex++] ?? (hooks.refs[hooks.refIndex - 1] = { current: initial }),
  useInsertionEffect: vi.fn(),
  useEffect: (effect: () => unknown) => {
    hooks.effects.push(effect);
  },
  useId: () => "test",
  useLayoutEffect: (effect: () => unknown) => {
    hooks.effects.push(effect);
  },
  useContext: () => hooks.memory,
  useCallback: <T>(callback: T) => callback,
  useMemo: <T>(create: () => T) => create(),
  useImperativeHandle: (ref: { current: unknown } | undefined, create: () => unknown) => {
    if (ref) ref.current = create();
  },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/lib/useNotes", () => ({
  useNotes: () => ({ lists: hooks.notes, failed: false, refresh: notesRefresh }),
}));
vi.mock("../src/client/i18n", () => ({
  useI18n: () => ({
    locale: hooks.locale,
    t: (key: keyof typeof vietnamese, vars?: Record<string, string | number>) => {
      let text: string = (hooks.locale === "vi" ? vietnamese : english)[key];
      for (const [name, value] of Object.entries(vars ?? {})) text = text.replaceAll(`{${name}}`, String(value));
      return text;
    },
  }),
}));

vi.mock("../src/client/lib/useTabNavigation", async (original) => ({
  ...(await original<typeof import("../src/client/lib/useTabNavigation")>()),
  useCreateRequest: (destination: string, onOpen: () => void) => {
    hooks.requests.set(destination, onOpen);
  },
}));

vi.mock("../src/client/components/bisou/useUploadQueue", () => ({
  useUploadQueue: () => ({ items: [], saved: vi.fn() }),
}));

interface Props {
  entry?: { id: string } | null;
  own?: boolean;
  onSubmit?: (event: { preventDefault: () => void }) => void;
  onChange?: (event: { target: { value: string } }) => void;
  type?: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  initialTab?: "feed" | "notes";
  forceMount?: boolean;
  hidden?: boolean;
  inert?: boolean;
  "aria-hidden"?: boolean;
  disabled?: boolean;
  onLock?: (lock: "dirty" | "saving" | null) => void;
  onClose?: () => void;
  onDone?: () => void;
  onSaved?: (entry: never) => void;
  onNoteSaved?: (note: never) => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: string) => void;
  onPointerDownOutside?: (event: { preventDefault: () => void }) => void;
  onEscapeKeyDown?: (event: { preventDefault: () => void }) => void;
  ref?: { current: { refresh: () => Promise<void> } | null };
  onRefresh?: () => Promise<void>;
  value?: unknown;
  partnerName?: string;
  fromMenu?: boolean;
  author?: unknown;
  children?: ReactNode;
  label?: string;
  "aria-label"?: string;
  "data-create-button"?: boolean;
  onClick?: () => void;
  open?: boolean;
  onAnimationEnd?: (open: boolean) => void;
  onCloseAutoFocus?: (event: { preventDefault: () => void }) => void;
}
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
function render(active: "journal" | "home" | "garden" | "wishes", onCreate = vi.fn()) {
  hooks.index = 0;
  hooks.refIndex = 0;
  return nodes(BottomBar({ active, onCreate, onSelect: vi.fn() }));
}
afterEach(() => {
  hooks.values = [];
  hooks.refs = [];
  hooks.locale = "vi";
  hooks.effects = [];
  hooks.requests.clear();
  hooks.memory = null;
  hooks.notes = { fromMe: [], toMe: [] };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  notesRefresh.mockReset();
});
it.each(["vi", "en"])("Journal + opens the composer directly in %s", (locale) => {
  hooks.locale = locale;
  const create = vi.fn();
  render("journal", create).find((n) => n.props["data-create-button"] !== undefined)!.props.onClick!();
  expect(create).toHaveBeenCalledWith("journal");
  expect(render("journal", create)[0]!.props.open).toBe(false);
});
it.each([
  ["home", "event"],
  ["wishes", "wishes"],
] as const)("%s + still opens %s directly", (tab, destination) => {
  const create = vi.fn();
  render(tab, create).find((n) => n.props["data-create-button"] !== undefined)!.props.onClick!();
  expect(create).toHaveBeenCalledWith(destination);
});
it("Garden create menu keeps only journal and wish rows", () => {
  expect(
    render("garden")
      .filter((n) => n.props.label)
      .map((n) => n.props.label),
  ).toEqual(["Viết nhật ký", "Thêm điều ước"]);
});
it("closing the create menu returns focus to +", () => {
  const focus = vi.fn(),
    preventDefault = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  render("journal").find((n) => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

const user = {
  id: "a",
  displayName: "An",
  email: "an@example.com",
  locale: "vi" as const,
  birthDate: null,
  avatarId: null,
  createdAt: 1,
};
const couple = { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Linh" }] };
function journal() {
  hooks.index = 0;
  hooks.refIndex = 0;
  return nodes(Journal({ user, couple, onSignedOut: vi.fn(), onUser: vi.fn() }));
}
it.each(["feed", "notes"])("pulling on %s refreshes its data and waits for completion", async (section) => {
  const feedRefresh = vi.spyOn(api, "journal").mockResolvedValue({ ok: true, data: { entries: [], nextCursor: null } });
  journal();
  if (section === "notes") journal().find((n) => n.type === Tabs)!.props.onValueChange!("notes");
  const tree = journal();
  const notes = tree.find((n) => n.type === NotesSection)!;
  hooks.values = [];
  hooks.index = 0;
  hooks.refIndex = 0;
  NotesSection({ user, couple, onSignedOut: vi.fn(), ref: notes.props.ref });
  let finish!: () => void;
  notesRefresh.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  let done = false;
  const pending = tree[0]!.props.onRefresh!().then(() => {
    done = true;
  });
  expect(feedRefresh).toHaveBeenCalledOnce();
  if (section === "notes") {
    expect(notesRefresh).toHaveBeenCalledOnce();
    await flushQueryWork();
    expect(done).toBe(false);
    finish();
  } else expect(notesRefresh).not.toHaveBeenCalled();
  await pending;
  expect(done).toBe(true);
});
it.each(["feed", "notes"] as const)("+ defaults to the current %s section without changing it", (section) => {
  journal().find((n) => n.type === Tabs)!.props.onValueChange!(section);
  journal();
  hooks.requests.get("journal")!();
  const tree = journal();
  expect(tree.find((n) => n.type === Tabs)?.props.value).toBe(section);
  expect(tree.find((n) => n.props.initialTab)?.props).toMatchObject({ initialTab: section, open: true });
});
it("saving each form selects its section", () => {
  journal();
  hooks.requests.get("journal")!();
  journal().find((n) => n.props.initialTab)!.props.onNoteSaved!({ state: "draft" } as never);
  expect(journal().find((n) => n.type === Tabs)?.props.value).toBe("notes");
  journal().find((n) => n.props.initialTab)!.props.onSaved!({
    id: "entry",
    date: "2026-11-12",
    text: "hi",
    source: "partner",
    authorId: "a",
    createdAt: 1,
    updatedAt: 1,
    photoIds: [],
  } as never);
  expect(journal().find((n) => n.type === Tabs)?.props.value).toBe("feed");
});
const composeProps = {
  open: true,
  initialTab: "feed" as const,
  partnerName: "Linh",
  onOpenChange: vi.fn(),
  onSaved: vi.fn(),
  onNoteSaved: vi.fn(),
  onSignedOut: vi.fn(),
};
function composer() {
  hooks.index = 0;
  return nodes(JournalComposeSheet(composeProps));
}
it.each(["vi", "en"])("the compose sheet has both mounted tabs in %s", (locale) => {
  hooks.locale = locale;
  let tree = composer();
  expect(tree.filter((n) => n.type === TabsTrigger).map((n) => n.props.children)).toEqual(
    locale === "vi" ? ["Nhật ký", "Lời nhắn nhỏ"] : ["Journal", "Kind note"],
  );
  const before = tree.filter((n) => n.type === TabsContent);
  tree.find((n) => n.type === Tabs)!.props.onValueChange!("notes");
  tree = composer();
  expect(tree.find((n) => n.type === DrawerContent)?.props["aria-label"]).toBe(
    locale === "vi" ? "Lời nhắn nhỏ" : "Kind note",
  );
  const after = tree.filter((n) => n.type === TabsContent);
  expect(after.map((n) => n.props.forceMount)).toEqual([true, true]);
  expect(after.map((n) => n.props.inert)).toEqual([true, false]);
  expect(after.map((n) => n.props["aria-hidden"])).toEqual([true, false]);
  expect(after.every((n) => n.props.className?.includes("[grid-area:1/1]"))).toBe(true);
  expect(after.map((n) => (n.props.children as ReactElement).type)).toEqual(
    before.map((n) => (n.props.children as ReactElement).type),
  );
});
it("the journal photo picker stays a normal button", () => {
  const picker = nodes(
    PhotoPicker({
      queue: { items: [], add: vi.fn(), retry: vi.fn(), remove: vi.fn(), saved: vi.fn() },
      max: 4,
      saving: false,
      onChange: vi.fn(),
    }),
  );
  expect(
    picker.find(
      (n) =>
        n.props.children && Array.isArray(n.props.children) && n.props.children.includes(vietnamese["compose.add"]),
    )?.props.className,
  ).toBe("h-12");
});
it.each([0, 1])("closing checks unsaved form %s, including the hidden tab", (index) => {
  composer().filter((n) => n.props.onLock)[index]!.props.onLock!("dirty");
  let tree = composer();
  const preventDefault = vi.fn();
  tree.find((n) => n.type === DrawerContent)!.props.onEscapeKeyDown!({ preventDefault });
  tree = composer();
  expect(tree.find((n) => n.type === Dialog)?.props.open).toBe(true);
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("saving blocks tab switching and dismissal", () => {
  composer().find((n) => n.props.onLock)!.props.onLock!("saving");
  const tree = composer();
  expect(tree.filter((n) => n.type === TabsTrigger).every((n) => n.props.disabled)).toBe(true);
  tree.find((n) => n.props.onClose)!.props.onClose!();
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("saving asks before discarding a draft in the other tab", () => {
  composer().filter((n) => n.props.onLock)[1]!.props.onLock!("dirty");
  composer().find((n) => n.props.onDone)!.props.onDone!();
  expect(composer().find((n) => n.type === Dialog)?.props.open).toBe(true);
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});
it("closing the tabbed composer restores focus to +", () => {
  const focus = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  composer().find((n) => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault: vi.fn() });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
it("the entry form has no author avatar and the day field has no removed helper", () => {
  const tree = nodes(
    ComposeForm({
      partnerName: "Linh",
      onSaved: vi.fn(),
      onSignedOut: vi.fn(),
      onLock: vi.fn(),
      onClose: vi.fn(),
      onDone: vi.fn(),
    }),
  );
  expect(tree.some((n) => n.type === PersonAvatar)).toBe(false);
  expect(tree.some((n) => n.props.children === "An")).toBe(false);
  hooks.index = 0;
  const day = nodes(DayField({ value: "2026-11-12", now: Date.now(), onChange: vi.fn() }));
  expect(JSON.stringify(day)).not.toContain("-help");
  expect(vietnamese).not.toHaveProperty("compose.dayHelp");
  expect(english).not.toHaveProperty("compose.dayHelp");
});
it("closing a note created from + returns focus to +", () => {
  const focus = vi.fn(),
    preventDefault = vi.fn();
  vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  const tree = nodes(
    NoteSheet({
      open: true,
      fromMenu: true,
      onOpenChange: vi.fn(),
      partnerName: "Linh",
      onSaved: vi.fn(),
      onRefresh: vi.fn(),
      onSignedOut: vi.fn(),
    }),
  );
  tree.find((n) => n.type === DrawerContent)!.props.onCloseAutoFocus!({ preventDefault });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

it("editing an entry and receiving a wish keep the single-form sheet", () => {
  const entry = {
    id: "entry",
    authorId: "a",
    date: "2026-11-12",
    text: "hi",
    source: "partner" as const,
    photoIds: [],
    createdAt: 1,
    updatedAt: 1,
  };
  const props = { open: true, onOpenChange: vi.fn(), partnerName: "Linh", onSaved: vi.fn(), onSignedOut: vi.fn() };
  expect(nodes(ComposeSheet({ ...props, entry })).some((n) => n.type === Tabs)).toBe(false);
  hooks.index = 0;
  const wish = {
    id: "w",
    title: "A book",
    price: null,
    link: null,
    priority: 2 as const,
    photoId: null,
    status: "open" as const,
    receivedOn: null,
    note: null,
    createdAt: 1,
    updatedAt: 1,
  };
  expect(nodes(ComposeSheet({ ...props, receiving: wish })).some((n) => n.type === Tabs)).toBe(false);
});

it.each(["vi", "en"])("composer forms expose a guarded exit and named writing context in %s", (locale) => {
  hooks.locale = locale;
  const props = {
    partnerName: "Linh",
    onSaved: vi.fn(),
    onSignedOut: vi.fn(),
    onLock: vi.fn(),
    onClose: vi.fn(),
    onDone: vi.fn(),
  };
  const journal = nodes(ComposeForm(props));
  expect(journal.find((n) => n.type === DrawerTitle)?.props).toMatchObject({
    children: (locale === "vi" ? vietnamese : english)["compose.new"],
  });
  expect(journal.some((n) => n.type === DrawerHeader)).toBe(true);
  journal.find((n) => n.props.children === (locale === "vi" ? "Đóng" : "Close"))!.props.onClick!();
  expect(props.onClose).toHaveBeenCalledOnce();
  expect(journal.some((n) => typeof n.props.children === "string" && n.props.children.includes("Linh"))).toBe(true);
  expect(journal.some((n) => n.props.id === "test-hint" || n.props.id === "test-counter")).toBe(false);
  expect(
    journal.some(
      (n) =>
        n.props["aria-describedby"]?.includes("test-hint") === true ||
        n.props["aria-describedby"]?.includes("test-counter") === true,
    ),
  ).toBe(false);
  hooks.values = [];
  hooks.index = 0;
  const note = nodes(NoteForm({ ...props, onRefresh: vi.fn() }));
  expect(note.find((n) => n.type === DrawerTitle)?.props.className).not.toBe("sr-only");
  expect(note.some((n) => n.type === DrawerHeader)).toBe(true);
  expect(
    note.some(
      (n) =>
        n.props.children ===
        (locale === "vi" ? "Viết đủ bốn phần trước khi gửi nhé" : "Fill in all four parts before sending"),
    ),
  ).toBe(true);
  expect(note.some((n) => typeof n.props.children === "string" && n.props.children.includes("Linh"))).toBe(true);
  note.find((n) => n.props.children === (locale === "vi" ? "Đóng" : "Close"))!.props.onClick!();
  expect(props.onClose).toHaveBeenCalledTimes(2);
  expect(note.find((n) => n.type === "form")?.props.className).toBe(
    journal.find((n) => n.type === "form")?.props.className,
  );
  for (const form of [journal, note]) {
    expect(form.filter((n) => n.type === ComposeBody)).toHaveLength(1);
    expect(form.filter((n) => n.type === ComposeFooter)).toHaveLength(1);
  }
});

it.each(["now", "eightHours", "custom"] as const)("note composer submits %s delivery", async (delivery) => {
  vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 17, 20, 0).getTime());
  hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
  const created = vi.spyOn(api, "createNote").mockResolvedValue({
    ok: true,
    data: { note: { id: "n", happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk", state: "draft" } },
  });
  const props = {
    partnerName: "Linh",
    onSaved: vi.fn(),
    onRefresh: vi.fn(),
    onSignedOut: vi.fn(),
    onLock: vi.fn(),
    onClose: vi.fn(),
    onDone: vi.fn(),
  };
  const render = () => {
    hooks.index = 0;
    return nodes(NoteForm(props));
  };
  let form = render();
  form.find((n) => n.type === ToggleGroup)!.props.onValueChange!(delivery);
  form = render();
  const custom = "2099-11-13T06:30";
  if (delivery === "custom") {
    form.find((n) => n.type === Input && n.props.type === "datetime-local")!.props.onChange!({
      target: { value: custom },
    });
    form = render();
  }
  form.find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(created).toHaveBeenCalledWith({
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    delivery,
    ...(delivery === "custom" ? { sendAt: new Date(custom).getTime() } : {}),
  });
  expect(props.onSaved).toHaveBeenCalled();
});

it("changing custom delivery to a past date keeps the note in the form", async () => {
  hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
  const create = vi.spyOn(api, "createNote");
  const props = {
    partnerName: "Linh",
    onSaved: vi.fn(),
    onRefresh: vi.fn(),
    onSignedOut: vi.fn(),
    onLock: vi.fn(),
    onClose: vi.fn(),
    onDone: vi.fn(),
  };
  const render = () => {
    hooks.index = 0;
    return nodes(NoteForm(props));
  };
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("custom");
  render().find((n) => n.type === Input)!.props.onChange!({ target: { value: "2000-01-01T00:00" } });
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  expect(create).not.toHaveBeenCalled();
  expect(props.onDone).not.toHaveBeenCalled();
  expect(render().some((n) => n.props.children === vietnamese["notes.scheduleError"])).toBe(true);
});

it.each([false, true])("editing a scheduled note preserves delivery unless changed (send now: %s)", async (sendNow) => {
  const entry = {
    id: "n",
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    state: "draft" as const,
    scheduledAt: new Date("2099-11-13T06:30").getTime(),
  };
  const update = vi.spyOn(api, "updateNote").mockResolvedValue({ ok: true, data: { note: entry } });
  const props = {
    entry,
    partnerName: "Linh",
    onSaved: vi.fn(),
    onRefresh: vi.fn(),
    onSignedOut: vi.fn(),
    onLock: vi.fn(),
    onClose: vi.fn(),
    onDone: vi.fn(),
  };
  const render = () => {
    hooks.index = 0;
    return nodes(NoteForm(props));
  };
  let form = render();
  expect(form.find((n) => n.type === Input)!.props.value).toBe("2099-11-13T06:30");
  if (sendNow) {
    form.find((n) => n.type === ToggleGroup)!.props.onValueChange!("now");
    form = render();
  }
  form.find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(update).toHaveBeenCalledWith("n", { ...entry, ...(sendNow ? { delivery: "now" } : {}) });
});

it("returning from Home's notes shortcut selects notes in an already visited Journal", () => {
  hooks.memory = { journalSection: "feed" };
  vi.stubGlobal("window", { location: { href: "http://localhost/journal", search: "" } });
  journal();
  hooks.effects = [];
  hooks.memory.journalSection = "notes";
  journal();
  for (const effect of hooks.effects.splice(0)) effect();
  expect(journal().find((n) => n.type === Tabs)?.props.value).toBe("notes");
});

it("a notes deep link wins over the default feed memory without StrictMode replay", () => {
  hooks.memory = { journalSection: "feed" };
  vi.stubGlobal("window", { location: { href: "http://localhost/journal?section=notes", search: "?section=notes" } });
  const replaceState = vi.fn();
  vi.stubGlobal("history", { state: null, replaceState });
  journal();
  for (const effect of hooks.effects.splice(0)) effect();
  expect(journal().find((n) => n.type === Tabs)?.props.value).toBe("notes");
  expect(replaceState).toHaveBeenCalledWith(null, "", new URL("http://localhost/journal"));
});

it.each([0, 1])("visible composer exit checks dirty form %s", (index) => {
  composer().filter((n) => n.props.onLock)[index]!.props.onLock!("dirty");
  const child = composer().filter((n) => n.props.onLock)[index]!;
  const parentValues = hooks.values;
  hooks.values = [];
  hooks.index = 0;
  const props = {
    partnerName: "Linh",
    onSaved: vi.fn(),
    onSignedOut: vi.fn(),
    onRefresh: vi.fn(),
    onLock: child.props.onLock!,
    onClose: child.props.onClose!,
    onDone: child.props.onDone!,
  };
  const form = nodes(index ? NoteForm(props) : ComposeForm(props));
  hooks.values = parentValues;
  form.find((n) => n.props.children === "Đóng")!.props.onClick!();
  expect(composer().find((n) => n.type === Dialog)?.props.open).toBe(true);
  expect(composeProps.onOpenChange).not.toHaveBeenCalled();
});

it.each(["vi", "en"])("closing explains the shared journal, required message and later action in %s", (locale) => {
  hooks.locale = locale;
  const tree = nodes(NoteCloseSheet({ id: "n", onClose: vi.fn(), onClosed: vi.fn(), onSignedOut: vi.fn() }));
  const copy =
    locale === "vi"
      ? ["Để sau", "Khép lại để lưu vào nhật ký chung. Cả hai có thể sửa bài sau đó."]
      : ["Later", "Close to save this in our shared journal. Either of you can edit the entry later."];
  for (const text of copy) expect(tree.some((n) => n.props.children === text)).toBe(true);
  expect(tree.find((n) => n.props.type === "submit")?.props.disabled).toBe(true);
  const fields = nodes(CloseFields({ value: { line: "" }, onChange: vi.fn() }));
  expect(fields.some((n) => n.props.children === (locale === "vi" ? "Gợi ý nhanh" : "Quick replies"))).toBe(true);
  expect(fields.some((n) => n.props.children === (locale === "vi" ? "Lời nhắn" : "Message"))).toBe(true);
  expect(fields.filter((n) => n.props.onClick)).toHaveLength(3);
});

it.each(["button", "escape", "outside", "swipe"])(
  "unfinished closing response survives %s dismissal until discard",
  (route) => {
    const props = { id: "n", onClose: vi.fn(), onClosed: vi.fn(), onSignedOut: vi.fn() };
    const render = () => {
      hooks.index = 0;
      return nodes(NoteCloseSheet(props));
    };
    const child: ReactNode = render().find((n) => n.type === CloseFields);
    if (!isValidElement<Parameters<typeof CloseFields>[0]>(child)) throw new Error("Missing close fields");
    child.props.onChange({ line: "I hear you" });
    const tree = render();
    if (route === "button") tree.find((n) => n.props.children === "Để sau")!.props.onClick!();
    if (route === "escape")
      tree.find((n) => n.type === DrawerContent)!.props.onEscapeKeyDown!({ preventDefault: vi.fn() });
    if (route === "outside")
      tree.find((n) => n.type === DrawerContent)!.props.onPointerDownOutside!({ preventDefault: vi.fn() });
    if (route === "swipe") tree[0]!.props.onOpenChange!(false);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(render().find((n) => n.type === Dialog)?.props.open).toBe(true);
    render().find((n) => n.props.children === vietnamese["compose.keep"])!.props.onClick!();
    expect(render().find((n) => n.type === CloseFields)?.props.value).toEqual({ line: "I hear you" });
    render().find((n) => n.props.children === "Để sau")!.props.onClick!();
    render().find((n) => n.props.children === vietnamese["compose.discard"])!.props.onClick!();
    expect(props.onClose).toHaveBeenCalledOnce();
  },
);

it.each(["vi", "en"] as const)(
  "eight hours resolves locally before saving and success uses the server schedule in %s",
  async (locale) => {
    hooks.locale = locale;
    hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 17, 20, 0).getTime());
    const note = {
      id: "n",
      happened: "Yesterday",
      feel: "Sad",
      need: "Time",
      hope: "Talk",
      state: "draft" as const,
      scheduledAt: new Date(2026, 10, 18, 4, 1).getTime(),
    };
    vi.spyOn(api, "createNote").mockResolvedValue({ ok: true, data: { note } });
    const success = vi.spyOn(toast, "success").mockImplementation(() => "toast");
    const props = {
      partnerName: "Linh",
      onSaved: vi.fn(),
      onRefresh: vi.fn(),
      onSignedOut: vi.fn(),
      onLock: vi.fn(),
      onClose: vi.fn(),
      onDone: vi.fn(),
    };
    const render = () => {
      hooks.index = 0;
      return nodes(NoteForm(props));
    };
    render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("eightHours");
    expect(
      render().some(
        (n) =>
          n.props.children ===
          (locale === "vi" ? "Hẹn gửi " : "Scheduled for ") + at(new Date(2026, 10, 18, 4, 0).getTime(), locale),
      ),
    ).toBe(true);
    render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
    await flushQueryWork();
    expect(success).toHaveBeenCalledExactlyOnceWith(
      (locale === "vi" ? "Đã hẹn gửi lúc " : "Scheduled for ") + at(note.scheduledAt, locale),
    );
  },
);

it.each(["vi", "en"])("scheduled deletion names the scheduled note without calling it a draft in %s", (locale) => {
  hooks.locale = locale;
  const entry = {
    id: "n",
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    state: "draft" as const,
    scheduledAt: new Date(2099, 10, 18, 4, 0).getTime(),
  };
  const tree = nodes(
    NoteForm({
      entry,
      partnerName: "Linh",
      onSaved: vi.fn(),
      onRefresh: vi.fn(),
      onSignedOut: vi.fn(),
      onLock: vi.fn(),
      onClose: vi.fn(),
      onDone: vi.fn(),
    }),
  );
  expect(
    tree.some(
      (n) => n.props.children === (locale === "vi" ? "Xoá lời nhắn đã hẹn gửi này?" : "Delete this scheduled note?"),
    ),
  ).toBe(true);
  expect(
    tree.some(
      (n) =>
        n.props.children ===
        (locale === "vi"
          ? "Lời nhắn sẽ mất hẳn và không được gửi. Người ấy sẽ không biết về lời nhắn này."
          : "The note will be gone for good and will not be sent. Your partner will never know about it."),
    ),
  ).toBe(true);
  expect(tree.some((n) => n.props.children === (locale === "vi" ? "Xoá bản nháp này?" : "Delete this draft?"))).toBe(
    false,
  );
});

it.each(["vi", "en"])(
  "schedule validation is beside and linked to the input, then scrolled into view in %s",
  (locale) => {
    hooks.locale = locale;
    hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
    const create = vi.spyOn(api, "createNote");
    const render = () => {
      hooks.index = 0;
      hooks.refIndex = 0;
      return nodes(
        NoteForm({
          partnerName: "Linh",
          onSaved: vi.fn(),
          onRefresh: vi.fn(),
          onSignedOut: vi.fn(),
          onLock: vi.fn(),
          onClose: vi.fn(),
          onDone: vi.fn(),
        }),
      );
    };
    render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("custom");
    render().find((n) => n.type === Input)!.props.onChange!({ target: { value: "2000-01-01T00:00" } });
    const focus = vi.fn(),
      scrollIntoView = vi.fn();
    hooks.refs[0]!.current = { querySelector: () => ({ focus }), scrollIntoView };
    render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
    const tree = render();
    expect(create).not.toHaveBeenCalled();
    expect(tree.find((n) => n.type === Input)?.props["aria-describedby"]).toBe("test-schedule-error");
    const fieldset = tree.find((n) => n.type === "fieldset")!;
    expect(nodes(fieldset).find((n) => n.props.id === "test-schedule-error")?.props.children).toBe(
      (locale === "vi" ? vietnamese : english)["notes.scheduleError"],
    );

    render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
    expect(focus).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "instant" });
  },
);

it.each(["vi", "en"])(
  "failed opening names the action and allows retry without asserting note state in %s",
  async (locale) => {
    hooks.locale = locale;
    hooks.notes = { fromMe: [], toMe: [{ id: "n", state: "waiting" }] };
    const open = vi.spyOn(api, "openNote").mockResolvedValue({ ok: false, status: 503, error: null });
    const error = vi.spyOn(toast, "error").mockImplementation(() => "toast");
    const render = () => {
      hooks.index = 0;
      hooks.refIndex = 0;
      return nodes(NotesSection({ user, couple, onSignedOut: vi.fn() }));
    };
    const click = () =>
      render().find((n) => n.props.children === (locale === "vi" ? "Mình sẵn sàng nghe" : "I'm ready to listen"))!.props
        .onClick!();
    click();
    await flushQueryWork();
    expect(error).toHaveBeenCalledWith(
      locale === "vi" ? "Chưa mở được lời nhắn. Thử lại nhé." : "Couldn't open the note. Please try again.",
    );
    expect(notesRefresh).toHaveBeenCalledOnce();
    click();
    await flushQueryWork();
    expect(open).toHaveBeenCalledTimes(2);
  },
);

it("eight-hour delivery remains server computed when submission is delayed", async () => {
  hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
  const now = vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 17, 20, 0).getTime());
  const create = vi.spyOn(api, "createNote").mockResolvedValue({ ok: false, status: 503, error: null });
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(
      NoteForm({
        partnerName: "Linh",
        onSaved: vi.fn(),
        onRefresh: vi.fn(),
        onSignedOut: vi.fn(),
        onLock: vi.fn(),
        onClose: vi.fn(),
        onDone: vi.fn(),
      }),
    );
  };
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("eightHours");
  now.mockReturnValue(new Date(2026, 10, 17, 20, 15).getTime());
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(create).toHaveBeenCalledWith({
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    delivery: "eightHours",
  });
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("now");
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("eightHours");
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(create).toHaveBeenLastCalledWith({
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    delivery: "eightHours",
  });
});

it.each(["draft", "sent"] as const)("saving a %s edit uses its current state for feedback", async (state) => {
  const note = {
    id: "n",
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    state,
    scheduledAt: state === "draft" ? new Date(2099, 10, 18, 4, 0).getTime() : undefined,
  };
  vi.spyOn(api, "updateNote").mockResolvedValue({ ok: true, data: { note } });
  const success = vi.spyOn(toast, "success").mockImplementation(() => "toast");
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(
      NoteForm({
        entry: note,
        partnerName: "Linh",
        onSaved: vi.fn(),
        onRefresh: vi.fn(),
        onSignedOut: vi.fn(),
        onLock: vi.fn(),
        onClose: vi.fn(),
        onDone: vi.fn(),
      }),
    );
  };
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(success).toHaveBeenCalledExactlyOnceWith(
    state === "draft" ? `Đã hẹn gửi lúc ${at(new Date(2099, 10, 18, 4, 0).getTime(), "vi")}` : "Đã gửi lời nhắn",
  );
});

it.each(["received", "scheduled", "draft", "sent", "opened"] as const)(
  "A5 whole-card action preserves the %s destination",
  (kind) => {
    const input = { happened: "Distinct note preview", feel: "Sad", need: "Time", hope: "Talk" };
    hooks.notes =
      kind === "received"
        ? { fromMe: [], toMe: [{ ...input, id: "n", state: "opened" }] }
        : {
            toMe: [],
            fromMe: [
              {
                ...input,
                id: "n",
                state: kind === "scheduled" || kind === "draft" ? "draft" : kind,
                ...(kind === "scheduled" ? { scheduledAt: new Date(2099, 10, 18, 19, 30).getTime() } : {}),
              },
            ],
          };
    const render = () => {
      hooks.index = 0;
      hooks.refIndex = 0;
      return nodes(NotesSection({ user, couple, onSignedOut: vi.fn() }));
    };
    const row = render().find((n) => n.type === "button")!;
    expect(row.props["aria-label"]).not.toContain(input.happened);
    row.props.onClick!();
    const tree = render();
    if (kind === "opened" || kind === "received") {
      expect(tree.find((n) => n.type === EntryActions && n.props.entry?.id === "n")?.props.own).toBe(false);
      expect(tree.some((n) => n.props.partnerName === "Linh" && n.props.open)).toBe(false);
    } else expect(tree.find((n) => n.props.partnerName === "Linh" && n.props.open)?.props.entry?.id).toBe("n");
  },
);

it("A5 waiting card stays passive and only Ready intentionally opens the note", async () => {
  hooks.notes = { fromMe: [], toMe: [{ id: "n", state: "waiting" }] };
  const open = vi.spyOn(api, "openNote").mockResolvedValue({
    ok: true,
    data: { note: { id: "n", state: "opened", happened: "Private", feel: "Sad", need: "Time", hope: "Talk" } },
  });
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(NotesSection({ user, couple, onSignedOut: vi.fn() }));
  };
  const tree = render();
  expect(tree.find((n) => n.type === Card)?.props.onClick).toBeUndefined();
  expect(open).not.toHaveBeenCalled();
  tree.find((n) => n.props.children === "Mình sẵn sàng nghe")!.props.onClick!();
  await flushQueryWork();
  expect(open).toHaveBeenCalledExactlyOnceWith("n");
  expect(render().find((n) => n.type === EntryActions && n.props.entry?.id === "n")).toBeDefined();
});

it("rechoosing eight hours on a scheduled note sends the server delivery choice", async () => {
  const entry = {
    id: "n",
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    state: "draft" as const,
    scheduledAt: new Date(2099, 10, 18, 4, 0).getTime(),
  };
  const update = vi.spyOn(api, "updateNote").mockResolvedValue({ ok: false, status: 503, error: null });
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(
      NoteForm({
        entry,
        partnerName: "Linh",
        onSaved: vi.fn(),
        onRefresh: vi.fn(),
        onSignedOut: vi.fn(),
        onLock: vi.fn(),
        onClose: vi.fn(),
        onDone: vi.fn(),
      }),
    );
  };
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("eightHours");
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await flushQueryWork();
  expect(update).toHaveBeenCalledExactlyOnceWith("n", { ...entry, delivery: "eightHours" });
});

it("schedule error placement survives switching locale after validation", () => {
  hooks.values = [{ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" }];
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(
      NoteForm({
        partnerName: "Linh",
        onSaved: vi.fn(),
        onRefresh: vi.fn(),
        onSignedOut: vi.fn(),
        onLock: vi.fn(),
        onClose: vi.fn(),
        onDone: vi.fn(),
      }),
    );
  };
  render().find((n) => n.type === ToggleGroup)!.props.onValueChange!("custom");
  render().find((n) => n.type === Input)!.props.onChange!({ target: { value: "2000-01-01T00:00" } });
  render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  hooks.locale = "en";
  expect(render().find((n) => n.type === Input)?.props["aria-describedby"]).toBe("test-schedule-error");
  expect(render().some((n) => n.props.id === "test-schedule-error")).toBe(true);
  render().find((n) => n.type === Input)!.props.onChange!({ target: { value: "2099-01-01T00:00" } });
  expect(render().find((n) => n.type === Input)?.props["aria-describedby"]).toBeUndefined();
});

it.each(["vi", "en"])("sample replies fill and append without replacing typed text in %s", (locale) => {
  hooks.locale = locale;
  let value = { line: "" };
  const render = () =>
    nodes(
      CloseFields({
        value,
        onChange: (next) => {
          value = next;
        },
      }),
    );
  const sample = (locale === "vi" ? vietnamese : english)["notes.sample.talk"];
  render().find((n) => n.props.children === sample)!.props.onClick!();
  expect(value.line).toBe(sample);
  value = { line: "My own words" };
  render().find((n) => n.props.children === sample)!.props.onClick!();
  expect(value.line).toBe(`My own words\n${sample}`);
  render().find((n) => n.type === Textarea)!.props.onChange!({ target: { value: "Edited freely" } });
  expect(value.line).toBe("Edited freely");
});

it.each(["", "   ", "x".repeat(501), "My own reply"])(
  "close validity depends on the required message: %s",
  async (line) => {
    const close = vi.spyOn(api, "closeNote").mockResolvedValue({ ok: false, status: 503, error: null });
    const render = () => {
      hooks.index = 0;
      hooks.refIndex = 0;
      return nodes(NoteCloseSheet({ id: "n", onClose: vi.fn(), onClosed: vi.fn(), onSignedOut: vi.fn() }));
    };
    const child: ReactNode = render().find((n) => n.type === CloseFields);
    if (!isValidElement<Parameters<typeof CloseFields>[0]>(child)) throw new Error("Missing fields");
    child.props.onChange({ line });
    expect(render().find((n) => n.props.type === "submit")?.props.disabled).toBe(
      line.trim().length === 0 || line.length > 500,
    );
    render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
    await flushQueryWork();
    if (line === "My own reply") expect(close).toHaveBeenCalledExactlyOnceWith("n", { line });
    else expect(close).not.toHaveBeenCalled();
  },
);

it("whitespace-only closing text dismisses without a dirty confirmation", () => {
  const onClose = vi.fn();
  const render = () => {
    hooks.index = 0;
    hooks.refIndex = 0;
    return nodes(NoteCloseSheet({ id: "n", onClose, onClosed: vi.fn(), onSignedOut: vi.fn() }));
  };
  const child: ReactNode = render().find((n) => n.type === CloseFields);
  if (!isValidElement<Parameters<typeof CloseFields>[0]>(child)) throw new Error("Missing fields");
  child.props.onChange({ line: "   " });
  render().find((n) => n.props.children === "Để sau")!.props.onClick!();
  expect(onClose).toHaveBeenCalledOnce();
  expect(render().find((n) => n.type === Dialog)?.props.open).toBe(false);
});

it.each(["vi", "en"])("closing and closed editing explain a refused empty message in %s", async (locale) => {
  hooks.locale = locale;
  const note = {
    id: "n",
    recipientId: "b",
    happened: "Yesterday",
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    line: "I hear you",
  };
  const entry = {
    id: "e",
    authorId: "a",
    date: "2026-11-01",
    text: "",
    source: "partner" as const,
    photoIds: [],
    createdAt: 1,
    updatedAt: 1,
    note,
  };
  const hint = locale === "vi" ? "Viết lời nhắn trước khi khép lại nhé." : "Write a message before closing the note.";
  for (const editing of [false, true]) {
    hooks.values = [];
    hooks.refs = [];
    const refuse = vi
      .spyOn(api, editing ? "updateClosedNote" : "closeNote")
      .mockResolvedValue({ ok: false, status: 400, error: { error: "note_empty" } });
    const render = () => {
      hooks.index = 0;
      hooks.refIndex = 0;
      return nodes(
        editing
          ? ClosedNoteSheet({
              entry,
              recipient: { name: "Linh", tone: "secondary" },
              onClose: vi.fn(),
              onSaved: vi.fn(),
              onSignedOut: vi.fn(),
            })
          : NoteCloseSheet({ id: "n", onClose: vi.fn(), onClosed: vi.fn(), onSignedOut: vi.fn() }),
      );
    };
    if (!editing) {
      const fields: ReactNode = render().find((n) => n.type === CloseFields);
      if (!isValidElement<Parameters<typeof CloseFields>[0]>(fields)) throw new Error("Missing closing fields");
      fields.props.onChange({ line: "My own reply" });
    }
    render().find((n) => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
    await flushQueryWork();
    expect(refuse).toHaveBeenCalledOnce();
    expect(render().some((n) => n.props.children === hint)).toBe(true);
    refuse.mockRestore();
  }
});
