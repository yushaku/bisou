import { DECKS, type Freshness, type GardenPlant } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { Plant } from "./Plant";

export function Planter({ plants, freshness, onOpen }: { plants: GardenPlant[]; freshness: Freshness; onOpen: (deckId: string) => void }) {
  const { t, locale } = useI18n();
  return <section aria-label={t("garden.title")} data-fresh={freshness} className="garden-planter">
    <h2 className="font-heading text-xl">{t("garden.title")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("garden.playMore")}</p>
    <div className="mt-2 overflow-x-auto rounded-xl edge bg-card p-2 elevate-sm">
      <div className="flex min-w-max gap-1">
        {DECKS.map((deck) => <button type="button" key={deck.id} aria-label={deck.name[locale]} onClick={() => onOpen(deck.id)} className="press flex w-20 flex-col items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset">
          <Plant deckId={deck.id} stage={plants.find((p) => p.deckId === deck.id)?.stage ?? 0} />
          <p className="w-full border-t border-dashed border-primary/40 px-1 py-2 text-center text-xs font-semibold">{deck.name[locale]}</p>
        </button>)}
      </div>
    </div>
    {freshness !== "fresh" && <p className="mt-3 text-sm text-muted-foreground">{t(freshness === "dry" ? "garden.dry" : "garden.wilted")}</p>}
  </section>;
}
