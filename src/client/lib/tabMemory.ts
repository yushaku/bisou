import { createContext } from "react";

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
