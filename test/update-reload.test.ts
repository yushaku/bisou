import { expect, it, vi } from "vitest";
import { reloadOnNewVersion } from "../src/client/lib/updateReload";

function worker(controller: unknown) {
  const target = new EventTarget();
  return Object.assign(target, { controller }) as unknown as ServiceWorkerContainer;
}

it("AC8 R8: reloads at once, without asking, when a new version takes control", () => {
  const sw = worker({});
  const reload = vi.fn();
  reloadOnNewVersion(sw, reload);
  sw.dispatchEvent(new Event("controllerchange"));
  expect(reload).toHaveBeenCalledOnce();
});

it("AC8 R8: reloads only once however many takeovers fire", () => {
  const sw = worker({});
  const reload = vi.fn();
  reloadOnNewVersion(sw, reload);
  sw.dispatchEvent(new Event("controllerchange"));
  sw.dispatchEvent(new Event("controllerchange"));
  expect(reload).toHaveBeenCalledOnce();
});

it("AC8 R8: the first install, with no previous controller, does not reload", () => {
  const sw = worker(null);
  const reload = vi.fn();
  reloadOnNewVersion(sw, reload);
  sw.dispatchEvent(new Event("controllerchange"));
  expect(reload).not.toHaveBeenCalled();
});
