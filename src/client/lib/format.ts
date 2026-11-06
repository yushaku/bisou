import type { Locale } from "../../shared/types";

const TAGS: Record<Locale, string> = { vi: "vi-VN", en: "en-GB" };

/* 450000 -> "450.000 ₫" (vi) or "₫450,000" (en). VND has no minor unit. */
export function formatVnd(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(TAGS[locale], { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(TAGS[locale]).format(value);
}

/* A money field as typed: digits only, grouped ("500000" -> "500.000" vi, "500,000" en), empty reads "0", at most 15 digits. */
export function formatMoneyInput(raw: string, locale: Locale): string {
  const digits = raw.replace(/[.,]\d{1,2}\D*$/, "").replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
  return digits ? formatNumber(Number(digits), locale) : "0";
}

/* Dates are calendar days ("YYYY-MM-DD"), read in local time so a day never shifts by time zone. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(day: string | Date, locale: Locale, style: "long" | "short" | "weekday" | "numeric" | "month" = "long"): string {
  const date = typeof day === "string" ? parseDay(day) : day;
  const options: Intl.DateTimeFormatOptions =
    style === "month"
      ? { month: "long", year: "numeric" }
      : style === "numeric"
        ? { day: "2-digit", month: "2-digit", year: "numeric" }
        : style === "short"
          ? { day: "numeric", month: "short" }
          : style === "weekday"
            ? { weekday: "long", day: "numeric", month: "long" }
            : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(TAGS[locale], options).format(date);
}

/* Local clock time of an epoch: "22:00" in both languages. */
export function formatTime(epochMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(TAGS[locale], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(epochMs);
}
