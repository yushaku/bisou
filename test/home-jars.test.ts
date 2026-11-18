import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { wishJarLevels } from "../src/client/lib/wishes";
import { createServerQueryClient } from "../src/client/lib/serverQuery";
import { queries } from "../src/client/lib/queries";
import { readCreateRequest, tabMove } from "../src/client/lib/navigation";

afterEach(() => vi.restoreAllMocks());

describe("Wish jars", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [9, 3],
    [10, 4],
    [100, 4],
  ])("wishes R26: %i open wishes fill my jar to level %i", (count, level) => {
    expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: false }).mine).toBe(level);
  });

  it.each([0, 1, 5, 10, 100])("wishes R27: partner level ignores my count %i", (count) => {
    expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: false }).partner).toBe(2);
    expect(wishJarLevels({ open: { length: count }, partnerJarEmpty: true }).partner).toBe(0);
  });

  it("wishes R27: shows empty glass while data is unknown", () => {
    expect(wishJarLevels(null)).toEqual({ mine: 0, partner: 0 });
  });

  it("wishes R28: carries a spin request to Wishes without opening the editor", () => {
    expect(readCreateRequest({ create: "spin" })).toBe("spin");
    expect(tabMove("/", undefined, "/wishes", "spin")).toBe("push");
  });
});

describe("shared wishes cache", () => {
  it("shares the pending request across tabs and reuses the result", async () => {
    const client = createServerQueryClient();
    const jar = { open: [], received: [], partnerJarEmpty: false };
    const fetch = vi.spyOn(api, "wishes").mockResolvedValue({ ok: true, data: jar });
    const home = client.fetchQuery(queries.wishes);
    const wishes = client.fetchQuery(queries.wishes);
    await Promise.all([home, wishes]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(queries.wishes.queryKey)).toEqual(jar);
    await client.fetchQuery(queries.wishes);
    expect(fetch).toHaveBeenCalledTimes(1);
    await client.fetchQuery({ ...queries.wishes, staleTime: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it("keeps cached data after a refresh failure and allows retry", async () => {
    const client = createServerQueryClient();
    const jar = { open: [], received: [], partnerJarEmpty: true };
    client.setQueryData(queries.wishes.queryKey, jar);
    const fetch = vi.spyOn(api, "wishes").mockResolvedValue({ ok: false, status: 503, error: null });
    await expect(client.fetchQuery({ ...queries.wishes, staleTime: 0 })).rejects.toMatchObject({ status: 503 });
    expect(client.getQueryData(queries.wishes.queryKey)).toBe(jar);
    fetch.mockResolvedValue({ ok: true, data: { ...jar, partnerJarEmpty: false } });
    await client.fetchQuery({ ...queries.wishes, staleTime: 0 });
    expect(client.getQueryData(queries.wishes.queryKey)?.partnerJarEmpty).toBe(false);
    client.clear();
  });
});
