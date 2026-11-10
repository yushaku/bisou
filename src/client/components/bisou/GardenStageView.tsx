import { useCallback, useEffect, useRef, useState } from "react";
import { Route } from "lucide-react";
import { levelRank, type Freshness, type GardenCardState, type GardenLevels as Levels, type GardenPlant, type RelationshipLevel } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { GARDEN_STAGE_LABEL, gardenStageState } from "../../lib/gardenStages";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { GardenCard } from "./GardenCard";
import { Planter } from "./Planter";

/* The main Garden view: the shared six-plant garden for the stage being viewed. */
export function GardenStageView({ levels, plants, freshness, stageId, myName, partnerName, onOpenMap, onSelectStage, onOpenDeck, onChanged, onSignedOut }: {
  levels: Levels;
  plants: GardenPlant[];
  freshness: Freshness;
  stageId: RelationshipLevel;
  myName: string;
  partnerName: string;
  onOpenMap: () => void;
  onSelectStage: (levelId: RelationshipLevel) => void;
  onOpenDeck: (deckId: string) => void;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const { t } = useI18n();
  const state = gardenStageState(stageId, levels);
  const rank = levelRank(stageId);
  const furthest = levels.furthestLevelId ? levelRank(levels.furthestLevelId) : -1;
  const open = levels.placementComplete && rank <= furthest;
  const current = levels.selectedLevelId === stageId;
  const [cards, setCards] = useState<GardenCardState[] | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!open) { setCards(null); setFailed(false); return; }
    const version = ++request.current;
    const result = await api.gardenStage(stageId);
    if (version !== request.current) return;
    if (result.ok) { setCards(result.data.cards); setFailed(false); }
    else if (result.status === 401) onSignedOut();
    else setFailed(true);
  }, [open, stageId, onSignedOut]);
  useEffect(() => {
    if (!open) { setCards(null); setFailed(false); return; }
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    const timer = setInterval(visible, 15000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => { ++request.current; clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [load, open]);

  return <div className="garden-stage-view">
    <div className="garden-view-head">
      <div className="min-w-0">
        <p className="garden-view-kicker">{t(current ? "garden.currentStage" : "garden.viewingStage")}</p>
        <h2 className="font-heading text-2xl">{t(`level.${stageId}`)}</h2>
        <p className="garden-view-state">{t(GARDEN_STAGE_LABEL[state])}</p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={onOpenMap}>
        <Route className="size-4" aria-hidden="true" />{t("garden.journey")}
      </Button>
    </div>

    {levels.selectedLevelId && !current && <div className="garden-view-current">
      <span>{t("garden.currentStage")}: {t(`level.${levels.selectedLevelId}`)}</span>
      <Button variant="ghost" size="xs" onClick={() => onSelectStage(levels.selectedLevelId!)}>{t("garden.viewCurrentStage")}</Button>
    </div>}

    {!open && <p className="text-sm text-muted-foreground">{t("garden.stageLockedHint")}</p>}

    <Planter plants={plants} freshness={freshness} onOpen={onOpenDeck} />

    {open && <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl">{t("garden.answeredQuestions")}</h2>
      {!cards && !failed && <Skeleton className="h-40" aria-label={t("loading")} />}
      {failed && <div role="alert" className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">{t("garden.loadError")}</p>
        <Button variant="outline" onClick={() => void load()}>{t("journal.retry")}</Button>
      </div>}
      {cards && !cards.length && <p className="text-sm text-muted-foreground">{t("garden.noAnsweredQuestions")}</p>}
      {cards?.map((card) => <GardenCard key={card.cardId} card={card} myName={myName} partnerName={partnerName}
        onChanged={() => { onChanged(); void load(); }} onSignedOut={onSignedOut} />)}
    </section>}
  </div>;
}
