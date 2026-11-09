import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock, Heart, LockKeyhole, Sparkles, type LucideIcon } from "lucide-react";
import { LEVEL_IDS, type GardenLevels as Levels, type RelationshipLevel } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { GARDEN_STAGE_LABEL, gardenStageState, type GardenStageState } from "../../lib/gardenStages";
import { Button } from "../ui/button";

const STATE_ICON: Record<GardenStageState, LucideIcon> = {
  current: Heart,
  opened: Check,
  locked: LockKeyhole,
  proposed: Clock,
  chosen: Check,
  unplaced: Sparkles,
};

/* The journey overview: one floating island per relationship stage, joined by a winding path. */
export function GardenMap({ levels, viewingId, onSelect, onClose }: {
  levels: Levels;
  viewingId: RelationshipLevel;
  onSelect: (levelId: RelationshipLevel) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const islands = useRef<Partial<Record<RelationshipLevel, HTMLButtonElement | null>>>({});
  const trail = useRef<HTMLOListElement | null>(null);
  const [road, setRoad] = useState<{ width: number; height: number; segments: { id: string; d: string; reached: boolean }[] }>({ width: 0, height: 0, segments: [] });
  const measure = useCallback(() => {
    const list = trail.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    const segments = LEVEL_IDS.slice(0, -1).flatMap((fromLevel, index) => {
      const toLevel = LEVEL_IDS[index + 1];
      if (!toLevel) return [];
      const from = islands.current[fromLevel];
      const to = islands.current[toLevel];
      if (!from || !to) return [];
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.left - listRect.left + a.width / 2;
      const y1 = a.bottom - listRect.top - a.height * 0.1;
      const x2 = b.left - listRect.left + b.width / 2;
      const y2 = b.top - listRect.top + b.height * 0.26;
      const bend = Math.max(28, (y2 - y1) * 0.45);
      const fromRank = LEVEL_IDS.indexOf(fromLevel);
      return [{ id: `${fromLevel}-${toLevel}`, d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`, reached: levels.furthestLevelId ? fromRank < LEVEL_IDS.indexOf(levels.furthestLevelId) : false }];
    });
    setRoad({ width: listRect.width, height: listRect.height, segments });
  }, [levels.furthestLevelId]);
  useEffect(() => {
    const list = trail.current;
    measure();
    const observer = new ResizeObserver(measure);
    if (list) observer.observe(list);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(() => measure());
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure]);

  return <section aria-label={t("garden.islands")} className="garden-isles">
    <header className="garden-map-head">
      <div className="min-w-0">
        <h2 className="font-heading text-xl">{t("garden.mapTitle")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("garden.mapHint")}</p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={onClose}>
        <ArrowLeft className="size-4" aria-hidden="true" />{t("garden.backToGarden")}
      </Button>
    </header>

    <div className="garden-trail-wrap">
      {road.width > 0 && <svg className="garden-path" aria-hidden="true" width={road.width} height={road.height} viewBox={`0 0 ${road.width} ${road.height}`}>
        {road.segments.map((segment) => <g key={segment.id} className="garden-path-segment" data-reached={segment.reached}>
          <path className="garden-path-road" d={segment.d} />
          <path className="garden-path-line" d={segment.d} />
        </g>)}
      </svg>}
      <ol ref={trail} className="garden-trail">
        {LEVEL_IDS.map((levelId, rank) => {
          const state = gardenStageState(levelId, levels);
          const viewing = viewingId === levelId;
          const StateIcon = STATE_ICON[state];
          return <li key={levelId} className="garden-stop" data-side={rank % 2 === 1 ? "end" : "start"}>
            <button type="button" ref={(node) => { islands.current[levelId] = node; }} className="garden-island press" data-state={state} data-rank={rank} data-viewing={viewing}
              aria-label={`${t(`level.${levelId}`)} · ${t(GARDEN_STAGE_LABEL[state])}`} onClick={() => onSelect(levelId)}>
              <span className="garden-island-art-wrap"><IslandArt rank={rank} /></span>
              <span className="garden-island-copy">
                <span className="garden-island-name font-heading">{t(`level.${levelId}`)}</span>
                <span className="garden-island-state"><StateIcon className="size-3" aria-hidden="true" />{t(GARDEN_STAGE_LABEL[state])}</span>
                {viewing && state !== "current" && <span className="garden-island-viewing">{t("garden.viewingStage")}</span>}
              </span>
            </button>
          </li>;
        })}
      </ol>
    </div>
  </section>;
}

/* One hand-drawn floating island. Shape and decorations stay decorative; state text carries meaning. */
function IslandArt({ rank }: { rank: number }) {
  return <svg viewBox="0 0 240 148" aria-hidden="true" className="island-art">
    <ellipse className="island-shadow" cx="120" cy="136" rx="78" ry="8" />
    <path className="island-rock-deep" d="M34 72c4 20 16 35 34 45l12 14 10-9 12 11 12-10 9 6 14-13c16-10 27-25 31-44-7 24-29 39-60 43-31-4-53-19-60-43Z" />
    <path className="island-rock" d="M28 64c12-18 42-28 92-28s80 10 92 28c-6 19-20 33-38 42-16 8-38 12-62 12s-46-4-62-12c-18-9-32-23-38-42Z" />
    <path className="island-rock-rim" d="M34 63c13-13 42-20 86-20s73 7 86 20c-5 8-14 14-25 19-16 6-38 9-61 9s-45-3-61-9c-11-5-20-11-25-19Z" />
    <path className="island-grass" d="M31 60c11-16 40-25 89-25s78 9 89 25c-5 13-17 23-32 29-15 6-36 9-57 9s-42-3-57-9c-15-6-27-16-32-29Z" />
    <path className="island-grass-light" d="M48 55c14-8 38-12 72-12s58 4 72 12c-10 7-32 11-72 11s-62-4-72-11Z" />
    <path className="island-hill" d="M82 52c12-8 64-8 76 0-9 8-24 12-38 12s-29-4-38-12Z" />
    <ellipse className="island-stone" cx="54" cy="80" rx="6" ry="3" />
    <ellipse className="island-stone" cx="188" cy="86" rx="5" ry="2.6" />
    <path className="island-vine" d="M54 92c-6 10-4 19 3 26M186 92c6 10 4 19-3 26M80 103c-3 8-2 14 3 19M160 103c3 8 2 14-3 19" />
    <g className="island-flowers">
      <g transform="translate(62 56)"><path className="island-stem" d="M0 0v10" /><circle className="island-flower" cx="0" cy="-2" r="4" /><circle className="island-flower-core" cx="0" cy="-2" r="1.4" /></g>
      <g transform="translate(176 60)"><path className="island-stem" d="M0 0v8" /><circle className="island-flower" cx="0" cy="-1" r="3.4" /><circle className="island-flower-core" cx="0" cy="-1" r="1.2" /></g>
      <g transform="translate(112 50)"><path className="island-stem" d="M0 0v7" /><circle className="island-flower" cx="0" cy="-1" r="3" /><circle className="island-flower-core" cx="0" cy="-1" r="1" /></g>
    </g>
    <g className="island-flag" transform="translate(178 28)">
      <path className="island-flag-pole" d="M0 30V2" />
      <path className="island-flag-cloth" d="M1 3l18 6-18 7Z" />
    </g>
    {rank % 2 === 1 && <path className="island-tuft" d="M194 72c4-8 9-10 13-10M200 72c1-6 3-9 7-11" />}
    {rank >= 3 && <path className="island-tuft" d="M42 76c4-7 9-9 13-9M48 76c1-5 3-8 7-10" />}
  </svg>;
}
