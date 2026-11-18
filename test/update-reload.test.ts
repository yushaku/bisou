import { expect, it, vi } from "vitest";
import {
  createUpdatePolicy,
  reloadOnNewVersion,
  shouldCheckForUpdate,
  UPDATE_CHECK_INTERVAL,
} from "../src/client/lib/updateReload";

function setup(controller: unknown, visibilityState: DocumentVisibilityState) {
  const worker = Object.assign(new EventTarget(), { controller }) as unknown as ServiceWorkerContainer;
  const doc = Object.assign(new EventTarget(), { visibilityState }) as unknown as Document;
  const reload = vi.fn();
  const policy = reloadOnNewVersion(worker, reload, doc);
  return {
    reload,
    policy,
    takeover: () => worker.dispatchEvent(new Event("controllerchange")),
    show: (state: DocumentVisibilityState) => {
      Object.assign(doc, { visibilityState: state });
      doc.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

it("pwa AC8 R8: a new version taking control does not reload an app that is on screen", () => {
  const t = setup({}, "visible");
  t.takeover();
  expect(t.reload).not.toHaveBeenCalled();
});

it("pwa AC8 R8: the pending update is applied once, when the app is hidden", () => {
  const t = setup({}, "visible");
  t.takeover();
  t.show("hidden");
  t.show("visible");
  t.show("hidden");
  expect(t.reload).toHaveBeenCalledOnce();
});

it("pwa AC8 R8: a new version taking control while the app is hidden reloads at once, once", () => {
  const t = setup({}, "hidden");
  t.takeover();
  t.takeover();
  expect(t.reload).toHaveBeenCalledOnce();
});

it("pwa AC8 R8: hiding the app with no update waiting does not reload", () => {
  const t = setup({}, "visible");
  t.show("hidden");
  expect(t.reload).not.toHaveBeenCalled();
});

it("pwa AC8 R8: the first install, with no previous controller, never reloads", () => {
  const t = setup(null, "hidden");
  t.takeover();
  t.show("hidden");
  expect(t.reload).not.toHaveBeenCalled();
});

it("pwa AC8 R8: a missing lazy chunk reloads only when an update is waiting", () => {
  const none = createUpdatePolicy(vi.fn());
  const reload = vi.fn();
  const waiting = createUpdatePolicy(reload);
  none.chunkLoadFailed();
  waiting.updateReady(true);
  waiting.chunkLoadFailed();
  waiting.chunkLoadFailed();
  expect(reload).toHaveBeenCalledOnce();
});

it("pwa R8: checks for a new deploy at most once an hour", () => {
  expect(shouldCheckForUpdate(null, 5)).toBe(true);
  expect(shouldCheckForUpdate(1000, 1000 + UPDATE_CHECK_INTERVAL - 1)).toBe(false);
  expect(shouldCheckForUpdate(1000, 1000 + UPDATE_CHECK_INTERVAL)).toBe(true);
});
