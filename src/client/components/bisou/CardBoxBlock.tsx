import { Mascot } from "./Mascot";
import { useContext } from "react";
import { Link } from "wouter";
import type { CardBoxSummary } from "../../../shared/cardBox";
import { useI18n } from "../../i18n";
import { TabMemory } from "../../lib/tabMemory";
import { useCardBoxes } from "../../lib/useCardBoxes";
import { cardBoxLoadMessage } from "../../lib/cardBox";
import { useOnline } from "../../lib/useOnline";
import { formatBoxPrice } from "../../lib/cardBox";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "./EmptyState";
export function CardBoxRows({ boxes, from, compact }: { boxes: CardBoxSummary[]; from: string; compact?: boolean }) {
  const { t, locale } = useI18n();
  const memory = useContext(TabMemory);
  return <ul className="grid grid-cols-2 items-stretch gap-4">{(compact ? boxes.slice(0, 4) : boxes).map(box => <li key={box.id} className="min-w-0">
    <Link id={`card-box-${box.id}`} href={`/boxes/${box.id}`} state={{ from }} onClick={() => { if (memory && from === "/") { memory.scroll.set("home", window.scrollY); memory.returnFocus = `card-box-${box.id}`; } }} className="relative isolate flex h-64 min-h-11 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <img src={box.cover} alt="" width={800} height={1024} loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
      <span className="relative h-1/2 shrink-0">
        {(box.price == null ? box.open : !box.open) && <Badge variant="secondary" className="absolute top-2 left-2 bg-card text-card-foreground tabular-nums">{box.price != null ? formatBoxPrice(box.price, locale) : t("cardBox.free")}</Badge>}
        {box.adult && <Badge variant="secondary" className="absolute top-2 right-2 bg-card text-card-foreground">{t("cardBox.adult")}</Badge>}
      </span>
      <span className="liquid-glass mt-auto flex shrink-0 flex-col gap-2 rounded-t-xl border-x-0 border-b-0 p-3">
        <span className="truncate font-heading text-base leading-snug">{box.name[locale]}</span>
        {!compact && <span className="line-clamp-2 text-sm text-card-foreground">{box.description[locale]}</span>}
        {box.cardCount != null && <span className="text-xs text-muted-foreground tabular-nums">{t(box.cardCount === 1 ? "cardBox.cardCountOne" : "cardBox.cardCount", { count: box.cardCount })}</span>}
      </span>
    </Link>
  </li>)}</ul>;
}
export function CardBoxList({ boxes, failed, refresh, from, compact }: ReturnType<typeof useCardBoxes> & { from: string; compact?: boolean }) {
  const { t } = useI18n();
  const online = useOnline();
  const message = cardBoxLoadMessage(!!boxes, online, failed ? "loadError" : null);
  return <>
    {message && <div role="alert" className="flex flex-col items-start gap-2"><Mascot situation="error" /><p>{t(message === "loadError" ? "cardBox.listLoadError" : `cardBox.${message}`)}</p><Button variant="outline" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
    {boxes ? boxes.length ? <CardBoxRows boxes={boxes} from={from} compact={compact} /> : <EmptyState title={t("cardBox.empty")} /> : !message && <Skeleton className="h-72 w-full" aria-label={t("loading")} />}
  </>;
}
export function CardBoxBlock({ onSignedOut, scope }: { onSignedOut: () => void; scope: string }) {
  const data = useCardBoxes(onSignedOut, scope);
  const { t } = useI18n();
  const memory = useContext(TabMemory);
  return <section className="flex flex-col gap-3" aria-labelledby="card-box-title">
    <div className="flex items-center justify-between gap-3"><h2 id="card-box-title" className="font-heading text-xl">{t("cardBox.title")}</h2>
      <Button asChild variant="ghost"><Link id="boxes-see-all" href="/boxes" state={{ from: "/" }} onClick={() => { if (memory) { memory.scroll.set("home", window.scrollY); memory.returnFocus = "boxes-see-all"; } }}>{t("cardBox.seeAll")}</Link></Button>
    </div>
    <CardBoxList {...data} from="/" compact />
  </section>;
}
