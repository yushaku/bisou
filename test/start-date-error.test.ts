import { describe, expect, it } from "vitest";
import { startDateError } from "../src/client/lib/startDate";

describe("start date errors shared by Home and Settings", () => {
  const t = (key: string) => key;

  it("explains a network failure", () => {
    expect(startDateError(t, 0, null)).toBe("error.network");
  });

  it("explains an invalid date", () => {
    expect(startDateError(t, 400, { error: "invalid_start_date" })).toBe("error.invalid_start_date");
  });

  it("uses a generic error for other server failures or missing bodies", () => {
    expect(startDateError(t, 500, { error: "server_error" })).toBe("error.generic");
    expect(startDateError(t, 403, null)).toBe("error.generic");
  });
});
