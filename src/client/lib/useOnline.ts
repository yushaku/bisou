import { useSyncExternalStore } from "react";

function subscribe(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

// Only an explicit `false` means offline: environments without `onLine` count as online.
const snapshot = () => {
  const nav: Partial<Navigator> = typeof navigator === "undefined" ? {} : navigator;
  return nav.onLine !== false;
};
export function useOnline() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
