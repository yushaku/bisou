import { isValidElement, type ReactNode, type ReactElement, type ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { EntryCard, type Entry } from "../src/client/components/bisou/EntryCard";
import { WishCard, type Wish } from "../src/client/components/bisou/WishCard";
import { vi as vietnamese, type MessageKey } from "../src/client/i18n/vi";
import { en as english } from "../src/client/i18n/en";
import { JournalDetailDrawer } from "../src/client/components/bisou/JournalDetailDrawer";
import { JournalDetailSheet } from "../src/client/components/bisou/JournalDetailSheet";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
import { TodayPosts } from "../src/client/components/bisou/TodayPosts";
import { NoteParts } from "../src/client/components/bisou/NoteParts";
import { NoteReply } from "../src/client/components/bisou/NoteReply";
import { Journal } from "../src/client/screens/Journal";
import type { JournalEntry } from "../src/shared/types";
import { createQueryFixture as createTabMemory } from "./query-fixture";
const hooks = vi.hoisted((): { active: boolean; index: number; values: unknown[]; memory: unknown } => ({
  active: false,
  index: 0,
  values: [],
  memory: null,
}));
vi.mock("wouter", async (original) => ({
  ...(await original<typeof import("wouter")>()),
  useSearch: () => "",
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useId: () => "test",
  useContext: () => hooks.memory,
  useEffect: () => {},
  useLayoutEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useMemo: (create: () => unknown) => create(),
  useState: (value: unknown) => {
    if (!hooks.active) return [value, vi.fn()];
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof value === "function" ? value() : value;
    return [
      hooks.values[index],
      (next: unknown) => {
        hooks.values[index] = typeof next === "function" ? next(hooks.values[index]) : next;
      },
    ];
  },
  useRef: (value: unknown) => ({ current: value }),
}));
vi.mock("../src/client/lib/useTabNavigation", () => ({ useCreateRequest: () => {} }));
afterEach(() => {
  hooks.active = false;
  hooks.index = 0;
  hooks.values = [];
  hooks.memory = null;
  copy.locale = null;
});
const copy = vi.hoisted(() => ({ locale: null as "vi" | "en" | null }));
vi.mock("../src/client/i18n", () => ({
  useI18n: () => ({
    t: (key: MessageKey) => (copy.locale ? (copy.locale === "vi" ? vietnamese : english)[key] : key),
    locale: copy.locale ?? "vi",
  }),
}));
vi.mock("../src/client/lib/useOnline", () => ({ useOnline: () => true }));
interface Props {
  children?: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
  "aria-controls"?: string;
  href?: string;
}
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
function clickEntry(node: ReactElement<Props>, currentTarget = { isConnected: true, focus: vi.fn() }) {
  const click = node.props.onClick as (event: { currentTarget: typeof currentTarget }) => void;
  click({ currentTarget });
}

const entry: Entry = {
  id: "entry",
  date: "2026-11-01",
  author: { name: "An", tone: "primary" },
  body: "Hello",
  photos: [],
  note: "Ghi ngày yesterday",
};
const wish: Wish = {
  id: "wish",
  title: "Book",
  price: null,
  link: null,
  photoId: null,
  priority: 2,
  status: "open",
  receivedOn: null,
  note: null,
  createdAt: 1,
  updatedAt: 1,
};
it.each(["journal", "wish"])("opens the %s card only when an opener is provided", (kind) => {
  const render = (onOpen?: () => void) =>
    nodes(kind === "journal" ? EntryCard({ entry, onOpen }) : WishCard({ wish, onOpen }));
  expect(render().some((n) => n.type === "button")).toBe(false);
  const onOpen = vi.fn();
  clickEntry(render(onOpen).find((n) => n.type === "button")!);
  expect(onOpen).toHaveBeenCalledOnce();
});
it("restores focus to the opener or the card when a comment count disappears", () => {
  const onOpen = vi.fn<(restoreFocus: () => void) => void>();
  const onOpenComments = vi.fn<(restoreFocus: () => void) => void>();
  const tree = nodes(EntryCard({ entry: { ...entry, commentCount: 1 }, onOpen, onOpenComments }));
  const cardButton = tree.find((node) => node.props["aria-label"] === "entry.open")!;
  const countButton = tree.find((node) => node.props["aria-label"] === "comments.countLabel")!;
  const card = { isConnected: true, focus: vi.fn() };
  const count = { isConnected: true, focus: vi.fn() };
  const ref = (cardButton.props as Props & { ref: { current: typeof card } }).ref;
  ref.current = card;

  clickEntry(cardButton, card);
  onOpen.mock.calls[0]![0]();
  expect(card.focus).toHaveBeenCalledWith({ preventScroll: true });

  clickEntry(countButton, count);
  const restoreCountFocus = onOpenComments.mock.calls[0]![0];
  restoreCountFocus();
  expect(count.focus).toHaveBeenCalledOnce();

  count.isConnected = false;
  restoreCountFocus();
  expect(card.focus).toHaveBeenCalledTimes(2);
  expect(count.focus).toHaveBeenCalledOnce();
});

it.each([
  [true, undefined, true],
  [true, false, false],
  [false, undefined, false],
] as const)("journal AC24, AC25: edit gate %s and delete permission %s", (own, canDelete, showsDelete) => {
  const result = nodes(
    EntryActions({
      entry: null,
      own,
      canDelete,
      onClose: vi.fn(),
      onEdit: vi.fn(),
      onDeleted: vi.fn(),
      onSignedOut: vi.fn(),
    }),
  );
  const shows = (key: string) => result.some((n) => Array.isArray(n.props.children) && n.props.children.includes(key));
  expect(shows("entry.edit")).toBe(own);
  expect(shows("entry.delete")).toBe(showsDelete);
});

const members = [
  { id: "an", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", email: "binh@example.com", displayName: "Bình", birthDate: null, avatarId: null },
];
it.each(["partner", "wish", "note"] as const)(
  "journal AC23, AC24, AC25: %s feed options and details keep edit/delete permissions separate",
  (kind) => {
    const shared: JournalEntry = {
      id: "shared",
      authorId: "an",
      date: "2026-11-01",
      text: "Our story",
      source: kind === "wish" ? "wish" : "partner",
      photoIds: [],
      createdAt: 1,
      updatedAt: 1,
      ...(kind === "note"
        ? { note: { id: "note", recipientId: "binh", happened: "h", feel: "f", need: "n", hope: "r", line: "" } }
        : {}),
    };
    for (const member of members) {
      for (const path of ["options", "details"]) {
        hooks.active = true;
        hooks.values = [];
        const memory = createTabMemory();
        memory.journal = { entries: [shared], nextCursor: null };
        hooks.memory = memory;
        const render = () => {
          hooks.index = 0;
          return nodes(
            Journal({
              couple: { id: "couple", startDate: null, members, events: [] },
              user: { ...member, email: "a@example.com", locale: "vi", createdAt: 1 },
              onSignedOut: vi.fn(),
              onUser: vi.fn(),
            }),
          );
        };
        const card = render().find((node) => node.type === EntryCard)! as ReactElement<
          ComponentProps<typeof EntryCard>
        >;
        if (path === "details") {
          card.props.onOpen!(() => {});
          const detail = render().find((node) => node.type === JournalDetailDrawer) as ReactElement<
            ComponentProps<typeof JournalDetailDrawer>
          >;
          detail.props.onOpenOptions!();
        } else (card.props.actions as ReactElement<{ onClick: () => void }>).props.onClick();
        const actions = render().find(
          (node) =>
            node.type === EntryActions && (node.props as ComponentProps<typeof EntryActions>).entry?.id === shared.id,
        )! as ReactElement<ComponentProps<typeof EntryActions>>;
        expect(actions).toBeDefined();
        const controls = nodes(EntryActions(actions.props));
        const shows = (key: string) =>
          controls.some((node) => Array.isArray(node.props.children) && node.props.children.includes(key));
        expect(shows("entry.edit")).toBe(true);
        expect(shows("entry.delete")).toBe(member.id === "an" || kind === "note");
      }
    }
  },
);

it("note cards always offer visible reading when narrow wrapping can exceed the preview", () => {
  // Each word wraps independently; no character threshold can know the available width.
  const note = {
    ...entry,
    source: "note" as const,
    parts: {
      happened: "A wide word with another wide word and another wide word",
      feel: "Sad",
      need: "Time",
      hope: "Talk",
    },
    reply: { person: { name: "Binh", tone: "secondary" as const }, line: "I hear you" },
  };
  const onOpen = vi.fn();
  const more = nodes(EntryCard({ entry: note, onOpen })).find((node) => node.props.children === "entry.more");
  expect(more).toBeDefined();
  clickEntry(more!);
  expect(onOpen).toHaveBeenCalledOnce();
  const full = nodes(EntryCard({ entry: note }));
  expect((full.find((node) => node.type === NoteParts)!.props as ComponentProps<typeof NoteParts>).preview).toBe(false);
  expect((full.find((node) => node.type === NoteReply)!.props as ComponentProps<typeof NoteReply>).preview).toBe(false);
});

it("Home opens the full shared note detail and closes back to the card", () => {
  hooks.active = true;
  const note = {
    id: "note",
    recipientId: "binh",
    happened: "An event ".repeat(50),
    feel: "Sad",
    need: "Time",
    hope: "Talk",
    line: "A response ".repeat(40),
  };
  const memory = createTabMemory();
  memory.journal = {
    entries: [
      {
        id: "home-note",
        authorId: "an",
        date: "2026-11-01",
        text: "",
        source: "partner",
        photoIds: [],
        createdAt: 1,
        updatedAt: 1,
        note,
      },
    ],
    nextCursor: null,
  };
  hooks.memory = memory;
  const render = () => {
    hooks.index = 0;
    return nodes(
      TodayPosts({
        couple: { id: "c", startDate: null, members, events: [] },
        user: { ...members[0]!, email: "an@example.com", locale: "vi", createdAt: 1 },
        today: "2026-11-01",
        onSignedOut: vi.fn(),
      }),
    );
  };
  const card = render().find((node) => node.type === EntryCard)! as ReactElement<ComponentProps<typeof EntryCard>>;
  card.props.onOpen!(() => {});
  const detail = render().find((node) => node.type === JournalDetailDrawer)! as ReactElement<
    ComponentProps<typeof JournalDetailDrawer>
  >;
  expect(detail.props.entry?.parts?.happened).toBe(note.happened);
  expect(detail.props.entry?.reply?.line).toBe(note.line);
  const contents = nodes(JournalDetailSheet({ entry: detail.props.entry!, onOpenPhoto: detail.props.onOpenPhoto }));
  expect(
    (contents.find((node) => node.type === NoteParts)!.props as ComponentProps<typeof NoteParts>).preview,
  ).toBeUndefined();
  expect(
    (contents.find((node) => node.type === NoteReply)!.props as ComponentProps<typeof NoteReply>).preview,
  ).toBeUndefined();
  detail.props.onClose();
  expect(
    (render().find((node) => node.type === JournalDetailDrawer)!.props as ComponentProps<typeof JournalDetailDrawer>)
      .entry,
  ).toBeNull();
});
