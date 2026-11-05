import { useContext, useEffect } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { TabId } from "../components/bisou/AppShell";
import { readCreateRequest, TAB_PATH, type CreateDestination } from "./navigation";
import { TabMemory } from "./tabMemory";

const LIVE_TABS = ["home", "journal", "wishes"] as const;

function switchTab(go: () => void, direction: 1 | -1) {
  const update = () => flushSync(go);
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  document.documentElement.style.setProperty("--tab-dir", String(direction));
  document.startViewTransition(update);
}

export function useTabNavigation(tab?: TabId) {
  const [location, navigate] = useLocation();
  const state = useHistoryState<{ settingsFrom?: string } | null>();
  const memory = useContext(TabMemory);
  const origin = location === "/settings" ? state?.settingsFrom : location;
  const current = LIVE_TABS.find((id) => TAB_PATH[id] === origin) ?? "home";

  function go(next: Exclude<TabId, "garden">, create?: CreateDestination) {
    if (tab) memory?.scroll.set(tab, window.scrollY);
    const path = TAB_PATH[next];
    if (location === path && !create) {
      window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return;
    }
    const update = () => navigate(path, {
      replace: location === path || location === "/settings",
      state: create ? { create } : null,
    });
    if (location === path) update();
    else switchTab(update, LIVE_TABS.indexOf(next) > LIVE_TABS.indexOf(current) ? 1 : -1);
  }

  return {
    onSelect: (next: TabId) => { if (next !== "garden") go(next); },
    onCreate: (destination: CreateDestination) => go(destination, destination),
  };
}

export function useCreateRequest(destination: CreateDestination, onOpen: () => void) {
  const request = readCreateRequest(useHistoryState<unknown>());
  const [location, navigate] = useLocation();
  useEffect(() => {
    if (request !== destination) return;
    navigate(location, { replace: true });
    onOpen();
  }, [request, destination, location, navigate, onOpen]);
}
