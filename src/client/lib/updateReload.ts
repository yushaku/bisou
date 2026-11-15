export const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

/** Ask the browser for a new deploy at most once per interval, however often the app returns to the front. */
export function shouldCheckForUpdate(lastCheck: number | null, now: number, interval = UPDATE_CHECK_INTERVAL): boolean {
  return lastCheck === null || now - lastCheck >= interval;
}

/*
 * A new service worker takes control as soon as it installs. The page that is already open keeps
 * running the old code: reloading it while it is on screen would be a second boot right after launch.
 * The reload waits until the app is hidden. If the old code asks for a lazy chunk the new deploy
 * removed, the reload happens at once, since nothing else can fix it.
 */
export function createUpdatePolicy(reload: () => void) {
  let pending = false;
  let reloading = false;
  const apply = () => {
    if (reloading) return;
    reloading = true;
    reload();
  };
  return {
    updateReady(visible: boolean) {
      if (visible) pending = true;
      else apply();
    },
    visibilityChanged(visible: boolean) {
      if (pending && !visible) apply();
    },
    chunkLoadFailed() {
      if (pending) apply();
    },
  };
}

/* Skip the first install (no previous controller), which needs no reload. */
export function reloadOnNewVersion(
  worker: ServiceWorkerContainer,
  reload: () => void,
  doc: Pick<Document, "addEventListener" | "visibilityState"> = document,
) {
  const hadController = Boolean(worker.controller);
  const policy = createUpdatePolicy(reload);
  worker.addEventListener("controllerchange", () => {
    if (hadController) policy.updateReady(doc.visibilityState === "visible");
  });
  doc.addEventListener("visibilitychange", () => policy.visibilityChanged(doc.visibilityState === "visible"));
  return policy;
}
