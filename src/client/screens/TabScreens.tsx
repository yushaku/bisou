import { lazy, Suspense, type ComponentProps, type ComponentType } from "react";
import { Route, Switch } from "wouter";
import type { Couple } from "../../shared/types";
import type { TabId } from "../components/bisou/AppShell";
import { loadedTab, loadTab } from "../lib/screens";
import { Home } from "./Home";
import { TabFrame, type SessionProps } from "./SignedInShell";

/* The other tabs: rendered directly once prewarmed, so a tab switch never suspends (see lib/screens.ts). */
function tabScreen<P extends object>(tab: "journal" | "wishes" | "garden") {
  const Lazy = lazy(() => loadTab(tab).then((component) => ({ default: component as unknown as ComponentType<P> })));
  return function TabScreen(props: P) {
    const Loaded = loadedTab(tab) as unknown as ComponentType<P> | undefined;
    return Loaded ? <Loaded {...props} /> : <Lazy {...(props as object as ComponentProps<typeof Lazy>)} />;
  };
}
const Journal = tabScreen<ComponentProps<typeof import("./Journal").Journal>>("journal");
const Wishes = tabScreen<ComponentProps<typeof import("./Wishes").Wishes>>("wishes");
const Garden = tabScreen<ComponentProps<typeof import("./Garden").Garden>>("garden");

const TAB_OF_PATH: Record<string, TabId> = { "/journal": "journal", "/wishes": "wishes", "/garden": "garden" };

/*
 * The four main tabs share one TabFrame (header, tab bar, pull-to-refresh), so a switch only swaps
 * the screen inside it. A screen's own SignedInShell renders just its content within the frame.
 * The Suspense is local: a tab chunk that is not loaded yet leaves the frame in place.
 */
export function TabScreens({ location, session, couple, onCouple, onRefresh, celebrate, onCelebrated }: {
  location: string;
  session: SessionProps;
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  onRefresh: () => Promise<void>;
  celebrate: boolean;
  onCelebrated: () => void;
}) {
  return (
    <TabFrame tab={TAB_OF_PATH[location] ?? "home"}>
      <Suspense fallback={null}>
        <Switch location={location}>
          <Route path="/wishes"><Wishes {...session} couple={couple} /></Route>
          <Route path="/journal"><Journal {...session} couple={couple} /></Route>
          <Route path="/garden"><Garden {...session} couple={couple} /></Route>
          <Route><Home {...session} couple={couple} onCouple={onCouple} onRefresh={onRefresh} celebrate={celebrate} onCelebrated={onCelebrated} /></Route>
        </Switch>
      </Suspense>
    </TabFrame>
  );
}
