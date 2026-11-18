import { Mascot } from "./Mascot";
import { useState } from "react";
import { queries } from "../../lib/queries";
import { useApiMutation, useServerQuery } from "../../lib/serverQuery";
import type { Couple, User } from "../../../shared/types";
import { cardById, DECKS } from "../../../shared/garden";
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
  const { data: state, setData: setState, failed, refresh } = useServerQuery(queries.garden, onSignedOut);
  const swapCard = useApiMutation(api.swapGarden, ["garden"]);
  const [scene, setScene] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const partner = couple.members.find((member) => member.id !== user.id);
  async function swap() {
    if (!state?.today || swapping || !online) return;
    setSwapping(true);
    setSwapError(null);
    const result = await swapCard(state.today.cardId);
    setSwapping(false);
    if (result.ok) setState(result.data);
    else if (result.status === 401) onSignedOut();
    else {
      setSwapError(
        t(
          result.error?.error === "swap_locked"
            ? "garden.swapLocked"
            : result.error?.error === "no_other_card"
              ? "garden.noOtherCard"
              : "error.generic",
        ),
      );
      void refresh();
    }
  }
  return (
    <section aria-labelledby="today-card" className="mt-5 flex flex-col gap-3">
      {state && (
        <GardenStageNotice
          state={state}
          memoryScope={`${couple.id}:${user.id}`}
          partnerName={partner?.displayName?.trim() || t("garden.partner")}
          onChanged={() => void refresh()}
          onSignedOut={onSignedOut}
        />
      )}
      <h2 id="today-card" className="font-heading text-xl">
        {t("garden.today")}
      </h2>
      {failed && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <Mascot situation="error" />
          <p>{t("garden.loadError")}</p>
          <Button variant="outline" onClick={() => void refresh()}>
            {t("journal.retry")}
          </Button>
        </div>
      )}
      {!state && !failed && <Skeleton className="h-72 w-full" aria-label={t("loading")} />}
      {state?.today ? (
        <>
          <GardenCard
            memoryScope={`${couple.id}:${user.id}`}
            key={state.today.cardId}
            variant="today"
            card={state.today}
            myName={user.displayName?.trim() || t("garden.me")}
            partnerName={partner?.displayName?.trim() || t("garden.partner")}
            onChanged={() => void refresh()}
            onSignedOut={onSignedOut}
            onFlip={() => {
              if (state.today?.flippedDay === state.day) setScene(true);
            }}
          />
          {!state.today.flippedDay && (
            <div className="text-center">
              {!state.swapLocked && (
                <Button variant="ghost" loading={swapping} disabled={!online} onClick={() => void swap()}>
                  {t("garden.swap")}
                </Button>
              )}
              {state.swapLocked && <p className="mt-1 text-sm text-muted-foreground">{t("garden.swapLocked")}</p>}
              {swapError && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {swapError}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        state && <p className="py-10 text-center font-heading text-2xl">{t("garden.allPlayed")}</p>
      )}
      {state && (
        <GardenScene
          open={scene}
          onClose={() => setScene(false)}
          plants={state.plants}
          deckName={DECKS.find((d) => d.id === cardById(state.today?.cardId ?? "")?.deckId)?.name[locale] ?? ""}
        />
      )}
    </section>
  );
}
