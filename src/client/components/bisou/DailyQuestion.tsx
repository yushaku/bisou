import { useCallback, useEffect, useRef, useState } from "react";
import type { Couple, User } from "../../../shared/types";
import { cardById, DECKS, type GardenState } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { useOnline } from "../../lib/useOnline";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { GardenCard } from "./GardenCard";
import { GardenStageNotice } from "./GardenStageNotice";
import { GardenScene } from "./GardenScene";

/* Today's shared card lives on Home; the Garden tab keeps levels and plants. */
export function DailyQuestion({ couple, user, onSignedOut }: { couple: Couple; user: User; onSignedOut: () => void }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const [state, setState] = useState<GardenState | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
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
    if (result.ok) { ++request.current; setState(result.data); }
    else if (result.status === 401) onSignedOut();
    else {
      setSwapError(t(result.error?.error === "swap_locked" ? "garden.swapLocked" : result.error?.error === "no_other_card" ? "garden.noOtherCard" : "error.generic"));
      void refresh();
    }
  }
  return <section aria-labelledby="today-card" className="mt-5 flex flex-col gap-3">
    {state && <GardenStageNotice state={state} memoryScope={`${couple.id}:${user.id}`} partnerName={partner?.displayName?.trim() || t("garden.partner")} onChanged={() => void refresh()} onSignedOut={onSignedOut} />}
    <h2 id="today-card" className="font-heading text-xl">{t("garden.today")}</h2>
    {failed && <div role="alert" className="flex flex-col items-start gap-2"><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
    {!state && !failed && <Skeleton className="h-72 w-full" aria-label={t("loading")} />}
    {state?.today ? <>
      <GardenCard memoryScope={`${couple.id}:${user.id}`} key={state.today.cardId} variant="today" card={state.today} myName={user.displayName?.trim() || t("garden.me")} partnerName={partner?.displayName?.trim() || t("garden.partner")} onChanged={() => void refresh()} onSignedOut={onSignedOut} onFlip={() => { if (state.today?.flippedDay === state.day) setScene(true); }} />
      {!state.today.flippedDay && <div className="text-center">
        {!state.swapLocked && <Button variant="ghost" loading={swapping} disabled={!online} onClick={() => void swap()}>{t("garden.swap")}</Button>}
        {state.swapLocked && <p className="mt-1 text-sm text-muted-foreground">{t("garden.swapLocked")}</p>}
        {swapError && <p role="alert" className="mt-1 text-sm text-destructive">{swapError}</p>}
      </div>}
    </> : state && <p className="py-10 text-center font-heading text-2xl">{t("garden.allPlayed")}</p>}
    {state && <GardenScene open={scene} onClose={() => setScene(false)} plants={state.plants} deckName={DECKS.find((d) => d.id === cardById(state.today?.cardId ?? "")?.deckId)?.name[locale] ?? ""} />}
  </section>;
}
