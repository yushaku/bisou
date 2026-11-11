import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { NotesSection } from "../src/client/components/bisou/NotesSection";
import { api } from "../src/client/api";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
import { ClaimsList } from "../src/client/components/bisou/ClaimsList";
import { NoteSheet } from "../src/client/components/bisou/NoteSheet";
import { ComposeSheet } from "../src/client/components/bisou/ComposeSheet";
import { AppShell } from "../src/client/components/bisou/AppShell";
import { WishSheet } from "../src/client/components/bisou/WishSheet";
import { Settings } from "../src/client/screens/Settings";
import { Home } from "../src/client/screens/Home";
import { NotificationCard } from "../src/client/components/bisou/NotificationCard";
import { Wishes } from "../src/client/screens/Wishes";

const state = vi.hoisted(() => [] as unknown[]);
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (value: unknown) => [state.length ? state.shift() : typeof value === "function" ? value() : value, vi.fn()],
  useId: () => "test", useRef: (value: unknown) => ({ current: value }),
  useContext: () => null, useEffect: vi.fn(), useLayoutEffect: vi.fn(), useCallback: (fn: unknown) => fn,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/", vi.fn()], Link: "a" }));
vi.mock("wouter/use-browser-location", () => ({ useHistoryState: () => null }));
vi.mock("../src/client/lib/useTabNavigation", () => ({ useCreateRequest: vi.fn(), useTabNavigation: () => ({}) }));
vi.mock("../src/client/lib/useWishJar", () => ({ useWishJar: () => ({ jar: null }) }));
vi.mock("../src/client/components/bisou/useUploadQueue", () => ({ useUploadQueue: () => ({ items: [], saved: vi.fn() }) }));

