import type { Locale } from "../../shared/types";

const TAGS: Record<Locale, string> = { vi: "vi-VN", en: "en-GB" };

/* 450000 -> "450.000 ₫" (vi) or "₫450,000" (en). VND has no minor unit. */
export function formatVnd(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(TAGS[locale], { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(TAGS[locale]).format(value);
}

/* Dates are calendar days ("YYYY-MM-DD"), read in local time so a day never shifts by time zone. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(day: string | Date, locale: Locale, style: "long" | "short" | "weekday" | "numeric" = "long"): string {
  const date = typeof day === "string" ? parseDay(day) : day;
  const options: Intl.DateTimeFormatOptions =
    style === "numeric"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : style === "short"
        ? { day: "numeric", month: "short" }
        : style === "weekday"
          ? { weekday: "long", day: "numeric", month: "long" }
          : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(TAGS[locale], options).format(date);
}
