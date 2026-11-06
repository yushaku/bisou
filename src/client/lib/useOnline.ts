import { useSyncExternalStore } from "react";

function subscribe(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

const snapshot = () => typeof navigator === "undefined" || navigator.onLine !== false;
export function useOnline() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
