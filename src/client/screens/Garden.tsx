import { useCallback, useEffect, useRef, useState } from "react";
import type { Couple } from "../../shared/types";
import { cardById, DECKS, type GardenState } from "../../shared/garden";
import { api } from "../api";
import { GardenLevels } from "../components/bisou/GardenLevels";
import { GardenCard } from "../components/bisou/GardenCard";
import { Planter } from "../components/bisou/Planter";
import { GardenScene } from "../components/bisou/GardenScene";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";
import { useOnline } from "../lib/useOnline";
import { useLocation } from "wouter";

export function Garden({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { user, onSignedOut } = session;
  const { t, locale } = useI18n();
  const [state, setState] = useState<GardenState | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const online = useOnline();
  const [location, navigate] = useLocation();
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
  async function swap() {
    if (!state?.today || swapping || !online) return;
    setSwapping(true);
    setSwapError(null);
    const result = await api.swapGarden(state.today.cardId);
    setSwapping(false);
    if (result.ok) { ++request.current; setState(result.data); setScene(false); }
    else if (result.status === 401) onSignedOut();
    else {
      setSwapError(t(result.error?.error === "swap_locked" ? "garden.swapLocked" : result.error?.error === "no_other_card" ? "garden.noOtherCard" : "error.generic"));
      void refresh();
    }
  }
  return <SignedInShell {...session} tab="garden">
    <div className="flex flex-col gap-5 py-3">
      {failed && <div role="alert"><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
      {!state && !failed && <Skeleton className="h-80 w-full" aria-label={t("loading")} />}
      {state && <GardenLevels levels={state.levels} onChanged={() => void refresh()} onSignedOut={onSignedOut} />}
      {state?.today ? <>
        <p className="text-sm font-semibold text-muted-foreground">{t("garden.today")}</p>
        <GardenCard key={state.today.cardId} card={state.today} myName={user.displayName ?? t("garden.me")} partnerName={partner?.displayName ?? t("garden.partner")} onChanged={() => void refresh()} onSignedOut={onSignedOut} onFlip={() => { if (state.today?.flippedDay === state.day) setScene(true); }} />
        {!state.today.flippedDay && <div className="text-center">
          {!state.swapLocked && <Button variant="ghost" loading={swapping} disabled={!online} onClick={() => void swap()}>{t("garden.swap")}</Button>}
          {state.swapLocked && <p className="mt-1 text-sm text-muted-foreground">{t("garden.swapLocked")}</p>}
          {swapError && <p role="alert" className="mt-1 text-sm text-destructive">{swapError}</p>}
        </div>}
      </> : state && <p className="py-10 text-center font-heading text-2xl">{t("garden.allPlayed")}</p>}
      {state && <>
        <Planter plants={state.plants} freshness={state.freshness} onOpen={(id) => navigate(`/garden/${id}`, { state: { from: location } })} />
        <GardenScene open={scene} onClose={() => setScene(false)} plants={state.plants} deckName={DECKS.find((d) => d.id === cardById(state.today?.cardId ?? "")?.deckId)?.name[locale] ?? ""} />
      </>}
    </div>
  </SignedInShell>;
}
