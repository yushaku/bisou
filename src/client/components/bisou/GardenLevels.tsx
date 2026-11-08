import { useState } from "react";
import { CARDS, LEVEL_IDS, levelRank, type GardenLevels as Levels, type LevelAction } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { useOnline } from "../../lib/useOnline";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";

export function GardenLevels({ levels, onChanged, onSignedOut }: { levels: Levels; onChanged: () => void; onSignedOut: () => void }) {
  const { t, locale } = useI18n();
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
    <DrawerTrigger asChild><Button variant="outline" className="h-auto justify-between gap-3 whitespace-normal py-3 text-left">
      <span>{t("garden.status")}</span><span>{levels.selectedLevelId ? t(`level.${levels.selectedLevelId}`) : t("garden.chooseStatus")}</span>
    </Button></DrawerTrigger>
    <DrawerContent><div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pb-6">
      <DrawerHeader className="px-0 text-left"><DrawerTitle>{t("garden.status")}</DrawerTitle><DrawerDescription>{t("garden.statusHint")}</DrawerDescription></DrawerHeader>
      {!levels.placementComplete && <p className="text-sm text-muted-foreground">{t("garden.placementHint")}</p>}
      {levels.furthestLevelId && <div className="text-sm"><p>{t("garden.openedThrough")}: {t(`level.${levels.furthestLevelId}`)}</p><p>{t("garden.initialStatus")}: {t(`level.${levels.initialLevelId!}`)}</p></div>}
      {levels.proposal && <section className="flex flex-col gap-3 rounded-xl edge bg-card p-4">
        <p>{t("garden.pending")}: {t(`level.${levels.proposal.levelId}`)}</p>
        <div className="flex flex-wrap gap-2">
          {levels.proposal.proposedByMe ? <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "withdraw", revision: levels.revision })}>{t("garden.withdraw")}</Button> : <>
            <Button disabled={!online || busy} onClick={() => void act({ action: "accept", revision: levels.revision })}>{t("garden.accept")}</Button>
            <Button variant="outline" disabled={!online || busy} onClick={() => void act({ action: "decline", revision: levels.revision })}>{t("garden.decline")}</Button>
          </>}
        </div>
      </section>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
      {LEVEL_IDS.map((levelId, rank) => <section key={levelId} className="flex flex-col gap-3 rounded-xl edge bg-card p-4">
        <h2 className="font-heading text-xl">{t(`level.${levelId}`)}</h2>
        {(!levels.placementComplete || rank <= furthest) && levelId !== levels.selectedLevelId && <Button variant="outline" disabled={!online || busy || !!levels.proposal && !levels.proposal.proposedByMe}
          onClick={() => void act({ action: "propose", kind: levels.placementComplete ? "revisit" : "placement", levelId, revision: levels.revision })}>{t(levels.placementComplete ? "garden.revisit" : "garden.propose")}</Button>}
        {CARDS.filter((card) => card.kind === "decision" && card.levelId === levelId).map((card) => <div key={card.id} className="text-sm">
          <p>{card.text[locale]}</p><p className="mt-1 text-muted-foreground">{t(rank > furthest ? "garden.locked" : levels.decisions.find((d) => d.cardId === card.id)?.complete ? "garden.complete" : "garden.incomplete")}</p>
        </div>)}
      </section>)}
    </div></DrawerContent>
  </Drawer>;
}
