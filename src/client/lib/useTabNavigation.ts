import { useContext, useEffect } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { TabId } from "../components/bisou/AppShell";
import { readCreateRequest, tabMove, TAB_PATH, type CreateDestination } from "./navigation";
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
  const state = useHistoryState<{ from?: string } | null>();
  const memory = useContext(TabMemory);
  const origin = state?.from ?? location;
  const current = LIVE_TABS.find((id) => TAB_PATH[id] === origin) ?? "home";

  function go(next: Exclude<TabId, "garden">, create?: CreateDestination) {
    if (tab) memory?.scroll.set(tab, window.scrollY);
    if (memory) memory.returnFocus = null;
    const path = TAB_PATH[next];
    const move = tabMove(location, state?.from, path, create);
    if (move === "scroll") {
      window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return;
    }
    if (move === "back") {
      if (create) window.addEventListener("popstate", () => {
        navigate(path, { replace: true, state: { create } });
      }, { once: true });
      history.back();
      return;
    }
    const update = () => navigate(path, {
      replace: move === "replace",
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

export function focusCreateButton() {
  document.querySelector<HTMLButtonElement>("[data-create-button]")?.focus({ preventScroll: true });
}
