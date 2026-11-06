import { useId, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { Area } from "@/lib/photo";

export interface CropRequest {
  /* Object URL of the picked file; the img applies its EXIF rotation, as decodePhoto does. */
  url: string;
  index: number;
  total: number;
  round?: boolean;
  /* The chosen area in the photo's pixels, or null when the author skips this photo. */
  done: (area: Area | null) => void;
}

const MAX_ZOOM = 4;

/*
 * The author moves and zooms a picked photo inside a square frame (R18): drag or arrow keys
 * to move, pinch, wheel or the slider to zoom. Several photos come one after another.
 */
export function PhotoCropDialog({ request }: { request: CropRequest | null }) {
  const { t } = useI18n();
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && request?.done(null)}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] overflow-y-auto"
        // A drag that ends outside the frame must not drop the photo.
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t("crop.title")}</DialogTitle>
          {request && request.total > 1 && (
            <DialogDescription className="text-base">{t("crop.step", { index: request.index + 1, total: request.total })}</DialogDescription>
          )}
        </DialogHeader>
        {/* Keyed by photo, so each one starts centered at 1x. */}
        {request && <CropFrame key={request.url} request={request} />}
      </DialogContent>
    </Dialog>
  );
}

function CropFrame({ request }: { request: CropRequest }) {
  const { t } = useI18n();
  const zoomId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Cropper
          image={request.url}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape={request.round ? "round" : "rect"}
          showGrid={!request.round}
          minZoom={1}
          maxZoom={MAX_ZOOM}
          objectFit="cover"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
          cropperProps={{ "aria-label": t("crop.area") }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t("crop.help")}</p>
      <label htmlFor={zoomId} className="flex flex-col gap-2 font-semibold">
        {t("crop.zoom")}
        <input
          id={zoomId}
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-11 w-full accent-primary"
        />
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={() => request.done(null)}>
          {t(request.round ? "entry.cancel" : "crop.skip")}
        </Button>
        <Button disabled={!area} onClick={() => area && request.done(area)}>
          {t("crop.use")}
        </Button>
      </DialogFooter>
    </>
  );
}
