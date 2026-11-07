// Calendar-day helpers for the days-together counter, shared by the client and the Worker.
// A day is a plain "YYYY-MM-DD" string. All arithmetic runs on UTC day numbers, so the
// result never depends on the time zone of the machine that runs it. Only toDayString reads
// the local calendar of a Date (the device's "today").

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** UTC+14 is the earliest time zone to enter a new calendar day. */
export const MAX_UTC_OFFSET = 14 * 60 * 60 * 1000;

/** Earliest accepted start date; guards against typos such as year 0202. */
export const MIN_DAY = "1900-01-01";

function parts(day: string): [number, number, number] | null {
  const m = DAY_RE.exec(day);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** True for a real calendar date written as YYYY-MM-DD, from MIN_DAY on. */
export function isValidDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const p = parts(value);
  if (!p) return false;
  const [y, m, d] = p;
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m) && value >= MIN_DAY;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function fromParts(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** The local calendar date of a Date, as YYYY-MM-DD (the device's "today" on the client). */
export function toDayString(date: Date): string {
  return fromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** The UTC calendar date of an epoch time, as YYYY-MM-DD. */
export function utcDayString(epochMs: number): string {
  const d = new Date(epochMs);
  return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** UTC-12 is the last time zone to leave a calendar day. */
export function earliestDay(nowMs: number): string {
  return utcDayString(nowMs - 12 * 60 * 60 * 1000);
}

export function latestDay(nowMs: number): string {
  return utcDayString(nowMs + MAX_UTC_OFFSET);
}

/** Days since 1970-01-01 (timezone free). */
export function dayNumber(day: string): number {
  const p = parts(day);
  if (!p) throw new Error(`invalid day: ${day}`);
  return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY_MS);
}

export function vnHour(ms: number): number {
  return new Date(ms + 7 * 60 * 60 * 1000).getUTCHours();
}

export function vnDay(ms: number): string {
  return utcDayString(ms + 7 * 60 * 60 * 1000);
}

export function addDays(day: string, n: number): string {
  return utcDayString((dayNumber(day) + n) * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** Inclusive count: the start date itself is day 1. Zero or less when start is after today. */
export function daysTogether(start: string, today: string): number {
  return daysBetween(start, today) + 1;
}

/** The given anniversary; a Feb 29 start falls on Feb 28 in non leap years. */
export function anniversaryDate(start: string, years: number): string {
  const p = parts(start);
  if (!p) throw new Error(`invalid day: ${start}`);
  const year = p[0] + years;
  const day = Math.min(p[2], daysInMonth(year, p[1]));
  return fromParts(year, p[1], day);
}

export type Milestone =
  | { kind: "days"; days: number; date: string; daysLeft: number }
  | { kind: "anniversary"; years: number; date: string; daysLeft: number };

/** Day 100, 200, ... */
export const MILESTONE_STEP = 100;

/**
 * The nearest milestone on or after today: every 100th day (counted inclusively) or a
 * yearly anniversary. A milestone that falls today has daysLeft 0. When both fall on the
 * same day, the anniversary wins.
 */
export function nextMilestone(start: string, today: string): Milestone {
  const current = Math.max(1, daysTogether(start, today));
  const hundred = Math.ceil(current / MILESTONE_STEP) * MILESTONE_STEP;
  const hundredDate = addDays(start, hundred - 1);
  const byDays: Milestone = { kind: "days", days: hundred, date: hundredDate, daysLeft: daysBetween(today, hundredDate) };

  // The anniversary in today's year, or the one after it when that has passed.
  let years = Math.max(1, Number(today.slice(0, 4)) - Number(start.slice(0, 4)));
  if (anniversaryDate(start, years) < today) years += 1;
  const annDate = anniversaryDate(start, years);
  const byYears: Milestone = { kind: "anniversary", years, date: annDate, daysLeft: daysBetween(today, annDate) };

  return byYears.daysLeft <= byDays.daysLeft ? byYears : byDays;
}
