import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { TodayPosts } from "../src/client/components/bisou/TodayPosts";
import { I18nProvider } from "../src/client/i18n";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import type { JournalEntry } from "../src/shared/types";

const members = [
  { id: "an", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", displayName: "Bình", birthDate: null, avatarId: null },
];
const couple = { id: "couple", startDate: null, members, events: [] };
const user = { ...members[0]!, email: "an@example.com", locale: "vi" as const, createdAt: 1 };

function entry(id: string, date: string, text: string, authorId = "an"): JournalEntry {
  return { id, authorId, date, text, source: "partner", photoIds: [], createdAt: Date.parse(`${date}T03:00:00Z`), updatedAt: 0 };
}

function render(entries: JournalEntry[], today = "2026-11-08") {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.journal = { entries, nextCursor: null };
  return renderToString(h(I18nProvider, null, h(TabMemory.Provider, { value: memory },
    h(TodayPosts, { couple, user, today, onSignedOut: () => {} }))));
}

afterEach(() => vi.unstubAllGlobals());

it("R25: shows only entries dated today, in feed order", () => {
  const html = render([
    entry("a", "2026-11-08", "Hôm nay một", "binh"),
    entry("b", "2026-11-08", "Hôm nay hai"),
    entry("c", "2026-11-07", "Hôm qua"),
  ]);
  expect(html).toContain("Bài viết hôm nay");
  expect(html).toContain("Hôm nay một");
  expect(html).toContain("Hôm nay hai");
  expect(html).not.toContain("Hôm qua");
  expect(html.indexOf("Hôm nay một")).toBeLessThan(html.indexOf("Hôm nay hai"));
});

it("R25: shows nothing at all when no entry is dated today", () => {
  expect(render([entry("c", "2026-11-07", "Hôm qua")])).toBe("");
  expect(render([])).toBe("");
});
