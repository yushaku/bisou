import type { PushDevice, PushSubscriptionInput } from "../../shared/types";
import { api } from "../api";
import { isStandalone } from "./install";

export function pushSupport(): "ok" | "needsInstall" | "unsupported" {
  if (typeof navigator === "undefined") return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (ios && !isStandalone()) return "needsInstall";
  return "serviceWorker" in navigator && typeof PushManager !== "undefined" && typeof Notification !== "undefined"
    ? "ok" : "unsupported";
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager ? registration.pushManager.getSubscription() : null;
}

export async function turnOn(registration: ServiceWorkerRegistration, publicKey: string, kinds: Pick<PushDevice, "journal" | "reminders">, existing: PushSubscription | null = null) {
  const key = existing?.options.applicationServerKey;
  if (existing && (!key || btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== publicKey.replace(/=+$/, ""))) {
    await existing.unsubscribe();
  }
  // Keep subscribe in the tap's user activation, before any API call.
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
  const res = await api.savePush({ ...subscription.toJSON(), ...kinds } as PushSubscriptionInput);
  if (!res.ok) {
    await subscription.unsubscribe();
    throw new Error("push save failed");
  }
  return { subscription, device: res.data.device };
}

/* Chrome's quiet prompt (a bell in the address bar) rejects subscribe while the permission stays "default". */
export function permissionPromptHidden(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError" && typeof Notification !== "undefined" && Notification.permission !== "denied";
}

export async function turnOff() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  const res = await api.deletePush(subscription.endpoint);
  if (!res.ok) throw new Error("push delete failed");
  await subscription.unsubscribe();
}
