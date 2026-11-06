/*
 * When a new deploy takes control, reload once so the new app shell is used.
 * Skip the first install (no previous controller), which needs no reload.
 */
export function reloadOnNewVersion(worker: ServiceWorkerContainer, reload: () => void) {
  const hadController = Boolean(worker.controller);
  let reloading = false;
  worker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    reload();
  });
}
