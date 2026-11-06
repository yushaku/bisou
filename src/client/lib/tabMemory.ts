import { createContext } from "react";
import type { Claim, JournalPage, Wish } from "../../shared/types";

export interface TabMemoryValue {
  scroll: Map<string, number>;
  journal: JournalPage | null;
  returnFocus: string | null;
  /* Last loaded wish lists: shown at once when the Wishes tab comes back, then refreshed. */
  wishes: { open: Wish[]; received: Wish[] } | null;
  claims: Claim[] | null;
  wishesSection: "jar" | "claims";
  wishesFilter: "all" | "open" | "received";
}

export function createTabMemory(): TabMemoryValue {
  return { scroll: new Map(), journal: null, returnFocus: null, wishes: null, claims: null, wishesSection: "jar", wishesFilter: "all" };
}

// The signed-in provider owns this memory; signing out discards the feed and positions.
export const TabMemory = createContext<TabMemoryValue | null>(null);
