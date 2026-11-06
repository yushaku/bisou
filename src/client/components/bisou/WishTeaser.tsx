import pouch from "@/assets/wish-pouch.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";

export function WishTeaser({ onOpen, title, description, disabled }: { onOpen: () => void; title?: string; description?: string; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <Card className="flex-row items-center gap-2 px-3 py-3">
      <div className="size-14 shrink-0">
        <img src={pouch} alt="" width={256} height={256} className="size-full object-contain" />
      </div>
      <div className="min-w-0 flex-1"><h2 className="font-heading text-base">{title ?? t("home.smallWish")}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <Button className="px-3" disabled={disabled} onClick={onOpen}>{t("home.openJar")}</Button>
    </Card>
  );
}
