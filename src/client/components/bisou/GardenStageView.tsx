import { ChevronDown, ChevronRight, Route } from "lucide-react";
import { Link } from "wouter";
import { CARDS, levelRank, type Freshness, type GardenLevels as Levels, type GardenPlant, type RelationshipLevel } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { GARDEN_STAGE_LABEL, gardenStageState } from "../../lib/gardenStages";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { GardenLevels } from "./GardenLevels";
import { Planter } from "./Planter";

/* The main Garden view: the shared six-plant garden for the stage being viewed. */
export function GardenStageView({ levels, plants, freshness, stageId, onOpenMap, onSelectStage, onOpenDeck, onChanged, onSignedOut }: {
  levels: Levels;
  plants: GardenPlant[];
  freshness: Freshness;
  stageId: RelationshipLevel;
  onOpenMap: () => void;
  onSelectStage: (levelId: RelationshipLevel) => void;
  onOpenDeck: (deckId: string) => void;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const state = gardenStageState(stageId, levels);
  const rank = levelRank(stageId);
  const furthest = levels.furthestLevelId ? levelRank(levels.furthestLevelId) : -1;
  const open = levels.placementComplete && rank <= furthest;
  const current = levels.selectedLevelId === stageId;
  const decisions = CARDS.filter((card) => card.kind === "decision" && card.levelId === stageId);

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

    <details className="garden-stage">
      <summary className="garden-stage-summary">
        <span className="font-heading text-lg">{t("garden.stageQuestions")}</span>
        <ChevronDown className="garden-stage-chevron size-4" aria-hidden="true" />
      </summary>
      <div className="garden-stage-body">
        <ul className="garden-stage-list">
          {decisions.map((card) => {
            const complete = levels.decisions.find((decision) => decision.cardId === card.id)?.complete;
            return <li key={card.id} className="garden-stage-item">
              {open
                ? <Link className="garden-stage-link" href={`/garden/${card.deckId}#decisions`}>{card.text[locale]}</Link>
                : <span>{card.text[locale]}</span>}
              <span className={cn("garden-stage-state", open && complete && "garden-stage-state--done")}>
                {t(open ? complete ? "garden.complete" : "garden.incomplete" : "garden.locked")}
              </span>
            </li>;
          })}
        </ul>
      </div>
    </details>

    <GardenLevels levels={levels} onChanged={onChanged} onSignedOut={onSignedOut} focusLevelId={stageId}
      trigger={<Button variant="outline" className="w-full justify-between">
        {open ? t("garden.manageStage") : t("garden.openStage")}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>} />
  </div>;
}
