import { useState } from "react";
import { levelRank, type GardenLevels as Levels, type LevelAction, type RelationshipLevel } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { useOnline } from "../../lib/useOnline";
import { Button } from "../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";

type StageMode = "placement" | "target" | "current";

/* Stage choice only; the discussion list lives on the Garden screen. */
export function GardenStageSheet({ levels, levelId, partnerName, open, onClose, onChanged, onSignedOut, onViewStage }: {
  levels: Levels;
  partnerName: string;
  levelId: RelationshipLevel;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  onSignedOut: () => void;
  onViewStage: (levelId: RelationshipLevel) => void;
}) {
  const { t } = useI18n();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rank = levelRank(levelId);
  const furthestRank = levels.furthestLevelId ? levelRank(levels.furthestLevelId) : -1;
  const mode: StageMode = !levels.placementComplete ? "placement" : rank > furthestRank ? "target" : "current";
  const proposalHere = levels.proposal?.levelId === levelId ? levels.proposal : null;
  const otherProposal = levels.proposal && !proposalHere ? levels.proposal : null;
  const stage = t(`level.${levelId}`);
  const kind = mode === "placement" ? "placement" : "target";
  const title = mode === "placement" ? t("garden.startStageTitle", { stage })
    : mode === "target" ? t("garden.changeStageTitle", { stage })
    : t("garden.currentStageTitle", { stage });
  const description = mode === "placement" ? t("garden.startStageBody")
    : mode === "target" ? t("garden.changeStageBody")
    : t("garden.currentStageBody");

  async function act(action: LevelAction) {
    if (!online || busy) return;
    setBusy(true);
    setError(null);
    const result = await api.gardenLevels(action);
    setBusy(false);
    if (!result.ok) {
      if (result.status === 401) return onSignedOut();
      setError(t(result.status === 409 ? "garden.staleLevels" : "error.generic"));
    }
    if (result.ok && action.action === "accept") onClose();
    onChanged();
  }

  return <Drawer open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DrawerContent>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pb-6">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="font-heading text-2xl">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        {otherProposal && <p className="rounded-xl edge bg-card p-3 text-sm text-muted-foreground">
          {t("garden.otherProposal", { stage: t(`level.${otherProposal.levelId}`) })}
        </p>}

        {proposalHere && <section className="flex flex-col gap-3 rounded-xl edge bg-card p-4">
          <p className="text-sm">{t(proposalHere.proposedByMe ? "garden.waitingPartner" : "garden.stageRequest", { name: partnerName, stage })}</p>
          <div className="flex flex-wrap gap-2">
            {proposalHere.proposedByMe
              ? <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "withdraw", revision: levels.revision })}>{t("garden.withdraw")}</Button>
              : <>
                <Button disabled={!online || busy} onClick={() => void act({ action: "accept", revision: levels.revision })}>{t("garden.accept")}</Button>
                <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "decline", revision: levels.revision })}>{t("garden.decline")}</Button>
              </>}
          </div>
        </section>}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}

        {mode === "current" && <Button variant="outline" className="w-full"
          onClick={() => { onClose(); onViewStage(levelId); }}>{t("garden.viewStageGarden")}</Button>}

        {!proposalHere && !otherProposal && mode !== "current" && <Button className="w-full" disabled={!online || busy}
          onClick={() => void act({ action: "propose", kind, levelId, revision: levels.revision })}>
          {t(mode === "placement" ? "garden.startStageAction" : "garden.changeStageAction", { stage })}
        </Button>}

        <DrawerClose asChild><Button variant="outline">{t("common.close")}</Button></DrawerClose>
      </div>
    </DrawerContent>
  </Drawer>;
}
