import { useContext, useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "../../shared/types";
import { AppShell, type TabId } from "../components/bisou/AppShell";
import { TabMemory } from "../lib/tabMemory";
import { useTabNavigation } from "../lib/useTabNavigation";

export interface SessionProps {
  user: User;
  onUser: (user: User) => void;
  onSignedOut: () => void;
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
  const navigation = useTabNavigation(tab);

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
      tabs={tab ? { active: tab, ...navigation } : undefined}
    >
      {children}
    </AppShell>
  );
}
