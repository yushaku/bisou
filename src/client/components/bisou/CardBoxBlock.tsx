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
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "./EmptyState";
export function CardBoxRows({ boxes, from }: { boxes: CardBoxSummary[]; from: string }) {
  const { t, locale } = useI18n();
  const memory = useContext(TabMemory);
  return <ul className="grid grid-cols-2 items-stretch gap-4">{boxes.map(box => <li key={box.id} className="min-w-0">
    <Link id={`card-box-${box.id}`} href={`/boxes/${box.id}`} state={{ from }} onClick={() => { if (memory && from === "/") { memory.scroll.set("home", window.scrollY); memory.returnFocus = `card-box-${box.id}`; } }} className="flex h-full min-h-11 flex-col gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <span data-box={box.id} className="card-box-colour card-box-face aspect-square overflow-hidden rounded-xl">
        <img src={box.cover} alt={box.name[locale]} width={640} height={640} loading="lazy" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
      </span>
      <span className="block truncate font-heading text-base leading-snug">{box.name[locale]}</span>
      <span className="line-clamp-2 text-sm text-muted-foreground">{box.description[locale]}</span>
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
        <span className="font-semibold tabular-nums">{box.price == null ? (box.open ? t("cardBox.free") : "") : formatBoxPrice(box.price, locale)}</span>
        {!box.open && <span className="text-xs text-muted-foreground">{t("cardBox.preview")}</span>}
      </span>
    </Link>
  </li>)}</ul>;
}
export function CardBoxList({ boxes, failed, refresh, from }: ReturnType<typeof useCardBoxes> & { from: string }) {
  const { t } = useI18n();
  const online = useOnline();
  const message = cardBoxLoadMessage(!!boxes, online, failed ? "loadError" : null);
  return <>
    {message && <div role="alert" className="flex flex-col items-start gap-2"><p>{t(message === "loadError" ? "cardBox.listLoadError" : `cardBox.${message}`)}</p><Button variant="outline" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
    {boxes ? boxes.length ? <CardBoxRows boxes={boxes} from={from} /> : <EmptyState title={t("cardBox.empty")} /> : !message && <Skeleton className="h-72 w-full" aria-label={t("loading")} />}
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
    <CardBoxList {...data} from="/" />
  </section>;
}
