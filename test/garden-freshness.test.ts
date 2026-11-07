import { expect, it } from "vitest";
import { freshness, plantStage } from "../src/shared/garden";

it("R23 R24 R25 AC2 AC15: eight plant sizes grow one size each play day and stop at a full tree", () => {
  expect(Array.from({ length: 10 }, (_, days) => plantStage(days))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 7]);
  expect(plantStage(-1)).toBe(0);
});
it("R26 R28 AC14: fresh through two days, yellow from three, drooping from fourteen", () => {
  for (const [day, expected] of [["2026-11-09", "fresh"], ["2026-11-11", "fresh"], ["2026-11-12", "dry"], ["2026-11-22", "dry"], ["2026-11-23", "wilted"]]) {
    expect(freshness("2026-11-09", day!)).toBe(expected);
  }
});
