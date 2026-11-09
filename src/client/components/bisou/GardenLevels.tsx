import { useState, type ReactNode } from "react";
import { LEVEL_IDS, levelRank, type GardenLevels as Levels, type LevelAction } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { useOnline } from "../../lib/useOnline";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";

/* The mutual stage actions. The island panel owns the stage questions and garden view. */
export function GardenLevels({ levels, onChanged, onSignedOut, trigger, focusLevelId }: {
  levels: Levels;
  onChanged: () => void;
  onSignedOut: () => void;
  trigger?: ReactNode;
  focusLevelId?: string;
}) {
  const { t } = useI18n();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(action: LevelAction) {
    if (!online || busy) return;
    setBusy(true); setError(null);
    const result = await api.gardenLevels(action);
    setBusy(false);
    if (!result.ok) {
      if (result.status === 401) return onSignedOut();
      setError(t(result.status === 409 ? "garden.staleLevels" : "error.generic"));
    }
    onChanged();
  }
  const furthest = levels.furthestLevelId === null ? -1 : levelRank(levels.furthestLevelId);
  return <Drawer>
    <DrawerTrigger asChild>{trigger ?? <Button variant="outline" className="h-auto justify-between gap-3 whitespace-normal py-3 text-left">
      <span>{t("garden.status")}</span><span>{levels.selectedLevelId ? t(`level.${levels.selectedLevelId}`) : t("garden.chooseStatus")}</span>
    </Button>}</DrawerTrigger>
    <DrawerContent><div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pb-6">
      <DrawerHeader className="px-0 text-left"><DrawerTitle>{t("garden.status")}</DrawerTitle><DrawerDescription>{t("garden.statusHint")}</DrawerDescription></DrawerHeader>
      {!levels.placementComplete && <p className="text-sm text-muted-foreground">{t("garden.placementHint")}</p>}
      {levels.furthestLevelId && <div className="text-sm"><p>{t("garden.openedThrough")}: {t(`level.${levels.furthestLevelId}`)}</p><p>{t("garden.initialStatus")}: {t(`level.${levels.initialLevelId!}`)}</p></div>}
      {levels.proposal && <section className="flex flex-col gap-3 rounded-xl edge bg-card p-4">
        <p>{t(levels.proposal.agreed ? "garden.targetAgreed" : "garden.pending")}: {t(`level.${levels.proposal.levelId}`)}</p>
        <div className="flex flex-wrap gap-2">
          {levels.proposal.agreed ? <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "decline", revision: levels.revision })}>{t("garden.decline")}</Button> : levels.proposal.proposedByMe ? <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "withdraw", revision: levels.revision })}>{t("garden.withdraw")}</Button> : <>
            <Button disabled={!online || busy} onClick={() => void act({ action: "accept", revision: levels.revision })}>{t("garden.accept")}</Button>
            <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "decline", revision: levels.revision })}>{t("garden.decline")}</Button>
          </>}
        </div>
      </section>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
      {levels.placementComplete && <p className="text-sm text-muted-foreground">{t("garden.targetHint")}</p>}
      <DrawerClose asChild><Button variant="outline">{t("common.close")}</Button></DrawerClose>
      {LEVEL_IDS.map((levelId, rank) => <section key={levelId} className={cn("flex flex-col gap-3 rounded-xl edge bg-card p-4", focusLevelId === levelId && "ring-2 ring-ring/40")}>
        <h2 className="font-heading text-xl">{t(`level.${levelId}`)}</h2>
        {levelId !== levels.selectedLevelId && <Button variant="outline" className="h-auto min-h-11 whitespace-normal py-2" disabled={!online || busy || !!levels.proposal && !levels.proposal.proposedByMe}
          onClick={() => void act({ action: "propose", kind: !levels.placementComplete ? "placement" : rank <= furthest ? "revisit" : "target", levelId, revision: levels.revision })}>{t(!levels.placementComplete ? "garden.propose" : rank <= furthest ? "garden.revisit" : "garden.target")}</Button>}
        {rank === LEVEL_IDS.length - 1 && <p className="text-sm text-muted-foreground">{t("garden.noDecisions")}</p>}
      </section>)}
    </div></DrawerContent>
  </Drawer>;
}