afterEach(() => { state.length = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { role?: string; id?: string; className?: string; "aria-describedby"?: string; children?: ReactNode; disabled?: boolean; onClick?: () => void; onSubmit?: (event: { preventDefault: () => void }) => void };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
const entry = { id: "entry", authorId: "an", date: "2020-01-01", text: "A memory", source: "partner" as const, photoIds: [], createdAt: 0, updatedAt: 0 };
const wish = { id: "wish", title: "A book", price: null, link: null, priority: 2 as const, photoId: null, status: "open" as const, receivedOn: null, note: null, createdAt: 0, updatedAt: 0 };
const user = { id: "an", displayName: "An", email: "an@example.com", birthDate: null, avatarId: null, locale: "en" as const, createdAt: 0 };
const partner = { ...user, id: "binh", displayName: "Bình", email: "binh@example.com" };

it.each([false, true])("entry deletion respects connectivity: online=%s", async (online) => {
  vi.stubGlobal("navigator", { onLine: online });
  const remove = vi.spyOn(api, "deleteEntry").mockResolvedValue({ ok: false, status: 0, error: null });
  state.push(entry, false, null);
  const nodes = elements(EntryActions({ entry, onClose: vi.fn(), onEdit: vi.fn(), onDeleted: vi.fn(), onSignedOut: vi.fn() }));
  const confirm = nodes.find((node) => node.props.children === "entry.deleteYes")!;
  expect(Boolean(confirm.props.disabled)).toBe(!online);
  confirm.props.onClick!();
  await Promise.resolve();
  expect(remove).toHaveBeenCalledTimes(online ? 1 : 0);
  if (!online) expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it.each([false, true])("wish deletion respects connectivity: online=%s", async (online) => {
  vi.stubGlobal("navigator", { onLine: online });
  const remove = vi.spyOn(api, "deleteWish").mockResolvedValue({ ok: false, status: 0, error: null });
  state.push("jar", "all", null, false, false, undefined, wish, false, true, false, null);
  const nodes = elements(Wishes({ user, couple: { id: "couple", startDate: null, members: [user, partner], events: [] }, onUser: vi.fn(), onSignedOut: vi.fn() }));
  const confirm = nodes.find((node) => node.key === "confirm-delete")!;
  expect(Boolean(confirm.props.disabled)).toBe(!online);
  confirm.props.onClick!();
  await Promise.resolve();
  expect(remove).toHaveBeenCalledTimes(online ? 1 : 0);
  if (!online) expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it.each([false, true])("claim release respects connectivity: online=%s", async (online) => {
  vi.stubGlobal("navigator", { onLine: online });
  const remove = vi.spyOn(api, "releaseClaim").mockResolvedValue({ ok: true, data: { ok: true } });
  state.push([], false, { ...wish, id: "claim" }, false, null);
  const nodes = elements(ClaimsList({ onSignedOut: vi.fn() }));
  const confirm = nodes.find((node) => node.props.children === "claims.release" && node.props.onClick)!;
  expect(Boolean(confirm.props.disabled)).toBe(!online);
  confirm.props.onClick!();
  await Promise.resolve();
  expect(remove).toHaveBeenCalledTimes(online ? 1 : 0);
  if (!online) expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it("ComposeSheet keeps a valid draft but refuses submission offline", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const save = vi.spyOn(api, "updateEntry");
  const sheet = ComposeSheet({ open: true, onOpenChange: vi.fn(), author: { name: "An", tone: "primary" }, partnerName: "Binh", entry, onSaved: vi.fn(), onSignedOut: vi.fn() });
  const form = sheet.props.children[0].props.children;
  const nodes = elements(form.type(form.props));
  nodes.find((node) => node.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(save).not.toHaveBeenCalled();
  expect(nodes.find((node) => node.props.children === "compose.save")!.props.disabled).toBe(true);
  expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it("AC11 R11: a new journal entry is not sent offline and its save button is disabled with the offline note", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const create = vi.spyOn(api, "createEntry");
  const sheet = ComposeSheet({ open: true, onOpenChange: vi.fn(), author: { name: "An", tone: "primary" }, partnerName: "Binh", onSaved: vi.fn(), onSignedOut: vi.fn() });
  const form = sheet.props.children[0].props.children;
  state.push(Date.UTC(2026, 10, 6), "2026-11-06", "A new memory");
  const nodes = elements(form.type(form.props));
  nodes.find((node) => node.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
  expect(nodes.find((node) => node.props.children === "compose.save")!.props.disabled).toBe(true);
  expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it("AC11 R11: a new wish is not sent offline and its save button is disabled with the offline note", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const create = vi.spyOn(api, "createWish");
  state.push("A book");
  const nodes = elements(WishSheet({ wish: null, onClose: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() }));
  nodes.find((node) => node.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
  expect(nodes.find((node) => node.props.children === "wish.save")!.props.disabled).toBe(true);
  expect(nodes.some((node) => node.props.children === "offline.save")).toBe(true);
});

it.each([false, true])("AC9 R9: the app shell shows one offline bar only while offline: online=%s", (online) => {
  vi.stubGlobal("navigator", { onLine: online });
  const bar = elements(AppShell({ title: "Home", children: null })).filter((node) => node.props.children === "offline.bar");
  expect(bar).toHaveLength(online ? 0 : 1);
});


it("keeps an empty shell status region mounted inside the sticky header online", () => {
  vi.stubGlobal("navigator", { onLine: true });
  const tree = AppShell({ children: null });
  const header = elements(tree).find((node) => node.type === "header")!;
  const status = elements(header).filter((node) => node.props.role === "status");
  expect(status).toHaveLength(1);
  expect(status[0]!.props.children).toBe("");
  expect(status[0]!.props.className).not.toContain("absolute");
});

it("describes disabled entry deletion with plain offline text", () => {
  vi.stubGlobal("navigator", { onLine: false });
  state.push(entry, false, null);
  const nodes = elements(EntryActions({ entry, onClose: vi.fn(), onEdit: vi.fn(), onDeleted: vi.fn(), onSignedOut: vi.fn() }));
  const confirm = nodes.find((node) => node.props.children === "entry.deleteYes")!;
  const hint = nodes.find((node) => node.props.id === confirm.props["aria-describedby"]);
  expect(hint?.props.children).toBe("offline.save");
  expect(hint?.props.role).toBeUndefined();
});

it("R26: sign out sends this endpoint before unsubscribing", async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("navigator", { onLine: true, serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: "device", unsubscribe }) } }) } });
  const logout = vi.spyOn(api, "logout").mockImplementation(async () => { expect(unsubscribe).not.toHaveBeenCalled(); return { ok: true, data: { ok: true } }; });
  state.push(false, false, "logout");
  const nodes = elements(Settings({ user, onUser: vi.fn(), onSignedOut: vi.fn(), couple: null, onCouple: vi.fn() }));
  nodes.find(n => n.props.children === "home.logout" && n.props.onClick)!.props.onClick!();
  await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledOnce());
  expect(logout).toHaveBeenCalledWith("device");
});
it("AC19: Home hides the invitation for an unpaired user", () => {
  vi.stubGlobal("navigator", { onLine: true });
  const nodes = elements(Home({ user, onUser: vi.fn(), onSignedOut: vi.fn(), couple: { id: "c", members: [user], events: [], startDate: null } as never, onCouple: vi.fn(), celebrate: false, onCelebrated: vi.fn() }));
  expect(nodes.some(n => n.type === NotificationCard)).toBe(false);
});

it("notes AC33 AC40: an offline draft cannot save or send", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const create = vi.spyOn(api, "createNote"), update = vi.spyOn(api, "updateNote"), send = vi.spyOn(api, "sendNote");
  const sheet = NoteSheet({ open: true, onOpenChange: vi.fn(), partnerName: "Binh", onRefresh: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() });
  const form = sheet.props.children[0].props.children;
  state.push({ happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk" });
  const nodes = elements(form.type(form.props));
  nodes.find(n => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  expect(nodes.find(n => n.props.children === "notes.save")!.props.disabled).toBe(true);
  expect(nodes.some(n => n.props.children === "offline.save")).toBe(true);
});

it("notes AC20 AC40: closed-note editing keeps fields but cannot submit offline", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const save = vi.spyOn(api, "updateClosedNote");
  const noteEntry = { ...entry, note: { id: "note", recipientId: "binh", happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk", pick: "try" as const, line: "Understood" } };
  const { ClosedNoteSheet } = await import("../src/client/components/bisou/ClosedNoteSheet");
  const nodes = elements(ClosedNoteSheet({ entry: noteEntry, onClose: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() }));
  nodes.find(n => n.type === "form")!.props.onSubmit!({ preventDefault: vi.fn() }); await Promise.resolve();
  expect(save).not.toHaveBeenCalled(); expect(nodes.find(n => n.props.children === "notes.save")!.props.disabled).toBe(true);
  expect(nodes.some(n => n.props.children === "offline.save")).toBe(true);
});

it.each(["draft", "sent"] as const)("R13 R15: %s has its own deletion label and consequence", (status) => {
  const note = { id: "n", state: status, happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk", createdAt: 0, sendableAt: 1 };
  const sheet = NoteSheet({ open: true, onOpenChange: vi.fn(), partnerName: "Binh", entry: note, onRefresh: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() });
  const form = sheet.props.children[0].props.children;
  const nodes = elements(form.type(form.props));
  const label = status === "draft" ? "notes.delete" : "notes.withdraw";
  expect(nodes.filter(n => n.props.children === label)).toHaveLength(2);
  expect(nodes.some(n => n.props.children === (status === "draft" ? "notes.deleteBody" : "notes.withdrawBody"))).toBe(true);
});

it.each(["draft", "sent"] as const)("notes: saving a %s shows the matching toast", (status) => {
  vi.stubGlobal("navigator", { onLine: true });
  vi.spyOn(api, "notes").mockResolvedValue({ ok: true, data: { fromMe: [], toMe: [] } });
  const success = vi.spyOn(toast, "success");
  state.push(null, null, null, { notes: { fromMe: [], toMe: [] } }, { fromMe: [], toMe: [] }, false, 0, undefined, true, true, null);
  const tree = NotesSection({ user, couple: { id: "c", startDate: null, events: [], members: [user, { ...user, id: "b", displayName: "Binh" }] }, onSignedOut: vi.fn() });
  const sheet = tree!.props.children.at(-1).props.children;
  sheet.props.onSaved({ state: status });
  expect(success).toHaveBeenCalledWith(status === "sent" ? "notes.sent" : "notes.saved");
});
it.each(["draft", "sent"] as const)("notes: removing a %s shows the deleted toast", async (status) => {
  vi.stubGlobal("navigator", { onLine: true });
  vi.spyOn(api, "deleteNote").mockResolvedValue({ ok: true, data: { ok: true } });
  const success = vi.spyOn(toast, "success");
  const note = { id: "n", state: status, happened: "Yesterday", feel: "Sad", need: "Time", hope: "Talk", createdAt: 0, sendableAt: 1 };
  const sheet = NoteSheet({ open: true, onOpenChange: vi.fn(), partnerName: "Binh", entry: note, onRefresh: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() });
  const form = sheet.props.children[0].props.children;
  const nodes = elements(form.type(form.props));
  const label = status === "draft" ? "notes.delete" : "notes.withdraw";
  nodes.find(n => n.props.children === label && (n.props as { variant?: string }).variant === "destructive")!.props.onClick!();
  await Promise.resolve();
  expect(success).toHaveBeenCalledWith("notes.deleted");
});
