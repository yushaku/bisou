/* Skip the first install, which needs no reload, and reload once for subsequent takeovers. */
export function reloadOnNewVersion(worker: ServiceWorkerContainer, reload: () => void) {
  let hadController = Boolean(worker.controller);
  let reloading = false;
  worker.addEventListener("controllerchange", () => {
    if (hadController && !reloading) {
      reloading = true;
      reload();
    }
    hadController = true;
  });
}

export function watchForUpdates(
  registration: Pick<ServiceWorkerRegistration, "update">,
  doc: Pick<Document, "addEventListener" | "visibilityState"> = document,
  win: Pick<Window, "addEventListener"> = window,
) {
  let checking = false;
  const check = async () => {
    if (checking || doc.visibilityState !== "visible") return;
    checking = true;
    try {
      await registration.update();
    } catch {
      // Offline or unavailable: retry on the next resume or reconnection.
    } finally {
      checking = false;
    }
  };
  doc.addEventListener("visibilitychange", () => void check());
  win.addEventListener("online", () => void check());
}
