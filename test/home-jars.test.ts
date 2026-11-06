import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { wishJarLevels } from "../src/client/lib/wishes";
import { createTabMemory, loadWishes } from "../src/client/lib/tabMemory";
import { readCreateRequest, tabMove } from "../src/client/lib/navigation";

afterEach(() => vi.restoreAllMocks());

describe("Home wish jars", () => {
  it.each([[0, 0], [1, 1], [2, 1], [3, 2], [5, 2], [6, 3], [9, 3], [10, 4], [100, 4]])(
    "%i open wishes fills my jar to level %i", (count, level) => {
      expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: false }).mine).toBe(level);
    },
  );

  it.each([0, 1, 5, 10, 100])("partner level ignores my count %i", (count) => {
    expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: false }).partner).toBe(2);
    expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: true }).partner).toBe(0);
  });

  it("shows empty glass while data is unknown", () => {
    expect(wishJarLevels(null)).toEqual({ mine: 0, partner: 0 });
  });

  it("carries a spin request to Wishes without opening the editor", () => {
    expect(readCreateRequest({ create: "spin" })).toBe("spin");
    expect(tabMove("/", undefined, "/wishes", "spin")).toBe("push");
  });
});

describe("shared wishes cache", () => {
  it("shares the pending request across tabs and reuses the result", async () => {
    const memory = createTabMemory();
    const jar = { open: [], received: [], partnerJarEmpty: false };
    const fetch = vi.spyOn(api, "wishes").mockResolvedValue({ ok: true, data: jar });
    const home = loadWishes(memory);
    const wishes = loadWishes(memory);
    await Promise.all([home, wishes]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(memory.wishes).toEqual(jar);
    await loadWishes(memory);
    expect(fetch).toHaveBeenCalledTimes(1);
    await loadWishes(memory, true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps cached data after a refresh failure and allows retry", async () => {
    const memory = createTabMemory();
    const jar = { open: [], received: [], partnerJarEmpty: true };
    memory.wishes = jar;
    const fetch = vi.spyOn(api, "wishes").mockResolvedValue({ ok: false, status: 503, error: null });
    expect((await loadWishes(memory, true)).ok).toBe(false);
    expect(memory.wishes).toBe(jar);
    fetch.mockResolvedValue({ ok: true, data: { ...jar, partnerJarEmpty: false } });
    expect((await loadWishes(memory, true)).ok).toBe(true);
    expect(memory.wishes?.partnerJarEmpty).toBe(false);
  });
});
