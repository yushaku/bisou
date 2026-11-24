import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { TodayPosts } from "../src/client/components/bisou/TodayPosts";
import { I18nProvider } from "../src/client/i18n";
import { TabMemory } from "../src/client/lib/tabMemory";
import { createQueryFixture as createTabMemory } from "./query-fixture";
import type { JournalEntry } from "../src/shared/types";

const members = [
  { id: "an", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", email: "binh@example.com", displayName: "Bình", birthDate: null, avatarId: null },
];
const couple = { id: "couple", startDate: null, members, events: [] };
const user = { ...members[0]!, email: "an@example.com", locale: "vi" as const, createdAt: 1 };

function entry(id: string, date: string, text: string, authorId = "an"): JournalEntry {
  return {
    id,
    authorId,
    date,
    text,
    source: "partner",
    photoIds: [],
    createdAt: Date.parse(`${date}T03:00:00Z`),
    updatedAt: 0,
  };
}

function render(entries: JournalEntry[], today = "2026-11-08") {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.journal = { entries, nextCursor: null };
  return renderToString(
    h(
      I18nProvider,
      null,
      h(TabMemory.Provider, { value: memory }, h(TodayPosts, { couple, user, today, onSignedOut: () => {} })),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

it("journal R25: shows only entries dated today, in feed order", () => {
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

it("journal R25: shows nothing at all when no entry is dated today", () => {
  expect(render([entry("c", "2026-11-07", "Hôm qua")])).toBe("");
  expect(render([])).toBe("");
});

it.each(["vi", "en"])("Home opens a long closed note from today's preview in %s", (locale) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory();
  memory.journal = {
    entries: [
      {
        ...entry("closed", "2026-11-08", ""),
        note: {
          id: "note",
          recipientId: "binh",
          happened: "A long event ".repeat(25),
          feel: "Sad",
          need: "Time",
          hope: "Talk",
          line: "I hear you",
        },
      },
    ],
    nextCursor: null,
  };
  const html = renderToString(
    h(
      I18nProvider,
      null,
      h(TabMemory.Provider, { value: memory }, h(TodayPosts, { couple, user, today: "2026-11-08", onSignedOut() {} })),
    ),
  );
  expect(html).toContain(locale === "vi" ? "Đọc tiếp" : "Read more");
  expect(html).toMatch(/<button[^>]*aria-label="[^"]*An/);
  expect(html).not.toContain("note-envelope");
  const header = /<header[\s\S]*?<\/header>/.exec(html)?.[0] ?? "";
  expect(header).toMatch(new RegExp(`data-slot="badge"[^>]*>${locale === "vi" ? "Lời nhắn nhỏ" : "Kind note"}<`));
});
