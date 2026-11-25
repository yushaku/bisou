import { photoUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { formatDay, formatVnd } from "@/lib/format";
import { WishPriority, type CardWish } from "./WishCard";

/** A private wish (received) or a shared one (done). */
export type DetailWish = CardWish & {
  createdAt: number;
  status: "open" | "received" | "done";
  receivedOn?: string | null;
  doneOn?: string | null;
  note: string | null;
};

export function WishDetailSheet({ wish, addedBy }: { wish: DetailWish; addedBy?: string }) {
  const { t, locale } = useI18n();
  const photo = wish.photoId ? photoUrl(wish.photoId, "full") : wish.photo?.src;
  return (
    <div className="flex flex-col gap-4 pb-4">
      {photo ? <img src={photo} alt={wish.title} className="max-h-[50vh] w-full rounded-xl object-cover" /> : null}
      {wish.price !== null && <p className="font-heading text-lg">{formatVnd(wish.price, locale)}</p>}
      {wish.priority && <WishPriority priority={wish.priority} />}
      {wish.link && (
        <Button asChild variant="outline" className="w-full">
          <a href={wish.link} target="_blank" rel="noreferrer noopener">
            {t("wish.openLink")}
          </a>
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        {t("wish.addedOn", { date: formatDay(new Date(wish.createdAt), locale) })}
      </p>
      {addedBy && <p className="text-sm text-muted-foreground">{t("sharedWish.addedBy", { name: addedBy })}</p>}
      {wish.status === "done" && (
        <>
          {wish.doneOn && (
            <p className="text-sm text-muted-foreground">
              {t("sharedWish.doneOn", { date: formatDay(wish.doneOn, locale) })}
            </p>
          )}
          {wish.note && <p className="text-sm whitespace-pre-line">{wish.note}</p>}
        </>
      )}
      {wish.status === "received" && (
        <>
          {wish.receivedOn && (
            <p className="text-sm text-muted-foreground">
              {t("received.on", { date: formatDay(wish.receivedOn, locale) })}
            </p>
          )}
          {wish.note && <p className="text-sm whitespace-pre-line">{wish.note}</p>}
        </>
      )}
    </div>
  );
}
