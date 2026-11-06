import { useSyncExternalStore } from "react";

export interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let pending: InstallPrompt | null = null;
const listeners = new Set<() => void>();

function update(event: InstallPrompt | null) {
  pending = event;
  for (const listener of listeners) listener();
}

// Capture before authentication finishes, since Home can mount after the event fires.
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    update(event as InstallPrompt);
  });
  window.addEventListener("appinstalled", () => update(null));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useInstallPrompt() {
  return useSyncExternalStore(subscribe, () => pending, () => null);
}
export function clearInstallPrompt() { update(null); }
