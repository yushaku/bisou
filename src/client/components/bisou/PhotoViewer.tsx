import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { swipedPhotoIndex } from "@/lib/photoSwipe";
import type { Photo } from "./PhotoGrid";

interface PhotoViewerProps {
  /* Photos of one entry, full rendition; null when closed. */
  photos: Photo[] | null;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /* Focus goes back to the tile of the photo last shown, which also scrolls it into view. */
  onReturnFocus: (index: number) => void;
}

/*
 * Full screen photo on the house Dialog. The square is contained, never cropped further;
 * previous and next by swipe, buttons or arrow keys, Escape or the close button to leave.
 */
export function PhotoViewer({ photos, index, onIndex, onClose, onReturnFocus }: PhotoViewerProps) {
  const { t } = useI18n();
  const total = photos?.length ?? 0;
  const photo = photos?.[index];
  const drag = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null; reduced: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const cancelDrag = () => {
    drag.current = null;
    setDragging(false);
    setOffset(0);
  };
  const go = (to: number) => {
    cancelDrag();
    if (to >= 0 && to < total) onIndex(to);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || total < 2) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Lock the first deliberate direction, so a vertical gesture cannot turn into a swipe.
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (start.axis !== "x" || start.reduced) return;
    const width = e.currentTarget.clientWidth;
    setOffset(Math.max(index === total - 1 ? 0 : -width, Math.min(index === 0 ? 0 : width, dx)));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    if (start.axis === "x") go(swipedPhotoIndex(index, total, e.clientX - start.x, e.clientY - start.y, e.currentTarget.clientWidth));
    else cancelDrag();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  };

  return (
    <Dialog open={!!photo} onOpenChange={(open) => {
      if (!open) {
        cancelDrag();
        onClose();
      }
    }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onReturnFocus(index);
        }}
        className="top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 sm:max-w-none"
      >
        <div className="flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
          <DialogTitle className="flex h-14 min-w-0 flex-1 items-center font-heading text-xl">{t("viewer.title")}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-lg" aria-label={t("common.close")}>
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        {photo && (
          <div
            className="min-h-0 w-full flex-1 touch-pan-y touch-pinch-zoom overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
          >
            <div
              className="flex h-full transition-transform duration-(--duration) ease-(--ease) motion-reduce:transition-none"
              style={{
                transform: `translateX(calc(${-index * 100}% + ${offset}px))`,
                transitionProperty: dragging ? "none" : undefined,
              }}
            >
              {photos?.map((item, i) => (
                <img
                  key={item.src + i}
                  src={item.src}
                  alt={i === index ? item.alt : ""}
                  aria-hidden={i !== index}
                  draggable={false}
                  loading={i === index ? "eager" : "lazy"}
                  className="h-full min-w-0 w-full shrink-0 object-contain select-none"
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-6 px-4 pt-2 pb-[max(--spacing(4),env(safe-area-inset-bottom))]">
          <Button variant="outline" size="icon-lg" aria-label={t("viewer.previous")} disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="min-w-12 text-center tabular-nums">
            {t("viewer.count", { index: index + 1, total })}
          </span>
          <Button variant="outline" size="icon-lg" aria-label={t("viewer.next")} disabled={index >= total - 1} onClick={() => go(index + 1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
