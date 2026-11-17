import { Mascot } from "../components/bisou/Mascot";
import { queries } from "../lib/queries";
import { useServerQuery } from "../lib/serverQuery";
import { DECKS } from "../../shared/garden";
import type { Couple } from "../../shared/types";
import { GardenCard } from "../components/bisou/GardenCard";
import { BottomBar } from "../components/bisou/AppShell";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { Plant } from "../components/bisou/Plant";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { useTabNavigation } from "../lib/useTabNavigation";
import type { SessionProps } from "./SignedInShell";

export function GardenDeck({ deckId, couple, user, onSignedOut }: SessionProps & { couple: Couple; deckId: string }) {
  const { t, locale } = useI18n();
  const deck = DECKS.find((d) => d.id === deckId);
  const { data: state, failed, refresh } = useServerQuery(queries.gardenDeck(deckId), onSignedOut);
  const navigation = useTabNavigation();
  const names = { myName: user.displayName?.trim() || t("garden.me"), partnerName: couple.members.find((m) => m.id !== user.id)?.displayName?.trim() || t("garden.partner") };
  return <div className="flex min-h-dvh flex-col">
    <SubPageHeader title={deck?.name[locale] ?? t("garden.unknownDeck")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-3 pb-6">
      {deck && <div className="flex items-end gap-3">
        <div className="flex h-20 w-20 shrink-0 items-end overflow-hidden"><Plant deckId={deck.id} stage={0} /></div>
        <div className="min-w-0 pb-1">
          <h2 className="font-heading text-xl">{deck.name[locale]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{deck.purpose[locale]}</p>
        </div>
      </div>}
      {failed && <div role="alert"><Mascot situation="error" /><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
      {!state && !failed && <Skeleton className="h-80" aria-label={t("loading")} />}
      {state?.active && <section className="flex flex-col gap-3"><h2 className="font-heading text-xl">{t("garden.inPlay")}</h2>
        <GardenCard memoryScope={`${couple.id}:${user.id}`} key={state.active.cardId} card={state.active} {...names} onChanged={() => void refresh()} onSignedOut={onSignedOut} />
      </section>}
      {state && !state.active && <p className="text-center text-muted-foreground">{t("garden.allPlayed")}</p>}
      {!!state?.decisions.length && <section id="decisions" className="flex flex-col gap-6"><h2 className="font-heading text-xl">{t("garden.decisions")}</h2>
        {state.decisions.map((card) => <GardenCard memoryScope={`${couple.id}:${user.id}`} key={card.cardId} card={card} {...names} onChanged={() => void refresh()} onSignedOut={onSignedOut} />)}
      </section>}
      {!!state?.history.length && <section className="flex flex-col gap-6"><h2 className="font-heading text-xl">{t("garden.history")}</h2>
        {state.history.map((card) => <GardenCard memoryScope={`${couple.id}:${user.id}`} key={card.cardId} card={card} {...names} onChanged={() => void refresh()} onSignedOut={onSignedOut} />)}
      </section>}
    </main>
    <BottomBar active="garden" {...navigation} />
  </div>;
}
