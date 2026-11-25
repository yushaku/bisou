import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppUpdateSettings } from "../src/client/components/bisou/AppUpdateSettings";
import { en } from "../src/client/i18n/en";
import { vi as viMessages } from "../src/client/i18n/vi";
import { reloadOnNewVersion, requestAppUpdate, watchForUpdates } from "../src/client/lib/updateReload";

const language = vi.hoisted(() => ({ locale: "vi" }));
vi.mock("../src/client/i18n", () => ({
  useI18n: () => ({ t: (key: keyof typeof en) => (language.locale === "vi" ? viMessages : en)[key] }),
}));
vi.mock("../src/client/lib/useOnline", () => ({ useOnline: () => navigator.onLine }));
vi.mock("../src/client/lib/devicePersist", () => ({ BUILD_ID: "0.0.1-f30480a-build1" }));

afterEach(() => vi.unstubAllGlobals());

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

function manualUpdate(next: ServiceWorker | null = null) {
  const registration = {
    active: {},
    installing: next,
    waiting: null,
    update: vi.fn().mockResolvedValue(undefined),
  };
  const container = {
    getRegistration: vi.fn().mockResolvedValue(registration),
  };
  return { registration, container };
}

it("manual update checks the server and reports the current version when nothing changed", async () => {
  const t = manualUpdate();
  await expect(requestAppUpdate(t.container)).resolves.toBe("current");
  expect(t.registration.update).toHaveBeenCalledOnce();
});

it("manual update waits for the new app shell to activate before reporting completion", async () => {
  const next = Object.assign(new EventTarget(), { state: "installing" });
  const t = manualUpdate(next as ServiceWorker);
  const done = vi.fn();
  const result = requestAppUpdate(t.container).then(done);
  await vi.waitFor(() => expect(t.registration.update).toHaveBeenCalledOnce());
  next.state = "installed";
  next.dispatchEvent(new Event("statechange"));
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  next.state = "activated";
  next.dispatchEvent(new Event("statechange"));
  await result;
  expect(done).toHaveBeenCalledWith("updated");
});

it("manual update reports a version that activated while the check was in flight", async () => {
  const t = manualUpdate();
  t.registration.update.mockImplementation(async () => {
    t.registration.active = {};
  });
  await expect(requestAppUpdate(t.container)).resolves.toBe("updated");
});

it("manual update fails when precaching the new app shell fails", async () => {
  const next = Object.assign(new EventTarget(), { state: "installing" });
  const t = manualUpdate(next as ServiceWorker);
  const result = expect(requestAppUpdate(t.container)).rejects.toThrow("failed to install");
  await vi.waitFor(() => expect(t.registration.update).toHaveBeenCalledOnce());
  next.state = "redundant";
  next.dispatchEvent(new Event("statechange"));
  await result;
});

it("manual update propagates network errors so the UI can offer a retry", async () => {
  const t = manualUpdate();
  t.registration.update.mockRejectedValue(new Error("offline"));
  await expect(requestAppUpdate(t.container)).rejects.toThrow("offline");
});

it("manual update handles an unsupported browser or missing registration without waiting forever", async () => {
  vi.stubGlobal("navigator", {});
  await expect(requestAppUpdate()).resolves.toBe("unavailable");
  await expect(requestAppUpdate({ getRegistration: async () => undefined })).resolves.toBe("unavailable");
});

it.each(["vi", "en"])("settings disables updating and explains connectivity in %s", (locale) => {
  language.locale = locale;
  vi.stubGlobal("navigator", { onLine: false });
  const html = renderToStaticMarkup(createElement(AppUpdateSettings));
  expect(html).toContain('disabled=""');
  expect(html).toContain((locale === "vi" ? viMessages : en)["settings.updateOffline"]);
  expect(html).toContain('aria-describedby="app-update-hint"');
});
