import { useI18n } from "@/i18n";
import { MASCOTS, setMascot, useMascot } from "@/lib/mascots";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function MascotPicker() {
  const { t } = useI18n();
  const mascot = useMascot();
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl edge bg-card px-4 py-3 text-card-foreground">
    <span id="mascot-label">{t("mascot.title")}</span>
    <ToggleGroup type="single" aria-labelledby="mascot-label" value={mascot.id} onValueChange={id => { if (id) setMascot(id); }} variant="outline" spacing={0}>
      {MASCOTS.map(item => <ToggleGroupItem key={item.id} value={item.id} className="min-h-11 gap-1 px-2">
        <img src={item.images.empty} alt="" width={480} height={480} loading="lazy" className="size-8 object-contain" />
        {t(item.name)}
      </ToggleGroupItem>)}
    </ToggleGroup>
  </div>;
}
