import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useLocation } from "wouter";
import type { User } from "../../shared/types";
import { AppShell, type TabId } from "../components/bisou/AppShell";
import { useI18n, type MessageKey } from "../i18n";
import { attachTabScroll, TabMemory } from "../lib/tabMemory";
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
// Each tab's name replaces the app name in the top bar.
const TAB_TITLES: Partial<Record<TabId, MessageKey>> = {
  home: "home.ourCorner",
  journal: "journal.title",
  wishes: "nav.wishes",
  garden: "garden.title",
};

type Refresh = (() => void | Promise<void>) | undefined;

/*
 * Set by TabFrame. Inside it, a tab screen's SignedInShell renders only its content: the header,
 * tab bar and pull-to-refresh stay mounted across tab switches and just follow the active tab.
 */
const TabFrameContext = createContext<RefObject<Refresh> | null>(null);

function useScrollMemory(tab: TabId | undefined) {
  const memory = useContext(TabMemory);
  useLayoutEffect(() => {
    if (memory) attachTabScroll(memory, tab);
  }, [tab, memory]);
  return memory;
}

/* The one frame of the four main tabs; `tab` is the active one and `children` the active screen. */
export function TabFrame({ tab, children }: { tab: TabId; children: ReactNode }) {
  const { t } = useI18n();
  const [location, navigate] = useLocation();
  const navigation = useTabNavigation();
  const memory = useScrollMemory(tab);
  const refresh = useRef<Refresh>(undefined);
  const pull = useCallback(() => refresh.current?.(), []);
  return (
    <TabFrameContext value={refresh}>
      <AppShell
        title={t(TAB_TITLES[tab]!)}
        onOpenSettings={() => {
          if (memory) memory.returnFocus = "settings-button";
          navigate("/settings", { state: { from: location } });
        }}
        onRefresh={pull}
        tabs={{ active: tab, ...navigation }}
      >
        {children}
      </AppShell>
    </TabFrameContext>
  );
}

/* A tab screen inside TabFrame: registers its refresh with the frame while visible. */
function TabContent({
  onRefresh,
  refresh,
  children,
}: {
  onRefresh: Refresh;
  refresh: RefObject<Refresh>;
  children: ReactNode;
}) {
  useEffect(() => {
    refresh.current = onRefresh;
    return () => {
      if (refresh.current === onRefresh) refresh.current = undefined;
    };
  });
  return children;
}

export function SignedInShell({
  tab,
  onRefresh,
  children,
}: SessionProps & { tab?: TabId; onRefresh?: () => void | Promise<void>; children: ReactNode }) {
  const frame = useContext(TabFrameContext);
  if (frame && tab)
    return (
      <TabContent onRefresh={onRefresh} refresh={frame}>
        {children}
      </TabContent>
    );
  return (
    <StandaloneShell tab={tab} onRefresh={onRefresh}>
      {children}
    </StandaloneShell>
  );
}

function StandaloneShell({
  tab,
  onRefresh,
  children,
}: {
  tab?: TabId;
  onRefresh?: () => void | Promise<void>;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [location, navigate] = useLocation();
  const titleKey = tab && TAB_TITLES[tab];
  const navigation = useTabNavigation();
  const memory = useScrollMemory(tab);

  return (
    <AppShell
      title={titleKey ? t(titleKey) : undefined}
      onOpenSettings={() => {
        if (memory) memory.returnFocus = "settings-button";
        navigate("/settings", { state: { from: location } });
      }}
      onRefresh={onRefresh}
      tabs={tab ? { active: tab, ...navigation } : undefined}
    >
      {children}
    </AppShell>
  );
}
