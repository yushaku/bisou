import { describe, expect, it } from "vitest";
import {
  addDays,
  anniversaryDate,
  daysTogether,
  isValidDay,
  latestDay,
  nextMilestone,
  toDayString,
  utcDayString,
} from "../src/shared/days";

describe("isValidDay", () => {
  it("accepts real calendar dates only", () => {
    expect(isValidDay("2023-02-14")).toBe(true);
    expect(isValidDay("2024-02-29")).toBe(true);
    expect(isValidDay("2000-02-29")).toBe(true);
    for (const bad of ["2025-02-29", "1900-02-29", "2023-04-31", "2023-00-10", "2023-1-1", "20230214", "", null, 1]) {
      expect(isValidDay(bad), String(bad)).toBe(false);
    }
    expect(isValidDay("1899-12-31")).toBe(false);
  });
});

describe("day strings", () => {
  it.each([
    ["2026-11-07T09:59:59.999Z", "2026-11-07"],
    ["2026-11-07T10:00:00.000Z", "2026-11-08"],
    ["2026-12-31T10:00:00.000Z", "2027-01-01"],
    ["2024-02-28T10:00:00.000Z", "2024-02-29"],
    ["2025-02-28T10:00:00.000Z", "2025-03-01"],
  ])("AC7 (R8): latest day at %s is %s in UTC+14", (now, expected) => {
    expect(latestDay(Date.parse(now))).toBe(expected);
  });

  it("reads the local calendar date of a Date and the UTC date of an epoch", () => {
    expect(toDayString(new Date(2026, 10, 4, 23, 59))).toBe("2026-11-04");
    expect(toDayString(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
    expect(utcDayString(Date.UTC(2026, 10, 4, 23, 59))).toBe("2026-11-04");
  });

  it("adds days across months, leap days and years", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2023-02-28", 1)).toBe("2023-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daysTogether", () => {
  it("counts inclusively: the start date is day 1", () => {
    expect(daysTogether("2026-11-04", "2026-11-04")).toBe(1);
    expect(daysTogether("2026-11-03", "2026-11-04")).toBe(2);
    expect(daysTogether("2023-02-14", "2026-11-04")).toBe(1360);
  });

  it("counts the leap day", () => {
    expect(daysTogether("2024-02-28", "2024-03-01")).toBe(3);
    expect(daysTogether("2023-02-28", "2023-03-01")).toBe(2);
    expect(daysTogether("2024-01-01", "2024-12-31")).toBe(366);
  });
});

describe("anniversaryDate", () => {
  it("keeps the month and day", () => {
    expect(anniversaryDate("2023-02-14", 1)).toBe("2024-02-14");
    expect(anniversaryDate("2023-02-14", 10)).toBe("2033-02-14");
  });

  it("moves a Feb 29 start to Feb 28 in non leap years", () => {
    expect(anniversaryDate("2024-02-29", 1)).toBe("2025-02-28");
    expect(anniversaryDate("2024-02-29", 3)).toBe("2027-02-28");
    expect(anniversaryDate("2024-02-29", 4)).toBe("2028-02-29");
    expect(anniversaryDate("2096-02-29", 4)).toBe("2100-02-28");
  });
});

describe("nextMilestone", () => {
  it("on the start date, the next milestone is day 100", () => {
    expect(nextMilestone("2026-11-04", "2026-11-04")).toEqual({ kind: "days", days: 100, date: "2027-02-11", daysLeft: 99 });
  });

  it("a milestone that falls today has daysLeft 0", () => {
    expect(nextMilestone("2026-01-01", "2026-04-10")).toEqual({ kind: "days", days: 100, date: "2026-04-10", daysLeft: 0 });
    expect(nextMilestone("2023-02-14", "2026-02-14")).toEqual({ kind: "anniversary", years: 3, date: "2026-02-14", daysLeft: 0 });
  });

  it("the day after a milestone moves on to the next one", () => {
    expect(nextMilestone("2026-01-01", "2026-04-11")).toEqual({ kind: "days", days: 200, date: "2026-07-19", daysLeft: 99 });
  });

  it("picks the nearest of every 100 days and the yearly anniversary", () => {
    // Day 1360: day 1400 (2026-12-14) comes before the 4 year anniversary (2027-02-14).
    expect(nextMilestone("2023-02-14", "2026-11-04")).toEqual({ kind: "days", days: 1400, date: "2026-12-14", daysLeft: 40 });
    // Day 1453: the 4 year anniversary (2027-03-01) comes before day 1500.
    expect(nextMilestone("2023-03-01", "2027-02-20")).toEqual({ kind: "anniversary", years: 4, date: "2027-03-01", daysLeft: 9 });
    // Day 301: the first anniversary comes before day 400.
    expect(nextMilestone("2025-01-01", "2025-10-28")).toEqual({ kind: "anniversary", years: 1, date: "2026-01-01", daysLeft: 65 });
  });

  it("handles Feb 29 starts: the anniversary falls on Feb 28 in non leap years", () => {
    expect(nextMilestone("2024-02-29", "2025-02-20")).toEqual({ kind: "anniversary", years: 1, date: "2025-02-28", daysLeft: 8 });
    expect(nextMilestone("2024-02-29", "2025-02-28")).toEqual({ kind: "anniversary", years: 1, date: "2025-02-28", daysLeft: 0 });
    expect(nextMilestone("2024-02-29", "2028-02-29")).toEqual({ kind: "anniversary", years: 4, date: "2028-02-29", daysLeft: 0 });
  });
});
