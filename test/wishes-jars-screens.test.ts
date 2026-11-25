import { createElement as h, type ComponentProps, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { Router } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import { Journal } from "../src/client/screens/Journal";
import { Home } from "../src/client/screens/Home";
import { Wishes } from "../src/client/screens/Wishes";
import { I18nProvider } from "../src/client/i18n";
import { TabMemory, type TabMemoryValue } from "../src/client/lib/tabMemory";
import { createQueryFixture as createTabMemory } from "./query-fixture";

const buttons = vi.hoisted(() => new Map<string, () => void>());
const refreshes = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("wouter/use-browser-location", async (original) => ({
  ...(await original<typeof import("wouter/use-browser-location")>()),
  useHistoryState: vi.fn(() => null),
}));
vi.mock("../src/client/screens/SignedInShell", () => ({
  SignedInShell: ({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> }) => {
    if (onRefresh) refreshes.push(onRefresh);
    return children;
  },
}));
vi.mock("../src/client/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
    if (onClick) buttons.set(renderToString(h("span", null, children)), onClick);
    return h("button", null, children);
  },
}));

const members = [
  { id: "an", email: "an@example.com", displayName: "An", birthDate: null, avatarId: null },
  { id: "binh", email: "binh@example.com", displayName: "Bình", birthDate: null, avatarId: null },
];
const couple = { id: "couple", startDate: null, members, events: [] };
const session = {
  user: { ...members[0]!, email: "an@example.com", locale: "vi" as const, createdAt: 1 },
  onUser: () => {},
  onSignedOut: () => {},
};

function render(
  screen: ReactNode,
  memoryPatch: Partial<TabMemoryValue> = { wishesJar: "private" },
  ssrSearch = "",
  language = "vi",
) {
  vi.stubGlobal("localStorage", { getItem: () => language });
  return renderToString(
    h(Router, {
      ssrPath: "/wishes",
      ssrSearch,
      children: h(
        I18nProvider,
        null,
        h(TabMemory.Provider, { value: Object.assign(createTabMemory(), memoryPatch) }, screen),
      ),
    }),
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(useHistoryState).mockReturnValue(null);
  vi.unstubAllGlobals();
  buttons.clear();
  refreshes.length = 0;
});

it.each([0, 1])("wishes R25: puts my jar on the left for partner %i", (index) => {
  const user = { ...session.user, ...members[index]! };
  const html = render(h(Wishes, { ...session, user, couple } satisfies ComponentProps<typeof Wishes>));
  const labels = [...html.matchAll(/<button[^>]*aria-label="(Hũ[^"]+)"/g)].map((match) => match[1]);
  expect(labels).toEqual([
    `Hũ của ${user.displayName}, mở hũ của mình`,
    `Hũ của ${members[index === 0 ? 1 : 0]!.displayName}, quay quà`,
  ]);
});

it("shared wishes: the tab opens on Hai đứa and hides the private jars until Riêng is chosen", () => {
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), {});
  expect(html).toContain("Hai đứa");
  expect(html).toContain("Riêng");
  expect(html).toMatch(/<button[^>]*role="tab"[^>]*aria-selected="true"[^>]*>Hai đứa/);
  expect(html).toContain("Những điều hai đứa muốn làm cùng nhau");
  expect(html).not.toContain("Hũ của An, mở hũ của mình");
});

it("shared wishes: lists open wishes with who added them, and a Đã làm list with its day and note", () => {
  const base = { link: null, photoId: null, price: null, createdAt: 1, updatedAt: 1 };
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), {
    wishesJar: "shared",
    sharedWishes: {
      open: [{ ...base, id: "1", creatorId: "binh", title: "Đà Lạt", status: "open", doneOn: null, note: null }],
      done: [
        { ...base, id: "2", creatorId: "an", title: "Ăn lẩu", status: "done", doneOn: "2026-11-01", note: "Cay quá" },
      ],
    },
  } as Partial<TabMemoryValue>);
  expect(html).toContain("Đà Lạt");
  expect(html).toContain("Bình thêm");
  expect(html).toContain("An thêm");
  expect(html).toContain("Đã làm</h2>");
  expect(html).toContain("Ăn lẩu");
  expect(html).toContain("Cay quá");
  expect(html).not.toContain("Mức mong muốn");
});

