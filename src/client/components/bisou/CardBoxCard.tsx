import type { CardBoxCard as BoxCard } from "../../../shared/cardBox";
import { Badge } from "../ui/badge";
import { useI18n } from "../../i18n";

export function CardBoxCard({ card, boxName = "", boxId, adult }: { card: BoxCard; boxName?: string; boxId?: string; adult?: true }) {
  const { t, locale } = useI18n();
  return <article data-box={boxId} className="card-box-colour card-box-face flex aspect-[5/7] flex-col gap-6 rounded-2xl p-6">
    <div className="flex items-center justify-between gap-2"><p className="text-sm">{t(`cardBox.kind.${card.kind}`)}</p>{adult && <Badge variant="outline" className="border-current/20 text-inherit">{t("cardBox.adult")}</Badge>}</div>
    {card.kind === "truthDare" ? <div className="my-auto flex flex-col gap-4">{(["truth", "dare"] as const).map(side => <div key={side} className="rounded-xl border border-current/20 p-4 text-xl">
      <p className="mb-2 text-sm">{t(`cardBox.${side}`)}</p><p>{card[side][locale]}</p>
    </div>)}</div> : card.kind === "rather" ? <div className="my-auto flex flex-col gap-4">{card.options.map((option, i) => <p key={i} className="rounded-xl border border-current/20 p-4 text-xl">{option[locale]}</p>)}</div> : <p className="my-auto font-heading text-2xl leading-relaxed">{card.text[locale]}</p>}
    {card.kind === "scale" && <div role="img" aria-label={`1: ${card.low[locale]} 10: ${card.high[locale]}`} className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex justify-between gap-1">{Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
      <div className="flex justify-between gap-6 text-base"><p>1: {card.low[locale]}</p><p>10: {card.high[locale]}</p></div>
    </div>}
    <p className="mt-auto text-right font-serif text-sm italic">{boxName}</p>
  </article>;
}
