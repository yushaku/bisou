import { useState } from "react";
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
 * Drag or arrow keys move the photo inside its frame; pinch, wheel or +/- zoom it.
 * Several photos come one after another.
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
          cropperProps={{
            "aria-label": t(request.round ? "crop.roundArea" : "crop.area"),
            onKeyDownCapture: (event) => {
              if (event.key !== "+" && event.key !== "-") return;
              event.preventDefault();
              setZoom((value) => Math.min(MAX_ZOOM, Math.max(1, value + (event.key === "+" ? 0.1 : -0.1))));
            },
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t(request.round ? "crop.roundHelp" : "crop.help")}</p>
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
