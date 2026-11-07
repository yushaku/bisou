import { Activity, lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { Couple, User } from "../shared/types";
import { api } from "./api";
import { BrandMark } from "./components/bisou/BrandMark";
import { useI18n } from "./i18n";
import { clearJoinCode } from "./lib/joinLink";
import { createTabMemory, TabMemory } from "./lib/tabMemory";
import { Appearance } from "./screens/Appearance";
import { Notifications } from "./screens/Notifications";
import { Events } from "./screens/Events";
import { Home } from "./screens/Home";
import { Wishes } from "./screens/Wishes";
import { Journal } from "./screens/Journal";
import { Login } from "./screens/Login";
import { Onboarding } from "./screens/Onboarding";
import { Pairing } from "./screens/Pairing";
import { Settings } from "./screens/Settings";
import { Garden } from "./screens/Garden";

// Dev only: import.meta.env.DEV is false in production builds, so this import and the
// whole design folder are dropped from the bundle (checked by grepping dist).
const DesignPage = import.meta.env.DEV ? lazy(() => import("./design/DesignPage")) : null;

/* coupleId is undefined when unknown (right after login); the couple is then fetched. */
type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User; coupleId: string | null | undefined };

export function App() {
  return (
    <Switch>
      {DesignPage && (
        <Route path="/design">
          <Suspense fallback={null}>
            <DesignPage />
          </Suspense>
        </Route>
      )}
      <Route>
        <MainApp />
      </Route>
    </Switch>
  );
}

function LoadingScreen() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3" aria-live="polite">
        <BrandMark className="size-12 animate-pulse motion-reduce:animate-none" />
        <span className="text-base text-muted-foreground">{t("loading")}</span>
      </div>
    </main>
  );
}

function MainApp() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void api.me().then((res) => {
      if (cancelled) return;
      setAuth(res.ok ? { status: "signedIn", user: res.data.user, coupleId: res.data.coupleId } : { status: "signedOut" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onUser = useCallback((user: User) => setAuth((a) => (a.status === "signedIn" ? { ...a, user } : a)), []);
  const onSignedOut = useCallback(() => setAuth({ status: "signedOut" }), []);

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "signedOut") {
    return <Login onSignedIn={(user) => setAuth({ status: "signedIn", user, coupleId: undefined })} />;
  }
  return (
    <SignedIn key={auth.user.id} user={auth.user} knownCoupleId={auth.coupleId} onUser={onUser} onSignedOut={onSignedOut} />
  );
}

/*
 * After login: the name first (onboarding), then pairing until the couple has two members,
 * then Home. These are states, not URLs, so a reload always lands on the right step.
 */
function SignedIn({
  user,
  knownCoupleId,
  onUser,
  onSignedOut,
}: {
  user: User;
  knownCoupleId: string | null | undefined;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}) {
  // undefined while loading; /api/me already tells when there is no couple, saving a request.
  const [couple, setCouple] = useState<Couple | null | undefined>(knownCoupleId === null ? null : undefined);
  const [celebrate, setCelebrate] = useState(false);
  const [tabMemory] = useState(createTabMemory);
  const paired = (couple?.members.length ?? 0) >= 2;
  const [location] = useLocation();
  const historyState = useHistoryState<{ from?: string } | null>();
  const settingsOpen = location === "/settings" || location === "/settings/appearance" || location === "/settings/notifications";

  const refresh = useCallback(async () => {
    const res = await api.couple();
    if (res.ok) setCouple(res.data.couple);
    else if (res.status === 401) onSignedOut();
  }, [onSignedOut]);

  useEffect(() => {
    if (couple === undefined) void refresh();
  }, [couple, refresh]);

  // Pick up the partner's changes (start date, name) when the app comes back to the front.
  useEffect(() => {
    if (!paired) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [paired, refresh]);

  // A join link opened by someone who is already paired has nothing left to do.
  useEffect(() => {
    if (paired) clearJoinCode();
  }, [paired]);

  const onCouple = (next: Couple | null) => {
    if (!paired && (next?.members.length ?? 0) >= 2) setCelebrate(true);
    setCouple(next);
  };

  const session = { user, onUser, onSignedOut };
  let content;
  if (!user.displayName) content = <Onboarding {...session} />;
  else if (couple === undefined) content = <LoadingScreen />;
  else if (!couple || !paired) content = <Pairing {...session} couple={couple} onCouple={onCouple} />;
  else content = (
    <Switch location={settingsOpen ? historyState?.from ?? "/" : location}>
      <Route path="/events">
        <Events user={user} couple={couple} onCouple={onCouple} onSignedOut={onSignedOut} />
      </Route>
      <Route path="/wishes">
        <Wishes {...session} couple={couple} />
      </Route>
      <Route path="/journal">
        <Journal {...session} couple={couple} />
      </Route>
      <Route path="/garden">
        <Garden {...session} couple={couple} />
      </Route>
      <Route>
        <Home {...session} couple={couple} onCouple={onCouple} celebrate={celebrate} onCelebrated={() => setCelebrate(false)} />
      </Route>
    </Switch>
  );
  return (
    <TabMemory value={tabMemory}>
      {/* Keep loaded lists and drafts so Back can restore their scroll without waiting for a fetch. */}
      <Activity mode={settingsOpen ? "hidden" : "visible"}>{content}</Activity>
      {location === "/settings" && <Settings {...session} couple={couple} onCouple={onCouple} />}
      {location === "/settings/appearance" && <Appearance />}
      {location === "/settings/notifications" && (paired ? <Notifications onSignedOut={onSignedOut} /> : <Settings {...session} couple={couple} onCouple={onCouple} />)}
    </TabMemory>
  );
}
