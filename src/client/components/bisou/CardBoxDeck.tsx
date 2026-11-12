import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { CardBoxCard as BoxCard } from "../../../shared/cardBox";
import { cardSwipe } from "../../lib/cardBox";
import { Shuffle } from "lucide-react";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n";
import { CardBoxCard } from "./CardBoxCard";

export function CardBoxDeck({ card, boxId, boxName, adult, previous, onNext, onPrevious, onRandom }: {
  card: BoxCard; boxId: string; boxName: string; previous?: BoxCard; adult?: true;
  onNext: () => void; onPrevious: () => void; onRandom: () => void;
}) {
  const { t } = useI18n();
  const canPrevious = !!previous;
  const drag = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const busy = useRef(false);
  const [offset, setOffset] = useState(0);
  const [leaving, setLeaving] = useState<{ card: BoxCard; offset: number; direction: "next" | "previous" | "random" } | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [turn, setTurn] = useState(0);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cancel = () => { drag.current = null; setOffset(0); };
  const go = (direction: "next" | "previous" | "random") => {
    if (busy.current) return;
    if (direction === "previous" && !canPrevious) { cancel(); return; }
    busy.current = true;
    if (direction === "random" && !reduced()) { cancel(); setShuffling(true); return; }
    change(direction);
  };
  const change = (direction: "next" | "previous" | "random") => {
    setLeaving({ card, offset, direction });
    cancel();
    setTurn(turn => turn + 1);
    if (direction === "next") onNext(); else if (direction === "previous") onPrevious(); else onRandom();
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || busy.current) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (start.axis === "x" && !reduced()) setOffset(dx > 0 && !canPrevious ? Math.min(dx * .18, 24) : dx);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const direction = start.axis === "x" ? cardSwipe(event.clientX - start.x, event.clientY - start.y, event.currentTarget.clientWidth) : null;
    if (direction) go(direction); else cancel();
  };
  const backDrag = offset > 0 && canPrevious;
  return <div className="flex flex-col gap-6" onKeyDown={event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowLeft" ? "next" : "previous");
    }
  }}>
    <div data-box={boxId} className={`card-box-colour card-box-deck ${shuffling ? "card-box-shuffle-deck" : ""} touch-pan-y touch-pinch-zoom select-none`}
      tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}>
      <div aria-live="polite" aria-atomic="true"><div key={turn}
        className={shuffling ? "card-box-shuffling" : leaving?.direction === "previous" ? "card-box-returning" : leaving ? "card-box-entering" : undefined}
        style={{ "--return-x": `${leaving?.offset ?? 0}px`, "--return-rotation": `${(leaving?.offset ?? 0) / 24}deg` } as CSSProperties}
        onAnimationEnd={event => {
          if (event.target !== event.currentTarget || !shuffling) return;
          setShuffling(false); change("random");
        }}>
        <div style={{ transform: backDrag ? `translateY(${Math.min(offset / 12, 12)}px) scale(${1 - Math.min(offset / 4000, .06)})` : offset ? `translateX(${offset}px) rotate(${offset / 24}deg)` : undefined, transition: drag.current ? "none" : "transform 180ms var(--ease)" }}>
          <CardBoxCard card={card} boxId={boxId} boxName={boxName} adult={adult} />
        </div>
      </div></div>
      {backDrag && <div aria-hidden="true" className="card-box-back-preview" style={{ transform: `translateX(calc(-100% + ${offset}px)) rotate(${-14 + Math.min(offset / 24, 14)}deg)` }}>
        <CardBoxCard card={previous!} boxId={boxId} boxName={boxName} adult={adult} />
      </div>}
      {leaving && <div aria-hidden="true" className={`card-box-leaving card-box-leaving-${leaving.direction}`} style={{
        "--drag-x": `${leaving.direction === "next" ? leaving.offset : 0}px`, "--drag-rotation": `${leaving.direction === "next" ? leaving.offset / 24 : 0}deg`,
        "--fly-x": "-130%", "--fly-rotation": "-14deg",
      } as CSSProperties} onAnimationEnd={() => { setLeaving(null); busy.current = false; }}>
        <CardBoxCard card={leaving.card} boxId={boxId} boxName={boxName} adult={adult} />
      </div>}
    </div>
    <div className="flex gap-3">
      <Button className="flex-1 px-3" variant="secondary" disabled={!canPrevious} onClick={() => go("previous")}>{t("cardBox.previous")}</Button>
      <Button variant="secondary" size="icon" aria-label={t("cardBox.random")} onClick={() => go("random")}><Shuffle aria-hidden="true" /></Button>
      <Button className="flex-1 px-3" onClick={() => go("next")}>{t("cardBox.next")}</Button>
    </div>
  </div>;
}
