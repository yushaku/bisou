import type { ComponentType } from "react";

type TabScreensModule = typeof import("../screens/TabScreens");

let tabScreens: TabScreensModule["TabScreens"] | undefined;

/*
 * One import for the chunk of the main tabs: the shared frame (header, tab bar) and Home. App renders
 * it and boot starts it early (ADR 0014).
 */
export const loadTabScreens = () =>
  import("../screens/TabScreens").then((module) => {
    tabScreens = module.TabScreens;
    return module;
  });

/*
 * The tab screens once their chunk has loaded. React.lazy always suspends on its first render, even
 * for a loaded module, and React holds a revealed Suspense boundary back for about 300 ms after
 * showing its fallback, so a preloaded Home would still paint late. Rendering the loaded component
 * directly avoids that.
 */
export const loadedTabScreens = () => tabScreens;

/*
 * The other three tabs get the same treatment: prewarmTabs fetches their chunks once the first
 * frame is out, and tabScreen renders a loaded one directly, so a tab switch never waits on a
 * chunk or on React.lazy's first-render suspension.
 */
type TabLoaders = {
  journal: () => Promise<ComponentType<never>>;
  wishes: () => Promise<ComponentType<never>>;
  garden: () => Promise<ComponentType<never>>;
};

const tabLoaders: TabLoaders = {
  journal: () => import("../screens/Journal").then((m) => m.Journal as ComponentType<never>),
  wishes: () => import("../screens/Wishes").then((m) => m.Wishes as ComponentType<never>),
  garden: () => import("../screens/Garden").then((m) => m.Garden as ComponentType<never>),
};

const loadedTabs = new Map<keyof TabLoaders, ComponentType<never>>();
const loadingTabs = new Map<keyof TabLoaders, Promise<ComponentType<never>>>();

export function loadTab(tab: keyof TabLoaders): Promise<ComponentType<never>> {
  let loading = loadingTabs.get(tab);
  if (!loading) {
    loading = tabLoaders[tab]().then((screen) => {
      loadedTabs.set(tab, screen);
      return screen;
    });
    // A failed import (offline, a deploy replaced the chunk) must be retried by the next tap.
    loading.catch(() => loadingTabs.delete(tab));
    loadingTabs.set(tab, loading);
  }
  return loading;
}

export const loadedTab = (tab: keyof TabLoaders) => loadedTabs.get(tab);

type Idle = (run: () => void, timeout: number) => void;
const whenIdle: Idle = (run, timeout) => {
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout });
  else setTimeout(run, 200);
};

/* Fetches the other tab chunks one by one while the browser is idle, after the first paint. */
export function prewarmTabs(schedule: Idle = whenIdle): void {
  const queue = (Object.keys(tabLoaders) as (keyof TabLoaders)[]).filter((tab) => !loadedTabs.has(tab));
  const next = () => {
    const tab = queue.shift();
    if (!tab) return;
    schedule(() => {
      void loadTab(tab)
        .catch(() => undefined)
        .then(next);
    }, 2000);
  };
  next();
}

export function resetTabsForTest() {
  loadedTabs.clear();
  loadingTabs.clear();
}
