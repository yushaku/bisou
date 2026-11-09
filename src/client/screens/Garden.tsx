import { useCallback, useEffect, useRef, useState } from "react";
import type { Couple } from "../../shared/types";
import type { GardenState, RelationshipLevel } from "../../shared/garden";
import { api } from "../api";
import { GardenMap } from "../components/bisou/GardenMap";
import { GardenStageView } from "../components/bisou/GardenStageView";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";
import { useLocation } from "wouter";

export function Garden({ ...session }: SessionProps & { couple: Couple }) {
  const { onSignedOut } = session;
  const { t } = useI18n();
  const [state, setState] = useState<GardenState | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"garden" | "map">("garden");
  const [viewingId, setViewingId] = useState<RelationshipLevel | null>(null);
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
  const stageId: RelationshipLevel = viewingId ?? state?.levels.selectedLevelId ?? state?.levels.initialLevelId ?? "acquainted";
  return <SignedInShell {...session} tab="garden">
    <div className="flex flex-col gap-5 py-3">
      {failed && <div role="alert"><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
      {!state && !failed && <Skeleton className="h-80 w-full" aria-label={t("loading")} />}
      {state && view === "map" && <GardenMap levels={state.levels} viewingId={stageId}
        onClose={() => setView("garden")} onSelect={(levelId) => { setViewingId(levelId); setView("garden"); }} />}
      {state && view === "garden" && <GardenStageView levels={state.levels} plants={state.plants} freshness={state.freshness} stageId={stageId}
        onOpenMap={() => setView("map")} onSelectStage={setViewingId}
        onOpenDeck={(id) => navigate(`/garden/${id}`, { state: { from: location } })}
        onChanged={() => void refresh()} onSignedOut={onSignedOut} />}
    </div>
  </SignedInShell>;
}
