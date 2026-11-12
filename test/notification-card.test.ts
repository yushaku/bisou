import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { NotificationCard } from "../src/client/components/bisou/NotificationCard";
import { api } from "../src/client/api";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
  useEffect: (fn: () => unknown) => { hooks.effects.push(fn); },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@yusufceng1z/ding-react", () => ({ toast: { error: vi.fn() } }));
afterEach(() => { hooks.values = []; hooks.effects = []; hooks.index = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { children?: ReactNode; disabled?: boolean; "aria-label"?: string; onClick?: () => Promise<void> | void };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function render() { hooks.index = 0; return elements(NotificationCard()); }
async function setup(options: { installed?: boolean; permission?: string; subscribed?: boolean; dismissed?: boolean; publicKey?: string | null; registered?: boolean; online?: boolean; supported?: boolean } = {}) {
  const store = new Map(options.dismissed ? [["bisou.push.card", "1"]] : []);
  const subscription = { endpoint: "device", toJSON: () => ({ endpoint: "device", keys: { auth: "auth", p256dh: "key" } }), unsubscribe: vi.fn().mockResolvedValue(true) };
  const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue(subscription), getSubscription: vi.fn().mockResolvedValue(options.subscribed ? subscription : null) } };
  vi.stubGlobal("navigator", { userAgent: "Chrome", onLine: options.online ?? true, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(options.registered === false ? undefined : registration) } });
  vi.stubGlobal("Notification", { permission: options.permission ?? "default" });
  vi.stubGlobal("PushManager", options.supported === false ? undefined : {});
  vi.stubGlobal("matchMedia", () => ({ matches: options.installed ?? true }));
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  const focus = vi.fn(); vi.stubGlobal("document", { querySelector: () => ({ focus }) });
  vi.spyOn(api, "push").mockResolvedValue({ ok: true, data: { publicKey: options.publicKey === undefined ? "public-key" : options.publicKey, devices: [] } });
  expect(render()).toHaveLength(0);
  for (const effect of hooks.effects.splice(0)) effect();
  // Drain the registration, API and getSubscription promises.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  return { store, registration, focus };
}

it.each([
  { installed: false }, { permission: "granted" }, { permission: "denied" }, { subscribed: true },
  { dismissed: true }, { publicKey: null }, { registered: false }, { supported: false },
])("notifications AC1, AC17, R23: hides the invitation for %s without asking permission", async (options) => {
  const { registration } = await setup(options);
  expect(render()).toHaveLength(0); expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
});

it.each(["allowed", "denied"])("notifications AC1, AC17, R24: a tap asks once and dismisses permanently when %s", async (outcome) => {
  const { registration, store } = await setup();
  const save = vi.spyOn(api, "savePush").mockResolvedValue({ ok: true, data: { device: { endpoint: "device", journal: true, reminders: true } } });
  if (outcome === "denied") registration.pushManager.subscribe.mockRejectedValue(new Error("denied"));
  const button = render().find((n) => n.props.children === "push.card.button")!;
  expect(button).toBeDefined(); expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  const pending = button.props.onClick!();
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce(); await pending;
  if (outcome === "allowed") expect(save).toHaveBeenCalledWith(expect.objectContaining({ journal: true, reminders: true }));
  else expect(save).not.toHaveBeenCalled();
  expect(store.get("bisou.push.card")).toBe("1"); expect(render()).toHaveLength(0);
  hooks.values = []; expect(render()).toHaveLength(0);
});

it("notifications AC17, R25: closing stores dismissal, restores focus and never asks permission", async () => {
  const { registration, store, focus } = await setup();
  render().find((n) => n.props["aria-label"] === "push.card.dismiss")!.props.onClick!();
  expect(store.get("bisou.push.card")).toBe("1"); expect(render()).toHaveLength(0);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
});

it("notifications R1, R24: offline invitation cannot start a subscription", async () => {
  const { registration, store } = await setup({ online: false });
  const button = render().find((n) => n.props.children === "push.card.button")!;
  expect(button.props.disabled).toBe(true); await button.props.onClick!();
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled(); expect(store.size).toBe(0);
});
