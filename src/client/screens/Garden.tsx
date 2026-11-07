import { useCallback, useEffect, useRef, useState } from "react";
import type { Couple } from "../../shared/types";
import type { GardenState } from "../../shared/garden";
import { api } from "../api";
import { GardenCard } from "../components/bisou/GardenCard";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";

export function Garden({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { user, onSignedOut } = session;
  const { t } = useI18n();
  const [state, setState] = useState<GardenState | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    const result = await api.garden();
    if (version !== request.current) return;
    if (result.ok) { setState(result.data); setFailed(false); }
    else if (result.status === 401) onSignedOut();
    else setFailed(true);
  }, [onSignedOut]);
  useEffect(() => {
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const timer = setInterval(visible, 15000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => { ++request.current; clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);
  const partner = couple.members.find((member) => member.id !== user.id);
  return <SignedInShell {...session} tab="garden">
    <div className="flex flex-col gap-5 py-3">
      {failed && <div role="alert"><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
      {!state && !failed && <Skeleton className="h-80 w-full" aria-label={t("loading")} />}
      {state?.today ? <>
        <p className="text-sm font-semibold text-muted-foreground">{t("garden.today")}</p>
        <GardenCard key={state.today.cardId} card={state.today} myName={user.displayName ?? t("garden.me")} partnerName={partner?.displayName ?? t("garden.partner")} onChanged={() => void refresh()} onSignedOut={onSignedOut} />
      </> : state && <p className="py-10 text-center font-heading text-2xl">{t("garden.allPlayed")}</p>}
    </div>
  </SignedInShell>;
}
