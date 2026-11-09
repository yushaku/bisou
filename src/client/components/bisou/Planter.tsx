import { Sprout } from "lucide-react";
import { DECKS, type Freshness, type GardenPlant } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { Plant } from "./Plant";

/* The shared six-plant garden, laid out as a small plot on the selected island. */
export function Planter({ plants, freshness, onOpen }: { plants: GardenPlant[]; freshness: Freshness; onOpen: (deckId: string) => void }) {
  const { t, locale } = useI18n();
  return <section aria-label={t("garden.title")} data-fresh={freshness} className="garden-planter">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="flex items-center gap-2 font-heading text-lg"><Sprout className="size-4 text-primary" aria-hidden="true" />{t("garden.title")}</h3>
      <p className="text-xs text-muted-foreground">{t("garden.playMore")}</p>
    </div>
    <div className="garden-plot">
      {DECKS.map((deck) => <button type="button" key={deck.id} aria-label={deck.name[locale]} onClick={() => onOpen(deck.id)}
        className="garden-plot-plant press outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset">
        <Plant deckId={deck.id} stage={plants.find((plant) => plant.deckId === deck.id)?.stage ?? 0} />
        <p>{deck.name[locale]}</p>
      </button>)}
    </div>
    {freshness !== "fresh" && <p className="text-sm text-muted-foreground">{t(freshness === "dry" ? "garden.dry" : "garden.wilted")}</p>}
  </section>;
}
