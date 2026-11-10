import { useEffect, useState } from "react";
import type { GardenState, RelationshipLevel } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { gardenMemoryKey, gardenSeen, rememberGarden } from "../../lib/garden";
import { useOnline } from "../../lib/useOnline";
import { Button } from "../ui/button";
import { GardenScene } from "./GardenScene";

export function GardenStageNotice({ state, memoryScope, partnerName, onChanged, onSignedOut }: {
  state: GardenState; memoryScope: string; partnerName: string;
  onChanged: () => void; onSignedOut: () => void;
}) {
  const { t } = useI18n();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<RelationshipLevel | null>(null);
  const furthest = state.levels.furthestLevelId;
  useEffect(() => {
    if (!furthest) return;
    const key = gardenMemoryKey(memoryScope, "stage", furthest);
    if (gardenSeen(key)) return;
    rememberGarden(key);
    setCelebrating(furthest);
  }, [furthest, memoryScope]);
  const proposal = state.levels.proposal;
  const celebrationStage = celebrating ?? furthest;

  async function respond(action: "accept" | "decline" | "withdraw") {
    if (!online || busy) return;
    setBusy(true);
    setError(null);
    const result = await api.gardenLevels({ action, revision: state.levels.revision });
    setBusy(false);
    if (!result.ok) {
      if (result.status === 401) return onSignedOut();
      setError(t(result.status === 409 ? "garden.staleLevels" : "error.generic"));
    }
    onChanged();
  }

  return <>
    {proposal && <section aria-label={t("garden.currentStage")} className="flex flex-col gap-3 rounded-xl edge bg-accent p-4">
      <p role="status" className="text-sm font-semibold">{proposal.proposedByMe
        ? t("garden.waitingPartner", { name: partnerName })
        : t("garden.stageRequest", { name: partnerName, stage: t(`level.${proposal.levelId}`) })}</p>
      <div className="flex flex-wrap gap-2">
        {proposal.proposedByMe
          ? <Button variant="outline" disabled={!online || busy} onClick={() => void respond("withdraw")}>{t("garden.withdraw")}</Button>
          : <>
            <Button loading={busy} disabled={!online} onClick={() => void respond("accept")}>{t("garden.accept")}</Button>
            <Button variant="outline" disabled={!online || busy} onClick={() => void respond("decline")}>{t("garden.decline")}</Button>
          </>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!online && <p className="text-sm text-muted-foreground">{t("offline.save")}</p>}
    </section>}
    <GardenScene open={celebrating !== null} onClose={() => setCelebrating(null)} plants={state.plants}
      stageName={celebrationStage ? t(`level.${celebrationStage}`) : undefined} />
  </>;
}
