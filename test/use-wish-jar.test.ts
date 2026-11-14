import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { useWishJar } from "../src/client/lib/useWishJar";
import { queries } from "../src/client/lib/queries";
import { testQueryClient } from "./query-fixture";

afterEach(() => vi.restoreAllMocks());

it("shares a pending refresh across tabs while showing the cached jar", async () => {
  const cached = { open: [], received: [], partnerJarEmpty: true };
  testQueryClient.setQueryData(queries.wishes.queryKey, cached);
  const fresh = { ...cached, partnerJarEmpty: false };
  let resolve!: (result: Awaited<ReturnType<typeof api.wishes>>) => void;
  const response = new Promise<Awaited<ReturnType<typeof api.wishes>>>(done => { resolve = done; });
  const request = vi.spyOn(api, "wishes").mockReturnValue(response);
  function Tab() {
    const { jar } = useWishJar(vi.fn());
    return h("span", null, jar?.partnerJarEmpty ? "empty" : "ready");
  }
  const home = testQueryClient.fetchQuery({ ...queries.wishes, staleTime: 0 });
  const wishes = testQueryClient.fetchQuery({ ...queries.wishes, staleTime: 0 });
  expect(renderToString(h(Tab))).toContain("empty");
  expect(request).toHaveBeenCalledTimes(1);
  resolve({ ok: true, data: fresh });
  await Promise.all([home, wishes]);
  expect(renderToString(h(Tab))).toContain("ready");
});

it("keeps the cached jar without an error state when refresh fails", async () => {
  const cached = { open: [], received: [], partnerJarEmpty: true };
  testQueryClient.setQueryData(queries.wishes.queryKey, cached);
  vi.spyOn(api, "wishes").mockResolvedValue({ ok: false, status: 0, error: null });
  let refresh!: () => Promise<void>;
  function Tab() {
    const state = useWishJar(vi.fn()); refresh = state.refresh;
    return h("span", null, state.failed ? "error" : "cached");
  }
  renderToString(h(Tab));
  await refresh();
  expect(testQueryClient.getQueryData(queries.wishes.queryKey)).toBe(cached);
  expect(renderToString(h(Tab))).toContain("cached");
});
