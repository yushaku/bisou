import { createElement as h, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/client/api";
import { createTabMemory, TabMemory } from "../src/client/lib/tabMemory";
import { useWishJar } from "../src/client/lib/useWishJar";

vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: vi.fn() }));

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("refreshes on tab entry, shares the pending request and keeps the cached jar visible", async () => {
  const memory = createTabMemory();
  const cached = { open: [], received: [], partnerJarEmpty: true };
  memory.wishes = cached;
  const fresh = { ...cached, partnerJarEmpty: false };
  let resolve!: (result: Awaited<ReturnType<typeof api.wishes>>) => void;
  const response = new Promise<Awaited<ReturnType<typeof api.wishes>>>((done) => { resolve = done; });
  const fetch = vi.spyOn(api, "wishes").mockReturnValue(response);
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("window", new EventTarget());
  const signedOut = vi.fn();
  function Tab() {
    const { jar } = useWishJar(signedOut);
    return h("span", null, jar?.partnerJarEmpty ? "empty" : "ready");
  }
  const render = () => renderToString(h(TabMemory.Provider, { value: memory }, h(Tab)));
  expect(render()).toContain("empty");
  const cleanupHome = vi.mocked(useEffect).mock.calls.at(-1)![0]();
  expect(render()).toContain("empty");
  const cleanupWishes = vi.mocked(useEffect).mock.calls.at(-1)![0]();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(memory.wishes).toBe(cached);
  resolve({ ok: true, data: fresh });
  await memory.wishesRequest;
  expect(render()).toContain("ready");
  expect(signedOut).not.toHaveBeenCalled();
  cleanupHome?.();
  cleanupWishes?.();
});
