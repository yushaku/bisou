import { useContext, useLayoutEffect, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import type { User } from "../../shared/types";
import { AppShell, type TabId } from "../components/bisou/AppShell";
import { TabMemory } from "../lib/tabMemory";

export interface SessionProps {
  user: User;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}

/* Tabs with a screen behind them. */
const LIVE_TABS: readonly TabId[] = ["home", "journal", "wishes"];
const TAB_PATH: Partial<Record<TabId, string>> = { home: "/", journal: "/journal", wishes: "/wishes" };

/* Animated where the browser supports view transitions and motion is welcome; instant otherwise. */
function switchTab(path: string, dir: 1 | -1, navigate: (to: string) => void) {
  const go = () => {
    // Layout effects restore the new tab before the transition captures it.
    flushSync(() => navigate(path));
  };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
  document.documentElement.style.setProperty("--tab-dir", String(dir));
  document.startViewTransition(go);
}

/*
 * Signed-in frame: AppShell with a history entry for the full screen Settings page.
 * `tab` shows the bottom tab bar with that tab active; onboarding and pairing leave it out.
 */
export function SignedInShell({
  tab,
  children,
}: SessionProps & { tab?: TabId; children: ReactNode }) {
  const [location, navigate] = useLocation();
  const memory = useContext(TabMemory);

  useLayoutEffect(() => {
    if (!tab || !memory) return;
    window.scrollTo({ top: memory.scroll.get(tab) ?? 0, behavior: "instant" });
    const remember = () => memory.scroll.set(tab, window.scrollY);
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [tab, memory]);

  return (
    <AppShell
      onOpenSettings={() => {
        if (tab) memory?.scroll.set(tab, window.scrollY);
        navigate("/settings", { state: { settingsFrom: location } });
      }}
      tabs={
        tab && {
          active: tab,
          items: LIVE_TABS,
          onSelect: (next) => {
            const path = TAB_PATH[next];
            memory?.scroll.set(tab, window.scrollY);
            if (next === tab) window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            else if (path) switchTab(path, LIVE_TABS.indexOf(next) > LIVE_TABS.indexOf(tab) ? 1 : -1, navigate);
          },
        }
      }
    >
      {children}
    </AppShell>
  );
}
