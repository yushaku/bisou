import { ImageOff } from "lucide-react";
import { photoUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { formatDay, formatVnd } from "@/lib/format";
import { WishPriority, type Wish } from "./WishCard";

export function WishDetailSheet({ wish }: { wish: Wish }) {
  const { t, locale } = useI18n();
  const photo = wish.photoId ? photoUrl(wish.photoId, "full") : wish.photo?.src;
  return <div className="flex flex-col gap-4 pb-4">
    {photo ? <img src={photo} alt={wish.title} className="max-h-[50vh] w-full rounded-xl object-cover" /> : <div className="flex h-40 items-center justify-center bg-muted"><ImageOff aria-hidden="true" /><span className="sr-only">{t("wish.noPhoto")}</span></div>}
    {wish.price !== null && <p className="font-heading text-lg">{formatVnd(wish.price, locale)}</p>}
    <WishPriority priority={wish.priority} />
    {wish.link && <Button asChild variant="outline" className="w-full"><a href={wish.link} target="_blank" rel="noreferrer noopener">{t("wish.openLink")}</a></Button>}
    <p className="text-sm text-muted-foreground">{t("wish.addedOn", { date: formatDay(new Date(wish.createdAt), locale) })}</p>
    {wish.status === "received" && <>
      {wish.receivedOn && <p className="text-sm text-muted-foreground">{t("received.on", { date: formatDay(wish.receivedOn, locale) })}</p>}
      {wish.note && <p className="whitespace-pre-line text-sm">{wish.note}</p>}
    </>}
  </div>;
}
