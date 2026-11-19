import { useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { TabId } from "../components/bisou/AppShell";
import { readCreateRequest, tabMove, TAB_PATH, type CreateDestination } from "./navigation";
import { remember, TabMemory } from "./tabMemory";

export function useTabNavigation() {
  const [location, navigate] = useLocation();
  const state = useHistoryState<{ from?: string } | null>();
  const memory = useContext(TabMemory);

  function go(next: TabId, create?: CreateDestination) {
    remember(memory, { returnFocus: null });
    const path = TAB_PATH[next];
    const move = tabMove(location, state?.from, path, create);
    if (move === "scroll") {
      window.scrollTo({
        top: 0,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
      return;
    }
    if (move === "back") {
      if (create)
        window.addEventListener(
          "popstate",
          () => {
            navigate(path, { replace: true, state: { create } });
          },
          { once: true },
        );
      history.back();
      return;
    }
    navigate(path, {
      replace: move === "replace",
      state: create ? { create } : null,
    });
  }

  return {
    onSelect: (next: TabId) => go(next),
    onCreate: (destination: CreateDestination) =>
      go(
        destination === "event"
          ? "home"
          : destination === "spin"
            ? "wishes"
            : destination === "notes"
              ? "journal"
              : destination,
        destination,
      ),
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
