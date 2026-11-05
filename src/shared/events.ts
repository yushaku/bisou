import { addDays, anniversaryDate, daysBetween, daysTogether } from "./days";

export const DAY_EVENT_STEP = 1000;
export const HOLIDAYS = { valentine: "02-14", womensDay: "03-08", vnWomensDay: "10-20", mensDay: "11-19" } as const;
export type Holiday = keyof typeof HOLIDAYS;
export type UpcomingEvent = { date: string; daysLeft: number } & (
  | { kind: "anniversary"; years: number }
  | { kind: "days"; days: number }
  | { kind: "birthday"; name: string; age: number }
  | { kind: "holiday"; holiday: Holiday }
);

const ORDER = { anniversary: 0, days: 1, birthday: 2, holiday: 3 };

/** Today included, the same calendar day next year excluded; ties follow R7. */
export function upcomingEvents(startDate: string | null, people: { name: string; birthDate: string | null }[], today: string): UpcomingEvent[] {
  const end = anniversaryDate(today, 1);
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
  return events.sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind]
    || (a.kind === "birthday" && b.kind === "birthday" ? a.name.localeCompare(b.name) : 0));
}
