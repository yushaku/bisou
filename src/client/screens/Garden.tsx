import { Mascot } from "../components/bisou/Mascot";
import { useState } from "react";
import { queries } from "../lib/queries";
import { useServerQuery } from "../lib/serverQuery";
import type { Couple } from "../../shared/types";
import { type RelationshipLevel } from "../../shared/garden";
import { GardenMap } from "../components/bisou/GardenMap";
import { GardenStageSheet } from "../components/bisou/GardenStageSheet";
import { GardenStageView } from "../components/bisou/GardenStageView";
import { GardenStageNotice } from "../components/bisou/GardenStageNotice";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";
import { useLocation } from "wouter";

export function Garden({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { user, onSignedOut } = session;
  const { t } = useI18n();
  const { data: state, failed, refresh } = useServerQuery(queries.garden, onSignedOut);
  const [view, setView] = useState<"garden" | "map">("garden");
  const [viewingId, setViewingId] = useState<RelationshipLevel | null>(null);
  const [sheetLevel, setSheetLevel] = useState<RelationshipLevel | null>(null);
  const [location, navigate] = useLocation();
  const stageId: RelationshipLevel =
    viewingId ?? state?.levels.selectedLevelId ?? state?.levels.initialLevelId ?? "acquainted";
  const myName = user.displayName?.trim() || t("garden.me");
  const partnerName =
    couple.members.find((member) => member.id !== user.id)?.displayName?.trim() || t("garden.partner");
  const viewStage = (levelId: RelationshipLevel) => {
    setSheetLevel(null);
    setViewingId(levelId);
    setView("garden");
  };
  const selectIsland = (levelId: RelationshipLevel) => setSheetLevel(levelId);
  return (
    <SignedInShell {...session} tab="garden" onRefresh={refresh}>
      <div className="flex flex-col gap-5 py-3">
        {state && (
          <GardenStageNotice
            state={state}
            memoryScope={`${couple.id}:${user.id}`}
            partnerName={partnerName}
            onChanged={() => void refresh()}
            onSignedOut={onSignedOut}
          />
        )}
        {failed && (
          <div role="alert">
            <Mascot situation="error" />
            <p>{t("garden.loadError")}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              {t("journal.retry")}
            </Button>
          </div>
        )}
        {!state && !failed && <Skeleton className="h-80 w-full" aria-label={t("loading")} />}
        {state && view === "map" && (
          <GardenMap
            partnerName={partnerName}
            levels={state.levels}
            viewingId={stageId}
            onClose={() => setView("garden")}
            onSelect={selectIsland}
          />
        )}
        {state && view === "garden" && (
          <GardenStageView
            key={stageId}
            levels={state.levels}
            plants={state.plants}
            freshness={state.freshness}
            stageId={stageId}
            myName={myName}
            partnerName={partnerName}
            memoryScope={`${couple.id}:${user.id}`}
            onOpenMap={() => setView("map")}
            onSelectStage={viewStage}
            onOpenDeck={(id) => navigate(`/garden/${id}`, { state: { from: location } })}
            onChanged={() => void refresh()}
            onSignedOut={onSignedOut}
          />
        )}
        {state && (
          <GardenStageSheet
            partnerName={partnerName}
            levels={state.levels}
            levelId={sheetLevel ?? stageId}
            open={sheetLevel !== null}
            onClose={() => setSheetLevel(null)}
            onChanged={() => void refresh()}
            onSignedOut={onSignedOut}
            onViewStage={viewStage}
          />
        )}
      </div>
    </SignedInShell>
  );
}
