import { describe, expect, it } from "vitest";
import { formatMoneyInput } from "../src/client/lib/format";
import { parseVnd } from "../src/client/lib/wishes";

describe("formatMoneyInput", () => {
  it("groups digits as they are typed in each language", () => {
    expect(formatMoneyInput("500000", "vi")).toBe("500.000");
    expect(formatMoneyInput("500000", "en")).toBe("500,000");
    expect(formatMoneyInput("1.234.5678", "vi")).toBe("12.345.678");
  });

  it("starts from 0 and drops a leading zero once a digit is typed", () => {
    expect(formatMoneyInput("", "vi")).toBe("0");
    expect(formatMoneyInput("05", "vi")).toBe("5");
    expect(formatMoneyInput("0", "en")).toBe("0");
  });

  it("ignores anything that is not a digit and caps the length", () => {
    expect(formatMoneyInput("1a2 b3đ", "vi")).toBe("123");
    expect(formatMoneyInput("9".repeat(20), "vi").replace(/\D/g, "")).toHaveLength(15);
  });

  it("reads both locale formats back to the same amount", () => {
    expect(parseVnd(formatMoneyInput("450000", "vi"))).toBe(450000);
    expect(parseVnd(formatMoneyInput("450000", "en"))).toBe(450000);
  });
});

it.each(["1.250.000,50", "1,250,000.00", "1.250.000 d", "1,250,000.5", "1.250.000"])("pasted %s stays in whole VND", (raw) => {
  expect(formatMoneyInput(raw, "vi")).toBe("1.250.000");
});
