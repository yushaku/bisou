import { describe, expect, it } from "vitest";
import { eventTitle, upcomingEvents, type UpcomingEvent } from "../src/shared/events";
import { vi, type MessageKey } from "../src/client/i18n/vi";
import { en } from "../src/client/i18n/en";

const people = [
  { name: "An", birthDate: "1997-11-18" },
  { name: "Binh", birthDate: "1996-01-03" },
];
const start = "2023-02-12";

it("notifications R10 R31: shared event titles preserve the on-screen names and number formatting", () => {
  const timing = { date: "2027-02-12", daysLeft: 1 };
  const events: UpcomingEvent[] = [
    { ...timing, kind: "anniversary", years: 4 }, { ...timing, kind: "days", days: 1000 },
    { ...timing, kind: "birthday", name: "An", age: 30 }, { ...timing, kind: "holiday", holiday: "valentine" },
    { ...timing, kind: "custom", id: "custom", title: "Trip", icon: "plane", years: 1, createdAt: 0, later: false },
  ];
  const translate = (locale: "vi" | "en") => (key: MessageKey, vars: Record<string, string | number> = {}) =>
    (locale === "vi" ? vi : en)[key].replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name]));
  expect(events.map((event) => eventTitle(event, translate("vi"), "vi")))
    .toEqual(["Kỷ niệm 4 năm", "Ngày thứ 1.000", "Sinh nhật An", "Lễ Tình nhân", "Trip (1 năm)"]);
  expect(events.map((event) => eventTitle(event, translate("en"), "en")))
    .toEqual(["4 year anniversary", "Day 1,000", "An’s birthday", "Valentine’s Day", "Trip (1 year)"]);
});

describe("upcoming events", () => {
  it("events AC3 R12: returns the seven running-example events in date order", () => {
    expect(upcomingEvents(start, people, "2026-11-05")).toEqual([
      { kind: "birthday", name: "An", age: 29, date: "2026-11-18", daysLeft: 13 },
      { kind: "holiday", holiday: "mensDay", date: "2026-11-19", daysLeft: 14 },
      { kind: "birthday", name: "Binh", age: 31, date: "2027-01-03", daysLeft: 59 },
      { kind: "anniversary", years: 4, date: "2027-02-12", daysLeft: 99 },
      { kind: "holiday", holiday: "valentine", date: "2027-02-14", daysLeft: 101 },
      { kind: "holiday", holiday: "womensDay", date: "2027-03-08", daysLeft: 123 },
      { kind: "holiday", holiday: "vnWomensDay", date: "2027-10-20", daysLeft: 349 },
    ]);
  });
  it("events AC2 R9 R11: Home takes the next three with 13, 14 and 59 days left", () => {
    expect(upcomingEvents(start, people, "2026-11-05").slice(0, 3).map((e) => [e.kind, e.daysLeft])).toEqual([
      ["birthday", 13], ["holiday", 14], ["birthday", 59],
    ]);
  });
  it("events AC4 R8 R9 R10: keeps today, shows tomorrow, and rolls over with the supplied local day", () => {
    const today = upcomingEvents(start, people, "2026-11-18");
    expect(today.slice(0, 3).map((e) => e.daysLeft)).toEqual([0, 1, 46]);
    expect(today[0]).toMatchObject({ kind: "birthday", name: "An" });
    const tomorrow = upcomingEvents(start, people, "2026-11-19");
    expect(tomorrow[0]).toMatchObject({ kind: "holiday", holiday: "mensDay", daysLeft: 0 });
    expect(tomorrow.filter((e) => e.kind === "birthday" && e.name === "An")).toEqual([
      { kind: "birthday", name: "An", age: 30, date: "2027-11-18", daysLeft: 364 },
    ]);
  });
  it("events AC5 R2 R3: without a start date only birthdays and holidays appear; missing birthdays add nothing", () => {
    const events = upcomingEvents(null, [...people, { name: "Unknown", birthDate: null }], "2026-11-05");
    expect(events).toHaveLength(6);
    expect(events.every((e) => e.kind === "birthday" || e.kind === "holiday")).toBe(true);
    expect(upcomingEvents(null, [], "2026-11-05")).toHaveLength(4);
  });
  it("events AC6 R4: all four holidays are named without a partner", () => {
    expect(upcomingEvents(null, [], "2027-01-01").map((e) => [e.date, e.kind === "holiday" && e.holiday])).toEqual([
      ["2027-02-14", "valentine"], ["2027-03-08", "womensDay"], ["2027-10-20", "vnWomensDay"], ["2027-11-19", "mensDay"],
    ]);
  });
  it.each([["2027-02-01", "2027-02-28", 3], ["2028-02-01", "2028-02-29", 4]])(
    "events AC7 R5: leap birthday and anniversary from %s fall on %s", (today, date, years) => {
      const events = upcomingEvents("2024-02-29", [{ name: "An", birthDate: "2024-02-29" }], String(today));
      expect(events.filter((e) => e.kind === "anniversary" || e.kind === "birthday")).toEqual([
        expect.objectContaining({ kind: "anniversary", date, years }),
        expect.objectContaining({ kind: "birthday", date, age: years }),
      ]);
    },
  );
  it("events AC8 R6: shows the age reached on the event day", () => {
    expect(upcomingEvents(start, people, "2027-01-03")[0]).toMatchObject({ kind: "birthday", name: "Binh", age: 31, daysLeft: 0 });
  });
  it("events AC9 R7: anniversary precedes birthdays and birthdays sort by display name", () => {
    const events = upcomingEvents(start, [
      { name: "Binh", birthDate: "1996-02-12" }, { name: "An", birthDate: "1997-02-12" },
    ], "2027-02-12");
    expect(events.slice(0, 3)).toMatchObject([
      { kind: "anniversary", daysLeft: 0 }, { kind: "birthday", name: "An", daysLeft: 0 }, { kind: "birthday", name: "Binh", daysLeft: 0 },
    ]);
  });
  it("events AC9 R7: a thousandth day precedes birthdays and holidays on the same date", () => {
    expect(upcomingEvents("2024-02-24", [{ name: "An", birthDate: "1997-11-19" }], "2026-11-19").slice(0, 3)).toMatchObject([
      { kind: "days", days: 1000, daysLeft: 0 }, { kind: "birthday", name: "An", daysLeft: 0 }, { kind: "holiday", holiday: "mensDay", daysLeft: 0 },
    ]);
  });
  it.each([["2023-02-12", "2025-11-01", "2025-11-07"], ["2024-02-12", "2026-11-01", "2026-11-07"]])(
    "events AC13 R2: %s produces Day 1000 in six days and no 100-day events", (startDate, today, date) => {
      expect(upcomingEvents(startDate, [], today).filter((e) => e.kind === "days")).toEqual([
        { kind: "days", days: 1000, date, daysLeft: 6 },
      ]);
      expect(upcomingEvents(startDate, [], date).find((e) => e.kind === "days")).toMatchObject({ days: 1000, daysLeft: 0 });
    },
  );
  it("events AC3 R12: includes today and excludes the same day next year", () => {
    const today = "2026-11-18";
    const events = upcomingEvents(null, [{ name: "An", birthDate: today }], today).filter((e) => e.kind === "birthday");
    expect(events).toEqual([{ kind: "birthday", name: "An", age: 0, date: today, daysLeft: 0 }]);
  });
  it.each(["2024-02-28", "2024-02-29"])("events R11: a leap-day window includes next February 28 for %s and excludes next March 1", (date) => {
    const events = upcomingEvents(date, [
      { name: "An", birthDate: date }, { name: "Binh", birthDate: "2024-03-01" },
    ], "2028-02-29");
    expect(events.filter((e) => e.date >= "2029-01-01" && (e.kind === "anniversary" || e.kind === "birthday"))).toEqual([
      { kind: "anniversary", years: 5, date: "2029-02-28", daysLeft: 365 },
      { kind: "birthday", name: "An", age: 5, date: "2029-02-28", daysLeft: 365 },
    ]);
  });
  it("events R2: the start day is not a zero-year anniversary", () => {
    expect(upcomingEvents("2026-11-05", [], "2026-11-05").some((e) => e.kind === "anniversary")).toBe(false);
  });
});