it("shared wishes: Riêng shows the private jars and the switch stays above them", () => {
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>));
  expect(html).toMatch(/<button[^>]*role="tab"[^>]*aria-selected="true"[^>]*>Riêng/);
  expect(html).toContain("Hũ của An, mở hũ của mình");
  expect(html.indexOf("Hai đứa")).toBeLessThan(html.indexOf("Hũ của An, mở hũ của mình"));
});

it("shared wishes: a link with section=shared selects Hai đứa even when the last view was private", () => {
  const html = render(
    h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>),
    { wishesJar: "private" },
    "section=shared",
  );
  expect(html).toContain("Những điều hai đứa muốn làm cùng nhau");
  expect(html).not.toContain("Hũ của An, mở hũ của mình");
});

it("returns to my jar from a spin opened by a link", () => {
  vi.mocked(useHistoryState).mockReturnValue({ create: "spin", shortcut: true });
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>));
  const back = [...buttons].find(([label]) => label.includes("Về hũ của mình"));
  expect(back).toBeDefined();
  expect(html).not.toContain("Hũ của An, mở hũ của mình");
  // The spin view has no tab list, so nothing may be a tab panel or point at a tab that is not there.
  expect(html).not.toContain('role="tabpanel"');
  for (const [, id] of html.matchAll(/aria-(?:labelledby|controls)="([^"]+)"/g)) expect(html).toContain(`id="${id}"`);
});

it("wishes R25: leaves both jars off Home", () => {
  const html = render(h(Home, { ...session, couple, onCouple: () => {}, celebrate: false, onCelebrated: () => {} }));
  expect(html).not.toContain("Hũ của");
});

it("notes AC4: Notes stays inside the Journal tabs", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.journal = { entries: [], nextCursor: null };
  memory.notes = { fromMe: [], toMe: [] };
  memory.journalSection = "notes";
  const html = renderToString(
    h(Router, {
      ssrPath: "/journal",
      children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, couple }))),
    }),
  );
  expect(html).toContain('role="tablist"');
  expect(html).toContain(">Nhật ký<");
  expect(html).toContain(">Lời nhắn<");
  expect(html).toContain("Chưa có lời nhắn nào");
});

it("notes AC12 AC13: Home shows only waiting notes with a mailbox and count", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  const page = () =>
    renderToString(
      h(Router, {
        ssrPath: "/",
        children: h(
          I18nProvider,
          null,
          h(
            TabMemory.Provider,
            { value: memory },
            h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }),
          ),
        ),
      }),
    );
  expect(page()).not.toContain("mailbox-wait");
  memory.notes = {
    fromMe: [],
    toMe: [
      { id: "one", state: "waiting" },
      { id: "two", state: "waiting" },
    ],
  };
  expect(page()).toContain("mailbox-wait");
  expect(page()).toContain("2 lời nhắn đang đợi");
  memory.notes.toMe = [{ id: "one", state: "opened", happened: "h", feel: "f", need: "n", hope: "r" }];
  expect(page()).not.toContain("mailbox-wait");
});
it("notes-journal AC19 journal AC22: feed keeps writer name/time and recipient above the message", () => {
  vi.stubGlobal("localStorage", { getItem: () => "vi" });
  const memory = createTabMemory();
  memory.journal = {
    entries: [
      {
        id: "e",
        authorId: "an",
        date: "2026-11-13",
        text: "",
        source: "partner",
        photoIds: [],
        createdAt: 1794556500000,
        updatedAt: 1794556500000,
        note: {
          id: "n",
          recipientId: "binh",
          happened: "What happened",
          feel: "Feelings",
          need: "Need",
          hope: "Hope",
          line: "I understand",
        },
      },
    ],
    nextCursor: null,
  };
  const html = renderToString(
    h(Router, {
      ssrPath: "/journal",
      children: h(I18nProvider, null, h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, couple }))),
    }),
  );
  expect(html).toContain("Lời nhắn nhỏ");
  expect(html).toContain("What happened");
  expect(html.indexOf("Bình", html.indexOf("What happened"))).toBeLessThan(html.indexOf("I understand"));
  expect(html).toContain("I understand");
});

