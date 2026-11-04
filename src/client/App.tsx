import { useEffect, useState } from "react";
import type { User } from "../shared/types";
import { api } from "./api";
import { Heart, Screen } from "./components/ui";
import { useI18n } from "./i18n";
import { Home } from "./screens/Home";
import { Login } from "./screens/Login";

type AuthState = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: User };

export function App() {
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
      <Screen>
        <div className="m-auto flex flex-col items-center gap-3 text-pink" aria-live="polite">
          <Heart className="size-12 animate-pulse" />
          <span className="text-sm text-subtext0">{t("loading")}</span>
        </div>
      </Screen>
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