describe("custom events", () => {
  const trip = { id: "trip", title: "Bay đi Đà Lạt", date: "2026-12-20", repeat: "once" as const, icon: "plane" as const, createdAt: 1 };
  const japan = { ...trip, id: "japan", title: "Đi Nhật", date: "2028-04-10", createdAt: 2 };
  const family = { ...trip, id: "family", title: "Ngày gặp bố mẹ", date: "2024-06-01", repeat: "yearly" as const, icon: "family" as const };
  it("events AC2 R8 R18: merges the running example and Home's first three", () => {
    const events = upcomingEvents(start, people, "2026-11-06", [trip, japan, family]);
    expect(events.map(e => e.date)).toEqual(["2026-11-18", "2026-11-19", "2026-12-20", "2027-01-03", "2027-02-12", "2027-02-14", "2027-03-08", "2027-06-01", "2027-10-20", "2028-04-10"]);
    expect(events.slice(0, 3).map(e => e.daysLeft)).toEqual([12, 13, 44]);
    expect(events.find(e => e.kind === "custom" && e.id === "family")).toMatchObject({ years: 3, later: false });
  });
  it("events AC12 R18: moves the trip out of Later on 2027-04-11, excluding the exact year boundary", () => {
    for (const [today, later] of [["2027-04-10", true], ["2027-04-11", false]] as const) {
      expect(upcomingEvents(null, [], today, [japan]).find(e => e.kind === "custom")).toMatchObject({ later });
    }
  });
  it("events AC5 R3: repeats February 29 on February 28", () => {
    expect(upcomingEvents(null, [], "2029-01-01", [{ ...family, date: "2028-02-29" }]).find(e => e.kind === "custom")).toMatchObject({ date: "2029-02-28", years: 1 });
  });
  it("events AC6 R11: keeps a one-off today and hides it tomorrow", () => {
    expect(upcomingEvents(null, [], trip.date, [trip]).find(e => e.kind === "custom")).toMatchObject({ daysLeft: 0 });
    expect(upcomingEvents(null, [], "2026-12-21", [trip]).some(e => e.kind === "custom")).toBe(false);
  });
  it("events AC7 R10: computed events precede customs ordered by creation time then id", () => {
    const events = upcomingEvents(start, [], "2027-02-12", [
      { ...trip, date: "2027-02-12", id: "b", createdAt: 2 },
      { ...trip, date: "2027-02-12", id: "c", createdAt: 1 },
      { ...trip, date: "2027-02-12", id: "a", createdAt: 2 },
    ]).slice(0, 4);
    expect(events.map(e => e.kind === "custom" ? e.id : e.kind)).toEqual(["anniversary", "c", "a", "b"]);
  });
  it("events AC13 R9: counts years since the first date, including a future first date", () => {
    for (const [today, years] of [["2026-06-01", 0], ["2027-06-01", 0], ["2028-06-01", 1]] as const) {
      expect(upcomingEvents(null, [], today, [{ ...family, date: "2027-06-01" }]).find(e => e.kind === "custom")).toMatchObject({ years });
    }
  });
});
