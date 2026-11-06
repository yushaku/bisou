import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { EntryActions } from "../src/client/components/bisou/EntryActions";
import { ClaimsList } from "../src/client/components/bisou/ClaimsList";
import { ComposeSheet } from "../src/client/components/bisou/ComposeSheet";
import { AppShell } from "../src/client/components/bisou/AppShell";
import { WishSheet } from "../src/client/components/bisou/WishSheet";
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
vi.mock("wouter/use-browser-location", () => ({ useHistoryState: () => null }));
vi.mock("../src/client/lib/useTabNavigation", () => ({ useCreateRequest: vi.fn() }));
vi.mock("../src/client/lib/useWishJar", () => ({ useWishJar: () => ({ jar: null }) }));
vi.mock("../src/client/components/bisou/useUploadQueue", () => ({ useUploadQueue: () => ({ items: [], saved: vi.fn() }) }));

afterEach(() => { state.length = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { children?: ReactNode; disabled?: boolean; onClick?: () => void; onSubmit?: (event: { preventDefault: () => void }) => void };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
const entry = { id: "entry", authorId: "an", date: "2020-01-01", text: "A memory", source: "partner" as const, photoIds: [], createdAt: 0, updatedAt: 0 };
const wish = { id: "wish", title: "A book", price: null, link: null, priority: 2 as const, photoId: null, status: "open" as const, receivedOn: null, note: null, createdAt: 0, updatedAt: 0 };
const user = { id: "an", displayName: "An", email: "an@example.com", birthDate: null, avatarId: null, locale: "en" as const, createdAt: 0 };

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
  state.push("jar", false, "all", null, false, false, undefined, wish, true, false, null);
  const nodes = elements(Wishes({ user, couple: { id: "couple", startDate: null, members: [user], events: [] }, onUser: vi.fn(), onSignedOut: vi.fn() }));
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
