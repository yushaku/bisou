import { useContext } from "react";
import { Link } from "wouter";
import type { CardBoxSummary } from "../../../shared/cardBox";
import { useI18n } from "../../i18n";
import { TabMemory } from "../../lib/tabMemory";
import { useCardBoxes } from "../../lib/useCardBoxes";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
export function CardBoxRows({ boxes, from }: { boxes: CardBoxSummary[]; from: string }) {
  const { t, locale } = useI18n();
  const memory = useContext(TabMemory);
  return <Card className="gap-0 py-0"><ul className="divide-y divide-border">{boxes.map(box => <li key={box.id}>
    <Link id={`card-box-${box.id}`} href={`/boxes/${box.id}`} state={{ from }} onClick={() => { if (memory && from === "/") { memory.scroll.set("home", window.scrollY); memory.returnFocus = `card-box-${box.id}`; } }} className="flex min-h-11 flex-col gap-2 p-4">
      <span className="flex items-center justify-between gap-3"><span className="font-heading text-xl">{box.name[locale]}</span>{!box.open && <span className="text-sm text-muted-foreground">{t("cardBox.preview")}</span>}</span>
      <span className="text-base text-muted-foreground">{box.description[locale]}</span>
    </Link>
  </li>)}</ul></Card>;
}
export function CardBoxList({ boxes, failed, refresh, from }: ReturnType<typeof useCardBoxes> & { from: string }) {
  const { t } = useI18n();
  return <>
    {failed && <div role="status"><p>{t("cardBox.loadError")}</p><Button variant="ghost" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
    {boxes ? boxes.length ? <CardBoxRows boxes={boxes} from={from} /> : <p>{t("cardBox.empty")}</p> : !failed && <Card aria-busy="true" className="p-6"><p>{t("cardBox.opening")}</p></Card>}
  </>;
}
export function CardBoxBlock({ onSignedOut }: { onSignedOut: () => void }) {
  const data = useCardBoxes(onSignedOut);
  const { t } = useI18n();
  const memory = useContext(TabMemory);
  return <section className="flex flex-col gap-3" aria-labelledby="card-box-title">
    <div className="flex items-center justify-between gap-3"><h2 id="card-box-title" className="font-heading text-xl">{t("cardBox.title")}</h2>
      <Button asChild variant="ghost"><Link id="boxes-see-all" href="/boxes" state={{ from: "/" }} onClick={() => { if (memory) { memory.scroll.set("home", window.scrollY); memory.returnFocus = "boxes-see-all"; } }}>{t("cardBox.seeAll")}</Link></Button>
    </div>
    <CardBoxList {...data} from="/" />
  </section>;
}
