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

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/* Whole calendar days from start to end (DST safe). */
export function daysBetween(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

export interface Anniversary {
  years: number;
  date: Date;
  daysLeft: number;
}

/* The next yearly anniversary on or after today. */
export function nextAnniversary(start: Date, today: Date): Anniversary {
  const on = (years: number) => new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  let years = Math.max(1, today.getFullYear() - start.getFullYear());
  if (daysBetween(today, on(years)) < 0) years += 1;
  const date = on(years);
  return { years, date, daysLeft: daysBetween(today, date) };
}
