import { Activity, lazy, type ComponentProps, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { Couple, CoupleResponse, User } from "../shared/types";
import { api, type ApiResult } from "./api";
import { Mascot } from "./components/bisou/Mascot";
import { useI18n } from "./i18n";
import { clearJoinCode } from "./lib/joinLink";
import { bootCacheNow, getBoot, meOutcome, saveBootCache, wipeDeviceData } from "./lib/bootSession";
import { queryScope } from "./lib/devicePersist";
import { scopedStore } from "./lib/deviceStore";
import { loadedTabScreens, loadTabScreens, prewarmTabs } from "./lib/screens";
import { createTabMemory, TabMemory } from "./lib/tabMemory";
import { Login } from "./screens/Login";
import { ServerDataProvider } from "./lib/serverQuery";

const LazyTabScreens = lazy(() => loadTabScreens().then((m) => ({ default: m.TabScreens })));
function TabScreens(props: ComponentProps<typeof LazyTabScreens>) {
  const [Loaded] = useState(loadedTabScreens);
  return Loaded ? <Loaded {...props} /> : <LazyTabScreens {...props} />;
}
const GardenDeck = lazy(() => import("./screens/GardenDeck").then((m) => ({ default: m.GardenDeck })));
const Starred = lazy(() => import("./screens/Starred").then((m) => ({ default: m.Starred })));
const CardBoxes = lazy(() => import("./screens/CardBoxes").then((m) => ({ default: m.CardBoxes })));
const CardBoxPlayer = lazy(() => import("./screens/CardBoxPlayer").then((m) => ({ default: m.CardBoxPlayer })));
const Events = lazy(() => import("./screens/Events").then((m) => ({ default: m.Events })));
const Settings = lazy(() => import("./screens/Settings").then((m) => ({ default: m.Settings })));
const Appearance = lazy(() => import("./screens/Appearance").then((m) => ({ default: m.Appearance })));
const Notifications = lazy(() => import("./screens/Notifications").then((m) => ({ default: m.Notifications })));
const Onboarding = lazy(() => import("./screens/Onboarding").then((m) => ({ default: m.Onboarding })));
const Pairing = lazy(() => import("./screens/Pairing").then((m) => ({ default: m.Pairing })));

// Dev only: import.meta.env.DEV is false in production builds, so this import and the
// whole design folder are dropped from the bundle (checked by grepping dist).
const DesignPage = import.meta.env.DEV ? lazy(() => import("./design/DesignPage")) : null;

/*
 * coupleId is undefined when unknown (right after login); the couple is then fetched.
 * cachedCouple is the couple saved on this device; fromBoot marks a session whose couple request
 * was already started at boot, so SignedIn waits for that one instead of sending another.
 */
type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      user: User;
      coupleId: string | null | undefined;
      cachedCouple?: Couple | null;
      fromBoot?: boolean;
    };

/* A returning user starts signed in from the device copy; /api/me and /api/couple then revalidate it. */
function initialAuth(): AuthState {
  const cache = bootCacheNow();
  return cache
    ? {
        status: "signedIn",
        user: cache.user,
        coupleId: cache.couple?.id ?? null,
        cachedCouple: cache.couple,
        fromBoot: true,
      }
    : { status: "loading" };
}

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
        <Mascot situation="waiting" priority />
        <span className="text-base text-muted-foreground">{t("loading")}</span>
      </div>
    </main>
  );
}

/* The same picture as the static skeleton in index.html, so restoring the device cache does not flash another screen. */
function BootSkeleton() {
  return (
    <main id="boot-skeleton">
      <img src="/icons/icon-192.png" alt="" width={96} height={96} />
    </main>
  );
}

