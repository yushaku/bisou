import type { CardBoxCard as BoxCard } from "../../../shared/cardBox";
import { useI18n } from "../../i18n";
import { Card } from "../ui/card";
export function CardBoxCard({ card }: { card: BoxCard }) {
  const { t, locale } = useI18n();
  return <Card className="gap-6 p-6">
    <p className="text-sm text-muted-foreground">{t(`cardBox.kind.${card.kind}`)}</p>
    {card.kind === "rather" ? <div className="flex flex-col gap-4">{card.options.map((option, i) => <p key={i} className="rounded-xl bg-muted p-4 text-xl">{option[locale]}</p>)}</div> : <p className="font-heading text-2xl leading-relaxed">{card.text[locale]}</p>}
    {card.kind === "scale" && <div role="img" aria-label={`1: ${card.low[locale]} 10: ${card.high[locale]}`} className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex justify-between gap-1 text-muted-foreground">{Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
      <div className="flex justify-between gap-6 text-base"><p>1: {card.low[locale]}</p><p>10: {card.high[locale]}</p></div>
    </div>}
  </Card>;
}
