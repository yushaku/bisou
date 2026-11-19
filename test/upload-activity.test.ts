import type { EffectCallback } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useUploadQueue } from "../src/client/components/bisou/useUploadQueue";
import { api } from "../src/client/api";

const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  effects: [] as EffectCallback[],
  ownership: [] as EffectCallback[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: () => unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial();
    return [
      hooks.values[index],
      (next: (old: unknown) => unknown) => {
        hooks.values[index] = next(hooks.values[index]);
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    return (hooks.values[index] ??= { current: initial });
  },
  useCallback: <T>(value: T) => value,
  useEffect: (effect: EffectCallback) => {
    hooks.effects.push(effect);
  },
  useInsertionEffect: (effect: EffectCallback) => {
    hooks.ownership.push(effect);
  },
}));
vi.mock("../src/client/lib/photo", () => ({
  uploadPhoto: async () => ({ ok: true, data: { photo: { id: "draft-photo" } } }),
}));
afterEach(() => {
  hooks.values = [];
  hooks.effects = [];
  hooks.ownership = [];
  vi.restoreAllMocks();
});

it("hiding a draft retains its uploaded photo until the draft is removed", async () => {
  const remove = vi.spyOn(api, "deletePhoto").mockResolvedValue({ ok: true, data: { ok: true } });
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  const render = () => {
    hooks.index = 0;
    return useUploadQueue();
  };
  const queue = render();
  const dispose = hooks.effects.splice(0).map((effect) => effect());
  const removeDraft = hooks.ownership.splice(0).map((effect) => effect());
  queue.add({ full: new Blob(["photo"]), thumb: new Blob(["thumb"]) });
  render();
  const hide = hooks.effects.splice(0).map((effect) => effect());
  await Promise.resolve();
  for (const cleanup of [...dispose, ...hide]) cleanup?.();
  expect(remove).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled();
  expect(render().items[0]?.photoId).toBe("draft-photo");
  for (const cleanup of removeDraft) cleanup?.();
  expect(remove).toHaveBeenCalledWith("draft-photo");
  expect(revoke).toHaveBeenCalledOnce();
});
