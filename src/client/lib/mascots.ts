import { useSyncExternalStore } from "react";
import girlEmpty from "@/assets/mascots/girl-empty.webp";
import girlWaiting from "@/assets/mascots/girl-waiting.webp";
import girlError from "@/assets/mascots/girl-error.webp";
import girlCelebrate from "@/assets/mascots/girl-celebrate.webp";
import boyEmpty from "@/assets/mascots/boy-empty.webp";
import boyWaiting from "@/assets/mascots/boy-waiting.webp";
import boyError from "@/assets/mascots/boy-error.webp";
import boyCelebrate from "@/assets/mascots/boy-celebrate.webp";

export const MASCOTS = [
  { id: "girl", name: "mascot.girl", images: { empty: girlEmpty, waiting: girlWaiting, error: girlError, celebrate: girlCelebrate } },
  { id: "boy", name: "mascot.boy", images: { empty: boyEmpty, waiting: boyWaiting, error: boyError, celebrate: boyCelebrate } }
] as const;
export type MascotSituation = keyof typeof MASCOTS[number]["images"];
const KEY = "bisou.mascot";
const CHANGE = "bisou:mascot";
let sessionId: string | null = null;

export function readMascot() {
  let id = sessionId;
  if (id === null) {
    try { id = localStorage.getItem(KEY); } catch { /* Storage may be blocked. */ }
  }
  return MASCOTS.find(mascot => mascot.id === id) ?? MASCOTS[0];
}

export function setMascot(id: string) {
  const next = MASCOTS.find(mascot => mascot.id === id)?.id ?? MASCOTS[0].id;
  try { localStorage.setItem(KEY, next); sessionId = null; } catch { sessionId = next; }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGE, onChange); window.removeEventListener("storage", onChange); };
}
export function useMascot() {
  return useSyncExternalStore(subscribe, readMascot, readMascot);
}
