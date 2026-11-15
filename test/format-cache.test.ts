import { describe, expect, it } from "vitest";
import type { Locale } from "../src/shared/types";
import { formatDay, formatMoneyInput, formatNumber, formatTime, formatVnd, parseDay } from "../src/client/lib/format";

const TAGS: Record<Locale, string> = { vi: "vi-VN", en: "en-GB" };
const STYLES = ["long", "short", "weekday", "numeric", "month"] as const;
const OPTIONS = {
  month: { month: "long", year: "numeric" },
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
  short: { day: "numeric", month: "short" },
  weekday: { weekday: "long", day: "numeric", month: "long" },
  long: { day: "numeric", month: "long", year: "numeric" },
} satisfies Record<(typeof STYLES)[number], Intl.DateTimeFormatOptions>;

// The formatters as they were before the cache: one new Intl object per call.
const legacyDay = (day: string, locale: Locale, style: (typeof STYLES)[number]) => new Intl.DateTimeFormat(TAGS[locale], OPTIONS[style]).format(parseDay(day));

describe("formatter cache", () => {
  it("formats every day style in both languages exactly as a fresh formatter does, on repeated calls", () => {
    for (const locale of ["vi", "en"] as const) for (const style of STYLES) for (const day of ["2024-02-14", "2026-11-15", "1999-12-31"]) {
      const expected = legacyDay(day, locale, style);
      expect(formatDay(day, locale, style)).toBe(expected);
      expect(formatDay(day, locale, style)).toBe(expected);
    }
  });

  it("keeps the two languages apart after both are cached", () => {
    expect(formatDay("2024-02-14", "vi")).not.toBe(formatDay("2024-02-14", "en"));
    expect(formatDay("2024-02-14", "vi")).toBe(legacyDay("2024-02-14", "vi", "long"));
  });

  it("formats times, money and numbers like a fresh formatter", () => {
    const epoch = new Date(2026, 10, 15, 22, 5).getTime();
    for (const locale of ["vi", "en"] as const) {
      expect(formatTime(epoch, locale)).toBe(new Intl.DateTimeFormat(TAGS[locale], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(epoch));
      expect(formatVnd(450000, locale)).toBe(new Intl.NumberFormat(TAGS[locale], { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(450000));
      expect(formatNumber(1234567, locale)).toBe(new Intl.NumberFormat(TAGS[locale]).format(1234567));
    }
    expect(formatMoneyInput("500000", "vi")).toBe(new Intl.NumberFormat("vi-VN").format(500000));
  });

  it("formats a Date as well as a day string", () => {
    expect(formatDay(new Date(2026, 10, 15), "en", "short")).toBe(legacyDay("2026-11-15", "en", "short"));
  });

  it("builds each formatter once", () => {
    const real = Intl.DateTimeFormat;
    let built = 0;
    Intl.DateTimeFormat = new Proxy(real, { construct(target, args, nt) { built++; return Reflect.construct(target, args, nt); } });
    try {
      for (let i = 0; i < 50; i++) formatDay("2026-11-15", "vi", "weekday");
      expect(built).toBeLessThanOrEqual(1);
    } finally {
      Intl.DateTimeFormat = real;
    }
  });
});
