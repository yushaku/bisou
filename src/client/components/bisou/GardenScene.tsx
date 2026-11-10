import { Droplets, Sparkles } from "lucide-react";
import type { GardenPlant } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Plant } from "./Plant";

export function GardenScene({ open, onClose, plants, deckName = "", stageName }: { open: boolean; onClose: () => void; plants: GardenPlant[]; deckName?: string; stageName?: string }) {
  const { t } = useI18n();
  return <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
    <DrawerContent>
      <div className="mx-auto w-full max-w-md px-4 pb-6">
        <DrawerHeader><DrawerTitle className="font-heading text-2xl">{stageName ? t("garden.stageOpened", { stage: stageName }) : t("garden.watered", { deck: deckName })}</DrawerTitle><DrawerDescription>{t(stageName ? "garden.stageOpenedBody" : "garden.tomorrow")}</DrawerDescription></DrawerHeader>
        <div className="garden-scene relative rounded-xl bg-accent p-4" data-fresh="fresh">
          <div className="garden-watering absolute top-3 right-6 text-chart-5" aria-hidden="true">{stageName ? <Sparkles className="size-10" /> : <Droplets className="size-10" />}</div>
          <div className="grid grid-cols-3 items-end gap-2">{plants.map((plant) => <Plant key={plant.deckId} {...plant} />)}</div>
        </div>
        <Button className="mt-4 w-full" onClick={onClose}>{t("common.close")}</Button>
      </div>
    </DrawerContent>
  </Drawer>;
}
