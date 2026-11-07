import { useId } from "react";
import { DECKS } from "../../../shared/garden";
import { useI18n } from "../../i18n";

const LEAVES = [
  "M0 0C-26 0-28-22-8-28C6-21 9-8 0 0Z",
  "M0 0C-20-2-28-20-18-30C-5-34 9-15 0 0Z",
  "M0 0C-30 3-32-24-15-26C2-29 10-9 0 0Z",
  "M0 0C-12-8-23-13-18-19L-24-27-10-25-8-35 0-22 8-20C9-10 4-3 0 0Z",
  "M0 0C-24-8-24-26-12-27C-8-39 8-30 10-18C12-9 5-3 0 0Z",
  "M0 0C-32-1-35-17-20-21C-34-32-12-36-7-25C2-35 15-17 5-8Z",
];

export function Plant({ deckId, stage }: { deckId: string; stage: number }) {
  const id = useId();
  const { locale } = useI18n();
  const species = Math.max(0, DECKS.findIndex((deck) => deck.id === deckId));
  return <svg viewBox="0 0 120 170" role="img" aria-label={DECKS[species]!.name[locale]} className="garden-plant h-36 w-full" data-stage={stage} data-species={deckId}>
    <defs><path id={`${id}-leaf`} d={LEAVES[species]} /><clipPath id={`${id}-pot`}><path d="M41 144H79L74 165H46Z" /></clipPath></defs>
    <ellipse cx="60" cy="165" rx="27" ry="3" className="plant-shadow" />
    <g className="plant-foliage">
      {Array.from({ length: 8 }, (_, layer) => {
        const y = 137 - layer * 15;
        return <g key={layer} className={`plant-layer plant-s${layer}`}>
          <path className="plant-ink plant-stem" d={`M60 ${y + 16}Q${layer % 2 ? 57 : 63} ${y + 8} 60 ${y}`} />
          <g transform={`translate(60 ${y + 5}) scale(${.4 + layer * .055})`}>
            <use href={`#${id}-leaf`} className="plant-leaf" transform="rotate(-16)" />
            <use href={`#${id}-leaf`} className="plant-leaf" transform="scale(-1 1) rotate(-18)" />
          </g>
          {layer >= 4 && <g transform={`translate(${layer % 2 ? 42 : 78} ${y})`}>
            {species % 2 ? <path className="plant-flower" d="M0-6C3-12 9-5 5-2C12 2 3 9 0 5C-6 10-11 2-5-1C-10-7-3-12 0-6Z" /> : <circle r="5" className="plant-flower" />}
            <circle r="1.5" className="plant-seed" />
          </g>}
        </g>;
      })}
    </g>
    <path d="M41 144H79L74 165H46Z" className="plant-pot" />
    <path d="M35 148Q60 154 85 148M37 156Q60 162 83 156" className="plant-ink plant-pot-stitch" clipPath={`url(#${id}-pot)`} />
    <path d="M39 143Q60 140 81 143L80 148Q60 151 40 148Z" className="plant-pot" />
  </svg>;
}
