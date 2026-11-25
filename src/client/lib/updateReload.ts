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

export async function requestAppUpdate(
  container: Pick<ServiceWorkerContainer, "getRegistration"> | undefined = "serviceWorker" in navigator
    ? navigator.serviceWorker
    : undefined,
): Promise<"current" | "updated" | "unavailable"> {
  const registration = await container?.getRegistration();
  if (!registration) return "unavailable";
  const previous = registration.active;
  await registration.update();
  const next = registration.installing ?? registration.waiting;
  if (!next) return registration.active === previous ? "current" : "updated";

  // update() can finish before the new app shell has downloaded.
  await new Promise<void>((resolve, reject) => {
    const changed = () => {
      if (next.state !== "activated" && next.state !== "redundant") return;
      next.removeEventListener("statechange", changed);
      if (next.state === "activated") resolve();
      else reject(new Error("App update failed to install"));
    };
    next.addEventListener("statechange", changed);
    changed();
  });
  return "updated";
}