it.each([0, 1])(
  "notes-journal AC20 journal AC22: ordinary and note-entry options show for both partners: %i",
  (index) => {
    vi.stubGlobal("localStorage", { getItem: () => "vi" });
    const user = { ...session.user, ...members[index]! };
    const base = {
      id: "normal",
      authorId: "an",
      date: "2026-11-13",
      text: "Normal",
      source: "partner" as const,
      photoIds: [],
      createdAt: 1794556500000,
      updatedAt: 1794556500000,
    };
    const memory = createTabMemory();
    memory.journal = {
      entries: [
        base,
        {
          ...base,
          id: "note-entry",
          text: "",
          note: { id: "n", recipientId: "binh", happened: "h", feel: "f", need: "n", hope: "r", line: "" },
        },
      ],
      nextCursor: null,
    };
    const html = renderToString(
      h(Router, {
        ssrPath: "/journal",
        children: h(
          I18nProvider,
          null,
          h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, user, couple })),
        ),
      }),
    );
    expect([...html.matchAll(/lucide-ellipsis/g)]).toHaveLength(2);
  },
);

it.each([
  [1, "1 note is waiting"],
  [2, "2 notes are waiting"],
])("notes AC12: English Home uses the right count for %i", (count, text) => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const memory = createTabMemory();
  memory.notes = {
    fromMe: [],
    toMe: Array.from({ length: count }, (_, i) => ({ id: String(i), state: "waiting" as const })),
  };
  const html = renderToString(
    h(Router, {
      ssrPath: "/",
      children: h(
        I18nProvider,
        null,
        h(
          TabMemory.Provider,
          { value: memory },
          h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }),
        ),
      ),
    }),
  );
  expect(html).toContain(text);
});

it("card-box AC5: Home keeps the box section after the daily question", () => {
  const html = render(h(Home, { ...session, couple, onCouple() {}, celebrate: false, onCelebrated() {} }));
  expect(html).toContain("Deep talk");
  const daily = html.indexOf('aria-labelledby="today-card"');
  const shop = html.indexOf('aria-labelledby="card-box-title"');
  expect(daily).toBeGreaterThan(-1);
  expect(shop).toBeGreaterThan(daily);
});

it.each([
  ["vi", 0],
  ["vi", 1],
  ["en", 0],
  ["en", 1],
] as const)("note card A shows four parts and the recipient pocket in %s for viewer %s", (locale, index) => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const memory = createTabMemory();
  const note = {
    id: "n",
    recipientId: "binh",
    happened: "What happened ".repeat(18),
    feel: "Feelings",
    need: "My need",
    hope: "My hope",
    line: "I will listen carefully. ".repeat(12),
  };
  memory.journal = {
    entries: [
      {
        id: "e",
        authorId: "an",
        date: "2026-11-17",
        text: "",
        source: "partner",
        photoIds: [],
        createdAt: 1794890000000,
        updatedAt: 1794890000000,
        note,
      },
    ],
    nextCursor: null,
  };
  const user = { ...session.user, ...members[index]! };
  const html = renderToString(
    h(Router, {
      ssrPath: "/journal",
      children: h(
        I18nProvider,
        null,
        h(TabMemory.Provider, { value: memory }, h(Journal, { ...session, user, couple })),
      ),
    }),
  );
  expect(html.match(/<dt/g)).toHaveLength(4);
  expect(html.match(/line-clamp-2/g)).toHaveLength(4);
  expect(html).toContain("line-clamp-3");
  expect(html).not.toContain('data-seal="broken"');
  const header = /<header[\s\S]*?<\/header>/.exec(html)?.[0] ?? "";
  expect(header).toMatch(new RegExp(`data-slot="badge"[^>]*>${locale === "vi" ? "Lời nhắn nhỏ" : "Kind note"}<`));
  expect(header.indexOf('data-slot="badge"')).toBeGreaterThan(header.indexOf("tabular-nums"));
  expect(html).not.toContain("lucide-mailbox");
  expect(html.indexOf("An")).toBeLessThan(html.indexOf("What happened "));
  expect(html.indexOf("Bình", html.indexOf("My hope"))).toBeLessThan(html.indexOf("I will listen carefully."));
  expect(html).toContain("rounded-xl bg-muted p-4");
});

