import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { PersonAvatar } from "./CoupleAvatars";
import type { Entry } from "./EntryCard";

export function JournalDetailSheet({ entry, onOpenPhoto }: { entry: Entry; onOpenPhoto: (index: number) => void }) {
  const { t } = useI18n();
  return <div className="flex flex-col gap-4 pb-4">
    <div className="flex items-center gap-2"><PersonAvatar person={entry.author} size="sm" /><span>{entry.author.name}</span><span className="text-sm text-muted-foreground">{entry.time}</span></div>
    {entry.milestone && <h3 className="font-heading text-xl">{entry.milestone}</h3>}
    {entry.source === "wish" && <Badge variant="secondary">{t("entry.fromWish")}</Badge>}
    <p className="whitespace-pre-line wrap-anywhere">{entry.body}</p>
    {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
    {entry.photos.map((photo, index) => <button key={index} type="button" onClick={() => onOpenPhoto(index)} className="focus-visible:ring-3 focus-visible:ring-ring"><img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 448px) 100vw, 448px" alt={photo.alt} className="w-full" /></button>)}
  </div>;
}
