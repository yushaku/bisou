import { createContext } from "react";
import type { JournalPage } from "../../shared/types";

export function createTabMemory(): { scroll: Map<string, number>; journal: JournalPage | null } {
  return { scroll: new Map(), journal: null };
}

// The signed-in provider owns this memory; signing out discards the feed and positions.
export const TabMemory = createContext<ReturnType<typeof createTabMemory> | null>(null);