function MainApp() {
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const onSignedOut = useCallback(() => {
    void wipeDeviceData();
    setAuth({ status: "signedOut" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // A function call, so TypeScript does not assume the flag kept its value across the await below.
    const isCancelled = () => cancelled;
    void (getBoot()?.me ?? api.me()).then(async (res) => {
      if (cancelled) return;
      const outcome = meOutcome(res, bootCacheNow());
      if (outcome.kind === "keepCached") return;
      if (outcome.kind === "signedOut") {
        if (outcome.wipe) void wipeDeviceData();
        setAuth({ status: "signedOut" });
        return;
      }
      if (outcome.wipe) await wipeDeviceData();
      if (isCancelled()) return;
      const { user, coupleId } = outcome;
      setAuth((previous) =>
        previous.status === "signedIn" && previous.user.id === user.id
          ? { ...previous, user, coupleId }
          : { status: "signedIn", user, coupleId, fromBoot: true },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onUser = useCallback((user: User) => setAuth((a) => (a.status === "signedIn" ? { ...a, user } : a)), []);

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "signedOut") {
    return <Login onSignedIn={(user) => setAuth({ status: "signedIn", user, coupleId: undefined })} />;
  }
  return (
    <SignedIn
      key={auth.user.id}
      user={auth.user}
      knownCoupleId={auth.coupleId}
      cachedCouple={auth.cachedCouple}
      bootCouple={auth.fromBoot ? getBoot()?.couple : undefined}
      onUser={onUser}
      onSignedOut={onSignedOut}
    />
  );
}

/*
 * After login: the name first (onboarding), then pairing until the couple has two members,
 * then Home. These are states, not URLs, so a reload always lands on the right step.
 */
function SignedIn({
  user,
  knownCoupleId,
  cachedCouple,
  bootCouple,
  onUser,
  onSignedOut,
}: {
  user: User;
  knownCoupleId: string | null | undefined;
  cachedCouple: Couple | null | undefined;
  bootCouple: Promise<ApiResult<CoupleResponse>> | undefined;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}) {
  // undefined while loading; the device copy or /api/me (no couple) can answer without a request.
  const [couple, setCouple] = useState<Couple | null | undefined>(
    cachedCouple !== undefined ? cachedCouple : knownCoupleId === null ? null : undefined,
  );
  const [store] = useState(scopedStore);
  const [celebrate, setCelebrate] = useState(false);
  const [tabMemory] = useState(createTabMemory);
  const paired = (couple?.members.length ?? 0) >= 2;
  const [location] = useLocation();
  const historyState = useHistoryState<{ from?: string } | null>();
  const settingsOpen =
    location === "/settings" || location === "/settings/appearance" || location === "/settings/notifications";

  const applyCouple = useCallback(
    (res: ApiResult<CoupleResponse>) => {
      if (res.ok) setCouple(res.data.couple);
      else if (res.status === 401) onSignedOut();
    },
    [onSignedOut],
  );
  const refresh = useCallback(async () => applyCouple(await api.couple()), [applyCouple]);

  // The boot request revalidates the couple behind a cached Home; offline (status 0) keeps the cached one.
  useEffect(() => {
    if (bootCouple) void bootCouple.then(applyCouple);
  }, [bootCouple, applyCouple]);

  useEffect(() => {
    if (couple === undefined && !bootCouple) void api.couple().then(applyCouple);
  }, [couple, bootCouple, applyCouple]);

  // Fetch the other tab chunks once the first frame is out, so a tab switch never waits on one.
  useEffect(() => {
    if (paired) prewarmTabs();
  }, [paired]);

  // Save the session so the next launch can show Home at once.
  useEffect(() => {
    if (couple !== undefined) void saveBootCache(store, user, couple);
  }, [store, user, couple]);

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

  const scope = queryScope(user.id, couple?.id);
  const tabLocation = settingsOpen ? (historyState?.from ?? "/") : location;
  const session = useMemo(() => ({ user, onUser, onSignedOut }), [user, onUser, onSignedOut]);
  let content;
  if (!user.displayName) content = <Onboarding {...session} />;
  else if (couple === undefined) content = <LoadingScreen />;
  else if (!couple || !paired) content = <Pairing {...session} couple={couple} onCouple={onCouple} />;
  else
    content = (
      <Switch location={tabLocation}>
        <Route path="/boxes/:boxId">
          {(params) => <CardBoxPlayer key={params.boxId} {...session} couple={couple} boxId={params.boxId} />}
        </Route>
        <Route path="/stars">
          <Starred {...session} couple={couple} />
        </Route>
        <Route path="/boxes">
          <CardBoxes {...session} couple={couple} />
        </Route>
        <Route path="/events">
          <Events user={user} couple={couple} onCouple={onCouple} onSignedOut={onSignedOut} />
        </Route>
        <Route path="/garden/:deckId">
          {(params) => <GardenDeck key={params.deckId} {...session} couple={couple} deckId={params.deckId} />}
        </Route>
        <Route>
          <TabScreens
            location={tabLocation}
            session={session}
            couple={couple}
            onCouple={onCouple}
            onRefresh={refresh}
            celebrate={celebrate}
            onCelebrated={() => setCelebrate(false)}
          />
        </Route>
      </Switch>
    );
  return (
    <ServerDataProvider key={scope} scope={scope} fallback={<BootSkeleton />}>
      <TabMemory value={tabMemory}>
        <Suspense fallback={<LoadingScreen />}>
          {/* Keep loaded lists and drafts so Back can restore their scroll without waiting for a fetch. */}
          <Activity mode={settingsOpen ? "hidden" : "visible"}>{content}</Activity>
          {location === "/settings" && <Settings {...session} couple={couple} onCouple={onCouple} />}
          {location === "/settings/appearance" && <Appearance />}
          {location === "/settings/notifications" &&
            (paired ? (
              <Notifications onSignedOut={onSignedOut} />
            ) : (
              <Settings {...session} couple={couple} onCouple={onCouple} />
            ))}
        </Suspense>
      </TabMemory>
    </ServerDataProvider>
  );
}
