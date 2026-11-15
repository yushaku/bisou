import { createContext } from "react";
import { isTabSwitching, placeTabScroll } from "./tabTransition";

export interface TabMemoryValue {
  journalSection: "feed" | "notes";
  scroll: Map<string, number>;
  returnFocus: string | null;
  wishesSection: "jar" | "claims";
  wishesFilter: "all" | "open" | "received";
}

export function createTabMemory(): TabMemoryValue {
  return { journalSection: "feed", scroll: new Map(), returnFocus: null, wishesSection: "jar", wishesFilter: "all" };
}

export const TabMemory = createContext<TabMemoryValue | null>(null);

/*
 * On entering a tab: put the page back where it was left (0 for a tab not visited yet), give focus
 * back to the control that opened a sub-page, and from then on remember the scroll position of this
 * tab. The returned function stops remembering, so a position is never saved under the wrong tab.
 */
export function attachTabScroll(memory: TabMemoryValue, tab: string | undefined): (() => void) | undefined {
  if (tab) placeTabScroll(memory.scroll.get(tab) ?? 0);
  if (memory.returnFocus) {
    document.getElementById(memory.returnFocus)?.focus({ preventScroll: true });
    memory.returnFocus = null;
  }
  if (!tab) return;
  // A frozen page (tab switch under way) reports scroll 0; that is not where the reader was.
  const remember = () => { if (!isTabSwitching()) memory.scroll.set(tab, window.scrollY); };
  window.addEventListener("scroll", remember, { passive: true });
  return () => window.removeEventListener("scroll", remember);
}
