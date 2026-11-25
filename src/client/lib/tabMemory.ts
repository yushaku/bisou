import { createContext } from "react";

export interface TabMemoryValue {
  journalSection: "feed" | "notes";
  returnFocus: string | null;
  wishesJar: "shared" | "private";
  wishesSection: "jar" | "claims";
  wishesFilter: "all" | "open" | "received";
}

export function createTabMemory(): TabMemoryValue {
  return { journalSection: "feed", returnFocus: null, wishesJar: "shared", wishesSection: "jar", wishesFilter: "all" };
}

/** Records navigation state for a later screen. The memory is a shared mutable store kept alive across tabs. */
export function remember(memory: TabMemoryValue | null, patch: Partial<TabMemoryValue>): void {
  if (memory) Object.assign(memory, patch);
}

export const TabMemory = createContext<TabMemoryValue | null>(null);

/* Reset the shared page position on entry; focus restoration remains independent. */
export function attachTabScroll(memory: TabMemoryValue, tab: string | undefined): void {
  if (tab) window.scrollTo({ top: 0, behavior: "instant" });
  if (memory.returnFocus) {
    document.getElementById(memory.returnFocus)?.focus({ preventScroll: true });
    memory.returnFocus = null;
  }
}
