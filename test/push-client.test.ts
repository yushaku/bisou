import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { currentSubscription, pushSupport, turnOff, turnOn } from "../src/client/lib/push";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup() {
  vi.stubGlobal("navigator", { userAgent: "Chrome", onLine: true, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(undefined) } });
  vi.stubGlobal("Notification", { permission: "default" }); vi.stubGlobal("PushManager", {});
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
}
it("notifications AC16, R20: distinguishes iPhone and iPad browser installation from unsupported browsers", async () => {
  setup(); expect(pushSupport()).toBe("ok"); expect(await currentSubscription()).toBeNull();
  for (const ua of ["iPhone", "iPad", "Macintosh"]) {
    vi.stubGlobal("navigator", { userAgent: ua, maxTouchPoints: 5 });
    expect(pushSupport()).toBe("needsInstall");
  }
  vi.stubGlobal("navigator", { userAgent: "Firefox" }); expect(pushSupport()).toBe("unsupported");
});
it("notifications AC1, AC2, R1, R21: subscribe is called synchronously in the tap before any API await", async () => {
  setup();
  const body = { endpoint: "endpoint", keys: { auth: "auth", p256dh: "key" } };
  const subscription = { toJSON: () => body, unsubscribe: vi.fn() };
  const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue(subscription) } } as unknown as ServiceWorkerRegistration;
  const save = vi.spyOn(api, "savePush").mockResolvedValue({ ok: true, data: { device: { endpoint: "endpoint", journal: true, reminders: true } } });
  const pending = turnOn(registration, "public-key", { journal: true, reminders: true });
  expect(registration.pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: "public-key" });
  expect(save).not.toHaveBeenCalled(); await pending;
  expect(save).toHaveBeenCalledWith({ ...body, journal: true, reminders: true });
});
it("notifications R28: an API failure undoes a new browser subscription", async () => {
  setup(); const unsubscribe = vi.fn().mockResolvedValue(true);
  const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue({ toJSON: () => ({}), unsubscribe }) } } as unknown as ServiceWorkerRegistration;
  vi.spyOn(api, "savePush").mockResolvedValue({ ok: false, status: 503, error: null });
  await expect(turnOn(registration, "public-key", { journal: true, reminders: true })).rejects.toThrow();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
it("notifications AC20, R28: turning both off deletes on the server before unsubscribing locally", async () => {
  setup(); const unsubscribe = vi.fn().mockResolvedValue(true);
  vi.mocked(navigator.serviceWorker.getRegistration).mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: "endpoint", unsubscribe }) } } as unknown as ServiceWorkerRegistration);
  const remove = vi.spyOn(api, "deletePush").mockImplementation(async () => { expect(unsubscribe).not.toHaveBeenCalled(); return { ok: true, data: { ok: true } }; });
  await turnOff(); expect(remove).toHaveBeenCalledWith("endpoint"); expect(unsubscribe).toHaveBeenCalledOnce();
});

it("notifications R32: key rotation unsubscribes the old key before subscribing", async () => {
  setup();
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const old = { options: { applicationServerKey: new Uint8Array([1]).buffer }, unsubscribe } as unknown as PushSubscription;
  const subscription = { toJSON: () => ({}), unsubscribe: vi.fn() };
  const subscribe = vi.fn().mockImplementation(async () => { expect(unsubscribe).toHaveBeenCalledOnce(); return subscription; });
  vi.spyOn(api, "savePush").mockResolvedValue({ ok: true, data: { device: { endpoint: "new", journal: true, reminders: false } } });
  await turnOn({ pushManager: { subscribe } } as unknown as ServiceWorkerRegistration, "Ag", { journal: true, reminders: false }, old);
  expect(subscribe).toHaveBeenCalledOnce();
});
