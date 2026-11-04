import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import type { User } from "../shared/types";
import { api } from "./api";
import { BrandMark } from "./components/bisou/BrandMark";
import { useI18n } from "./i18n";
import { Home } from "./screens/Home";
import { Login } from "./screens/Login";

// Dev only: import.meta.env.DEV is false in production builds, so this import and the
// whole design folder are dropped from the bundle (checked by grepping dist).
const DesignPage = import.meta.env.DEV ? lazy(() => import("./design/DesignPage")) : null;

type AuthState = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: User };

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

function MainApp() {
  const { t } = useI18n();
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void api.me().then((res) => {
      if (cancelled) return;
      setAuth(res.ok ? { status: "signedIn", user: res.data.user } : { status: "signedOut" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (auth.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <BrandMark className="size-12 animate-pulse motion-reduce:animate-none" />
          <span className="text-base text-muted-foreground">{t("loading")}</span>
        </div>
      </main>
    );
  }
  if (auth.status === "signedOut") {
    return <Login onSignedIn={(user) => setAuth({ status: "signedIn", user })} />;
  }
  return (
    <Home
      user={auth.user}
      onUser={(user) => setAuth({ status: "signedIn", user })}
      onSignedOut={() => setAuth({ status: "signedOut" })}
    />
  );
}
