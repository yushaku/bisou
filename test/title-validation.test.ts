import { describe, expect, it } from "vitest";
import { validateEvent } from "../src/shared/events";
import { validateWish } from "../src/shared/wishes";

const controls = [
  ["NUL", "\u0000"], ["newline", "\n"], ["tab", "\t"], ["carriage return", "\r"],
  ["DEL", "\u007f"], ["C1 control", "\u0085"],
  ["LRE", "\u202a"], ["RLE", "\u202b"], ["PDF", "\u202c"], ["LRO", "\u202d"], ["RLO", "\u202e"],
  ["LRI", "\u2066"], ["RLI", "\u2067"], ["FSI", "\u2068"], ["PDI", "\u2069"],
];

describe.each([
  { feature: "event", error: "event_title_invalid", validate: (title: string) => validateEvent({ title, date: "2026-12-20", repeat: "once", icon: "heart" }, "2026-11-06") },
  { feature: "wish", error: "wish_title_invalid", validate: (title: string) => validateWish({ title }) },
])("$feature title validation", ({ validate, error }) => {
  it.each(controls)("rejects %s before trimming", (_name, control) => {
    for (const title of [`${control}Trip`, `Tr${control}ip`, `Trip${control}`]) {
      expect(validate(title)).toEqual({ error });
    }
  });
  it.each(["\u200b", " \u200b \u200d ", "\u2060", "\u00ad"])("rejects an invisible-only title %j", (title) => {
    expect(validate(title)).toEqual({ error });
  });
  it("preserves ZWJ emoji and visible text containing format characters", () => {
    for (const title of ["👩‍❤️‍👨", "Đi Đà Lạt", "A\u200bB"]) {
      expect(validate(`  ${title}  `)).toMatchObject({ input: { title } });
    }
  });
});

describe("wish link validation", () => {
  it.each(controls)("rejects %s before URL parsing", (_name, control) => {
    for (const link of [`${control}https://example.com`, `https://example.com/${control}gift`, `https://example.com${control}`]) {
      expect(validateWish({ title: "Scarf", link })).toEqual({ error: "wish_link_invalid" });
    }
  });
  it("keeps ordinary links and ZWJ emoji in paths valid", () => {
    for (const link of ["https://example.com", "https://example.com/👩‍❤️‍👨"]) {
      expect(validateWish({ title: "Scarf", link: ` ${link} ` })).toMatchObject({ input: { link: new URL(link).href } });
    }
  });
});
