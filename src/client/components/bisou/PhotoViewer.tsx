import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
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
 * previous and next by buttons or arrow keys, Escape or the close button to leave.
 */
export function PhotoViewer({ photos, index, onIndex, onClose, onReturnFocus }: PhotoViewerProps) {
  const { t } = useI18n();
  const total = photos?.length ?? 0;
  const photo = photos?.[index];
  const go = (to: number) => {
    if (to >= 0 && to < total) onIndex(to);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  };

  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
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
        {photo && <img src={photo.src} alt={photo.alt} className="min-h-0 w-full flex-1 object-contain" />}
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
