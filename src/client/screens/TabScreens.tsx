import { Activity, lazy, Suspense, useState, type ComponentProps, type ComponentType } from "react";
import type { Couple } from "../../shared/types";
import type { TabId } from "../components/bisou/AppShell";
import { loadedTab, loadTab } from "../lib/screens";
import { Home } from "./Home";
import { TabFrame, type SessionProps } from "./SignedInShell";

/* The other tabs: rendered directly once prewarmed, so a tab switch never suspends (see lib/screens.ts). */
function tabScreen<P extends object>(tab: "journal" | "wishes" | "garden") {
  const Lazy = lazy(() => loadTab(tab).then((component) => ({ default: component as unknown as ComponentType<P> })));
  return function TabScreen(props: P) {
    const [Loaded] = useState(() => loadedTab(tab) as unknown as ComponentType<P> | undefined);
    return Loaded ? <Loaded {...props} /> : <Lazy {...(props as object as ComponentProps<typeof Lazy>)} />;
  };
}
const Journal = tabScreen<ComponentProps<typeof import("./Journal").Journal>>("journal");
const Wishes = tabScreen<ComponentProps<typeof import("./Wishes").Wishes>>("wishes");
const Garden = tabScreen<ComponentProps<typeof import("./Garden").Garden>>("garden");

const TAB_OF_PATH: Record<string, TabId> = { "/journal": "journal", "/wishes": "wishes", "/garden": "garden" };

export function visitTab(visited: TabId[], location: string): TabId[] {
  const tab = TAB_OF_PATH[location] ?? "home";
  return visited.includes(tab) ? visited : [...visited, tab];
}

/*
 * The four main tabs share one TabFrame (header, tab bar, pull-to-refresh), so a switch only swaps
 * the visible screen inside it; visited screens keep their state in Activity. A screen's own SignedInShell renders just its content within the frame.
 * The Suspense is local: a tab chunk that is not loaded yet leaves the frame in place.
 */
export function TabScreens({
  location,
  session,
  couple,
  onCouple,
  onRefresh,
  celebrate,
  onCelebrated,
}: {
  location: string;
  session: SessionProps;
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  onRefresh: () => Promise<void>;
  celebrate: boolean;
  onCelebrated: () => void;
}) {
  const active = TAB_OF_PATH[location] ?? "home";
  const [visited, setVisited] = useState(() => visitTab([], location));
  const next = visitTab(visited, location);
  if (next !== visited) setVisited(next);
  return (
    <TabFrame tab={active}>
      {next.map((tab) => (
        <Activity key={tab} mode={tab === active ? "visible" : "hidden"}>
          <Suspense fallback={null}>
            {tab === "home" ? (
              <Home
                {...session}
                couple={couple}
                onCouple={onCouple}
                onRefresh={onRefresh}
                celebrate={celebrate}
                onCelebrated={onCelebrated}
              />
            ) : tab === "journal" ? (
              <Journal {...session} couple={couple} />
            ) : tab === "wishes" ? (
              <Wishes {...session} couple={couple} />
            ) : (
              <Garden {...session} couple={couple} />
            )}
          </Suspense>
        </Activity>
      ))}
    </TabFrame>
  );
}
