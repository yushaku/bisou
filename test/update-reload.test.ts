import { expect, it, vi } from "vitest";
import { reloadOnNewVersion, watchForUpdates } from "../src/client/lib/updateReload";

function setup(controller: unknown) {
  const worker = Object.assign(new EventTarget(), { controller }) as unknown as ServiceWorkerContainer;
  const reload = vi.fn();
  reloadOnNewVersion(worker, reload);
  return { reload, takeover: () => worker.dispatchEvent(new Event("controllerchange")) };
}

it("pwa AC8 R8: a new version taking control reloads the visible app immediately, once", () => {
  const t = setup({});
  t.takeover();
  expect(t.reload).toHaveBeenCalledOnce();
  t.takeover();
  expect(t.reload).toHaveBeenCalledOnce();
});

it("pwa AC8 R8: first install skips reload, but a later update in the same page reloads", () => {
  const t = setup(null);
  t.takeover();
  expect(t.reload).not.toHaveBeenCalled();
  t.takeover();
  expect(t.reload).toHaveBeenCalledOnce();
});

function setupChecks() {
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const win = new EventTarget();
  const update = vi.fn<() => Promise<ServiceWorkerRegistration>>().mockResolvedValue({} as ServiceWorkerRegistration);
  watchForUpdates({ update }, doc as Document, win);
  return {
    update,
    online: () => win.dispatchEvent(new Event("online")),
    show: (visibilityState: DocumentVisibilityState) => {
      doc.visibilityState = visibilityState;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

it("checks on every resume, including two openings within an hour", async () => {
  const t = setupChecks();
  t.show("hidden");
  expect(t.update).not.toHaveBeenCalled();
  t.show("visible");
  expect(t.update).toHaveBeenCalledOnce();
  await Promise.resolve();
  t.show("hidden");
  t.show("visible");
  expect(t.update).toHaveBeenCalledTimes(2);
});

it("checks on reconnection without overlapping a resume check", async () => {
  const t = setupChecks();
  t.show("visible");
  t.online();
  expect(t.update).toHaveBeenCalledOnce();
  await Promise.resolve();
  t.online();
  expect(t.update).toHaveBeenCalledTimes(2);
});

it("retries a failed update check on the next resume", async () => {
  const t = setupChecks();
  t.update.mockRejectedValueOnce(new Error("offline"));
  t.show("visible");
  await Promise.resolve();
  t.show("hidden");
  t.show("visible");
  expect(t.update).toHaveBeenCalledTimes(2);
});

it("does not check for updates on reconnection while hidden", () => {
  const t = setupChecks();
  t.show("hidden");
  t.online();
  expect(t.update).not.toHaveBeenCalled();
});
