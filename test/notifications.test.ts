import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Notifications } from "../src/client/screens/Notifications";
import { api } from "../src/client/api";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
  useRef: (initial: unknown) => { const index = hooks.index++; return hooks.values[index] ??= { current: initial }; },
  useEffect: (fn: () => unknown) => { hooks.effects.push(fn); },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(() => { hooks.values = []; hooks.effects = []; hooks.index = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Props = { id?: string; children?: ReactNode; disabled?: boolean; checked?: boolean; onCheckedChange?: (value: boolean) => Promise<void> };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function render() { hooks.index = 0; return elements(Notifications({ onSignedOut: vi.fn() })); }
async function setup({ permission = "default", online = true, key = "public-key", registered = true, userAgent = "Chrome" } = {}) {
  const subscription = { options: { applicationServerKey: new Uint8Array([1]).buffer }, endpoint: "this-device", toJSON: () => ({ endpoint: "this-device", keys: { p256dh: "key", auth: "auth" } }), unsubscribe: vi.fn().mockResolvedValue(true) };
  const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue(subscription), getSubscription: vi.fn().mockResolvedValue(null) } };
  vi.stubGlobal("navigator", { userAgent, maxTouchPoints: 5, onLine: online, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registered ? registration : undefined) } });
  vi.stubGlobal("Notification", { permission }); vi.stubGlobal("PushManager", {});
  vi.stubGlobal("matchMedia", () => ({ matches: false })); vi.stubGlobal("document", new EventTarget());
  vi.spyOn(api, "push").mockResolvedValue({ ok: true, data: { publicKey: key || null, devices: [] } });
  const nodes = render(); expect(nodes.filter((n) => n.props.onCheckedChange).every((n) => n.props.disabled)).toBe(true);
  for (const effect of hooks.effects.splice(0)) effect();
  await vi.waitFor(() => expect(render().some((n) => n.props.children === "loading")).toBe(false));
  return { registration, subscription };
}

it.each([
  [{ permission: "denied" }, "push.blocked"], [{ online: false }, "offline.bar"],
  [{ key: "" }, "push.unavailable"], [{ registered: false }, "push.unsupported"], [{ userAgent: "iPhone" }, "push.needsInstall"],
])("AC20, R20, R22: explains %s and disables the switches", async (options, text) => {
  const { registration } = await setup(options);
  const nodes = render(); expect(nodes.some((n) => n.props.children === text)).toBe(true);
  const toggles = nodes.filter((n) => n.props.onCheckedChange);
  expect(toggles).toHaveLength(2); expect(toggles.every((n) => n.props.disabled)).toBe(true);
  await toggles[0]!.props.onCheckedChange!(true);
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
});
it("AC15, R21: opt in saves only the selected kind after a tap", async () => {
  const { registration } = await setup();
  const save = vi.spyOn(api, "savePush").mockResolvedValue({ ok: true, data: { device: { endpoint: "this-device", journal: true, reminders: false } } });
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  const toggle = render().find((n) => n.props.id === "push-journal")!;
  expect(toggle.props.disabled).toBe(false);
  const pending = toggle.props.onCheckedChange!(true);
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce();
  await pending;
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ journal: true, reminders: false }));
  expect(render().find((n) => n.props.id === "push-journal")!.props.checked).toBe(true);
});

it("R21: visibility reload cannot replace an in-flight switch change", async () => {
  await setup();
  Object.defineProperty(document, "visibilityState", { value: "visible" });
  let finish!: (value: Awaited<ReturnType<typeof api.savePush>>) => void;
  vi.spyOn(api, "savePush").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const pending = render().find(n => n.props.id === "push-journal")!.props.onCheckedChange!(true);
  await vi.waitFor(() => expect(finish).toBeDefined());
  const calls = vi.mocked(api.push).mock.calls.length;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(api.push).toHaveBeenCalledTimes(calls);
  finish({ ok: true, data: { device: { endpoint: "this-device", journal: true, reminders: false } } });
  await pending;
  expect(render().find(n => n.props.id === "push-journal")!.props.checked).toBe(true);
});

it("R20, R32: a browser endpoint unknown to the server shows off and registers again", async () => {
  const { registration, subscription } = await setup();
  registration.pushManager.getSubscription.mockResolvedValue(subscription as never);
  Object.defineProperty(document, "visibilityState", { value: "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => expect(api.push).toHaveBeenCalledTimes(2));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(render().some(n => n.props.children === "push.off")).toBe(true);
  expect(render().filter(n => n.props.onCheckedChange).every(n => !n.props.checked)).toBe(true);
  vi.spyOn(api, "savePush").mockResolvedValue({ ok: true, data: { device: { endpoint: "this-device", journal: true, reminders: false } } });
  await render().find(n => n.props.id === "push-journal")!.props.onCheckedChange!(true);
  expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce();
});
