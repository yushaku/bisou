import { addDays, anniversaryDate, daysBetween, daysTogether, isValidDay } from "./days";

import type { ApiError, CoupleEvent, CoupleEventInput } from "./types";

export const EVENT_ICONS = ["heart", "plane", "music", "dinner", "gift", "cake", "family", "star"] as const;
export type EventIcon = (typeof EVENT_ICONS)[number];
export const EVENT_TITLE_MAX = 60;
export const EVENTS_MAX = 100;

export function validateEvent(body: unknown, earliest: string, current?: CoupleEventInput): { input: CoupleEventInput } | ApiError {
  if (!body || typeof body !== "object") return { error: "invalid_body" };
  const { title, date, repeat, icon } = body as Record<string, unknown>;
  if (typeof title !== "string" || /[\p{Cc}\u202a-\u202e\u2066-\u2069]/u.test(title)
    || !title.replace(/\p{Cf}/gu, "").trim() || Array.from(title.trim()).length > EVENT_TITLE_MAX) return { error: "event_title_invalid" };
  if ((repeat !== "once" && repeat !== "yearly") || typeof icon !== "string" || !(EVENT_ICONS as readonly string[]).includes(icon)) return { error: "invalid_body" };
  if (!isValidDay(date) || (repeat === "once" && date < earliest && !(date === current?.date && repeat === current.repeat))) return { error: "event_date_invalid" };
  return { input: { title: title.trim(), date, repeat, icon: icon as EventIcon } };
}

export const DAY_EVENT_STEP = 1000;
export const HOLIDAYS = { valentine: "02-14", womensDay: "03-08", vnWomensDay: "10-20", mensDay: "11-19" } as const;
export type Holiday = keyof typeof HOLIDAYS;
export type UpcomingEvent = { date: string; daysLeft: number } & (
  | { kind: "anniversary"; years: number }
  | { kind: "days"; days: number }
  | { kind: "birthday"; name: string; age: number }
  | { kind: "holiday"; holiday: Holiday }
  | { kind: "custom"; id: string; title: string; icon: EventIcon; years: number; createdAt: number; later: boolean }
);

const ORDER = { anniversary: 0, days: 1, birthday: 2, holiday: 3, custom: 4 };

/** Today included, the same calendar day next year excluded (March 1 for February 29); ties follow R7. */
export function upcomingEvents(startDate: string | null, people: { name: string; birthDate: string | null }[], today: string, custom: CoupleEvent[] = []): UpcomingEvent[] {
  const end = addDays(anniversaryDate(today, 1), today.slice(5) === "02-29" ? 1 : 0);
  const events: UpcomingEvent[] = [];
  const add = (event: UpcomingEvent) => {
    if (event.date >= today && event.date < end) events.push(event);
  };
  const timing = (date: string) => ({ date, daysLeft: daysBetween(today, date) });
  const year = Number(today.slice(0, 4));

  for (const eventYear of [year, year + 1]) {
    if (startDate) {
      const years = eventYear - Number(startDate.slice(0, 4));
      if (years >= 1) add({ kind: "anniversary", years, ...timing(anniversaryDate(startDate, years)) });
    }
    for (const person of people) {
      if (!person.birthDate) continue;
      const age = eventYear - Number(person.birthDate.slice(0, 4));
      if (age >= 0) add({ kind: "birthday", name: person.name, age, ...timing(anniversaryDate(person.birthDate, age)) });
    }
    for (const holiday of Object.keys(HOLIDAYS) as Holiday[]) {
      add({ kind: "holiday", holiday, ...timing(`${eventYear}-${HOLIDAYS[holiday]}`) });
    }
  }
  if (startDate) {
    const days = Math.ceil(Math.max(1, daysTogether(startDate, today)) / DAY_EVENT_STEP) * DAY_EVENT_STEP;
    add({ kind: "days", days, ...timing(addDays(startDate, days - 1)) });
  }
  for (const event of custom) {
    let years = 0;
    let date = event.date;
    if (event.repeat === "yearly") {
      years = Math.max(0, year - Number(date.slice(0, 4)));
      if (anniversaryDate(event.date, years) < today) years++;
      date = anniversaryDate(event.date, years);
    }
    if (date < today) continue;
    events.push({ kind: "custom", id: event.id, title: event.title, icon: event.icon, createdAt: event.createdAt, years, later: date >= end, ...timing(date) });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind]
    || (a.kind === "birthday" && b.kind === "birthday" ? a.name.localeCompare(b.name) : 0)
    || (a.kind === "custom" && b.kind === "custom" ? a.createdAt - b.createdAt || a.id.localeCompare(b.id) : 0));
}
