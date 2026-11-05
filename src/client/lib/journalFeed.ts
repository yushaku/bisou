// Feed state for the journal: loaded entries in feed order plus the cursor of the next older page.
// Pure functions, so pages, refreshes and local saves merge the same way and are unit tested.
import type { JournalEntry, JournalPage } from "../../shared/types";

/** Feed order, newest first: entry day, then time written, then id (R12, R13). Same order as the server cursor. */
export function compareEntries(a: JournalEntry, b: JournalEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
}

/* Later copies win, so a saved or edited entry replaces the loaded one wherever its day moved. */
function merge(current: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  const byId = new Map(current.map((e) => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()].sort(compareEntries);
}

/** Appends the next older page; an entry already held (from a refresh or a local save) is not repeated. */
export function addPage(state: JournalPage, page: JournalPage): JournalPage {
  return { entries: merge(state.entries, page.entries), nextCursor: page.nextCursor };
}

/** A just saved or edited entry, shown in place without refetching. */
export function upsertEntry(state: JournalPage, entry: JournalEntry): JournalPage {
  return { entries: merge(state.entries, [entry]), nextCursor: state.nextCursor };
}

/**
 * A fresh page 1 (app back in front): it is the truth for its range, so loaded entries in that
 * range that it lacks were deleted. Older loaded entries stay, and so does the older cursor:
 * at worst the next page repeats a few entries, which merge drops, so there is never a gap.
 */
export function refreshFirstPage(state: JournalPage, page: JournalPage): JournalPage {
  const last = page.entries[page.entries.length - 1];
  if (page.nextCursor === null || !last) return { entries: [...page.entries].sort(compareEntries), nextCursor: null };
  const older = state.entries.filter((e) => compareEntries(e, last) > 0);
  return { entries: merge(older, page.entries), nextCursor: state.nextCursor };
}

export interface DayGroup {
  date: string;
  entries: JournalEntry[];
}

/** Consecutive entries of one day under one heading; days without entries never appear (R14). */
export function groupByDay(entries: JournalEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of entries) {
    const group = groups[groups.length - 1];
    if (group?.date === e.date) group.entries.push(e);
    else groups.push({ date: e.date, entries: [e] });
  }
  return groups;
}