it.each([
  ["shared", "sharedWishes", "wishes"],
  ["private", "wishes", "sharedWishes"],
] as const)("pull to refresh on %s reloads the jar that is shown", async (jar, refreshed, untouched) => {
  const empty = { open: [], done: [], received: [], partnerJarEmpty: true };
  const shown = vi.spyOn(api, refreshed).mockResolvedValue({ ok: true, data: empty });
  const other = vi.spyOn(api, untouched).mockResolvedValue({ ok: true, data: empty });
  render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), { wishesJar: jar });
  await refreshes.at(-1)!();
  expect(shown).toHaveBeenCalledOnce();
  expect(other).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

it("the jar switch reuses the journal's tabs, with 44px hit areas and a real panel for the shown tab", () => {
  const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), {});
  const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((match) => match[0]).slice(0, 2);
  expect(tabs).toHaveLength(2);
  for (const tab of tabs) expect(tab).toContain("before:-inset-y-1.5");
  const selected = tabs.find((tab) => tab.includes('aria-selected="true"'))!;
  const panel = /aria-controls="([^"]+)"/.exec(selected)![1]!;
  expect(html).toMatch(
    new RegExp(`<div[^>]*role="tabpanel"[^>]*id="${panel}"|<div[^>]*id="${panel}"[^>]*role="tabpanel"`),
  );
  expect(html).toContain('role="tablist"');
  expect(html).not.toContain("radiogroup");
});

const jarBase = { link: null, photoId: null, price: null, createdAt: 1, updatedAt: 1 };
const sharedWishes = (open: number, done: number) => ({
  open: Array.from({ length: open }, (_, n) => ({
    ...jarBase,
    id: `o${n}`,
    creatorId: "an",
    title: `Wish ${n}`,
    status: "open" as const,
    doneOn: null,
    note: null,
  })),
  done: Array.from({ length: done }, (_, n) => ({
    ...jarBase,
    id: `d${n}`,
    creatorId: "binh",
    title: `Done ${n}`,
    status: "done" as const,
    doneOn: "2026-11-01",
    note: null,
  })),
});

it.each([
  [0, 0, 0, "0 điều ước"],
  [3, 0, 2, "3 điều ước"],
  [5, 2, 2, "5 điều ước · 2 đã làm"],
  [10, 1, 4, "10 điều ước · 1 đã làm"],
  [14, 0, 4, "14 điều ước"],
] as const)(
  "shared wishes R44: the shared jar for %i open and %i done wishes is level %i and reads %s",
  (open, done, level, line) => {
    const html = render(h(Wishes, { ...session, couple } satisfies ComponentProps<typeof Wishes>), {
      wishesJar: "shared",
      sharedWishes: sharedWishes(open, done),
    } as Partial<TabMemoryValue>);
    expect(html).toContain("Hũ của hai đứa");
    expect(html).toContain(`data-level="${level}"`);
    expect(html).toContain(`>${line}</p>`);
    // The jar does nothing when tapped, so it is not a button, and the private jars are not shown.
    expect(html).not.toMatch(/<button[^>]*aria-label="Hũ của hai đứa/);
    expect(html).not.toContain("Hũ của An, mở hũ của mình");
  },
);

it("shared wishes R44: the count line is English with a singular", () => {
  const props = { ...session, user: { ...session.user, locale: "en" as const }, couple } satisfies ComponentProps<
    typeof Wishes
  >;
  const one = render(
    h(Wishes, props),
    { wishesJar: "shared", sharedWishes: sharedWishes(1, 0) } as Partial<TabMemoryValue>,
    "",
    "en",
  );
  expect(one).toContain(">1 wish</p>");
  const many = render(
    h(Wishes, props),
    { wishesJar: "shared", sharedWishes: sharedWishes(5, 2) } as Partial<TabMemoryValue>,
    "",
    "en",
  );
  expect(many).toContain(">5 wishes · 2 done</p>");
});
