import { createContext } from "react";
import type { NoteLists, Claim, JournalPage, Wish } from "../../shared/types";
import { api } from "../api";

export interface TabMemoryValue {
  notes: NoteLists | null;
  notesRequest: ReturnType<typeof api.notes> | null;
  journalSection: "feed" | "notes";
  scroll: Map<string, number>;
  journal: JournalPage | null;
  returnFocus: string | null;
  /* Kept across visits to Wishes; refreshed on entry and visibility, updated by mutations. */
  wishes: { open: Wish[]; received: Wish[]; partnerJarEmpty: boolean } | null;
  wishesRequest: ReturnType<typeof api.wishes> | null;
  claims: Claim[] | null;
  wishesSection: "jar" | "claims";
  wishesFilter: "all" | "open" | "received";
}

export function createTabMemory(): TabMemoryValue {
  return { notes: null, notesRequest: null, journalSection: "feed", scroll: new Map(), journal: null, returnFocus: null, wishes: null, wishesRequest: null, claims: null, wishesSection: "jar", wishesFilter: "all" };
}

export async function loadWishes(memory: TabMemoryValue, refresh = false): ReturnType<typeof api.wishes> {
  if (memory.wishesRequest) return memory.wishesRequest;
  if (memory.wishes && !refresh) return { ok: true, data: memory.wishes };
  memory.wishesRequest = api.wishes().then((res) => {
    if (res.ok) memory.wishes = res.data;
    return res;
  }).finally(() => { memory.wishesRequest = null; });
  return memory.wishesRequest;
}

export async function loadNotes(memory: TabMemoryValue, refresh = false): ReturnType<typeof api.notes> {
  if (memory.notesRequest) return memory.notesRequest;
  if (memory.notes && !refresh) return { ok: true, data: memory.notes };
  memory.notesRequest = api.notes().then((res) => {
    if (res.ok) memory.notes = res.data;
    return res;
  }).finally(() => { memory.notesRequest = null; });
  return memory.notesRequest;
}

// The signed-in provider owns this memory; signing out discards the feed and positions.
export const TabMemory = createContext<TabMemoryValue | null>(null);
