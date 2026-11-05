import { ImagePlus, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { fitSquare, takeRoom } from "@/lib/compose";
import { decodePhoto, renderSquare, type Area } from "@/lib/photo";
import { PhotoCropDialog, type CropRequest } from "./PhotoCropDialog";
import type { useUploadQueue } from "./useUploadQueue";

export function PhotoPicker({ queue, max, saving, onChange: change, onPreparingChange }: {
  queue: ReturnType<typeof useUploadQueue>;
  max: number;
  saving: boolean;
  onChange: () => void;
  onPreparingChange?: (preparing: boolean) => void;
}) {
  const { t } = useI18n();
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropping, setCropping] = useState<CropRequest | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const cancelCrop = useRef<(() => void) | null>(null);
  useEffect(() => { onPreparingChange?.(preparing); }, [preparing, onPreparingChange]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelCrop.current?.(); onPreparingChange?.(false); };
  }, [onPreparingChange]);
  /* The square the author frames in the crop step, or null when they skip the photo. */
  const frame = (file: File, bitmap: ImageBitmap, index: number, total: number) =>
    new Promise<Area | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const done = (area: Area | null) => {
        URL.revokeObjectURL(url);
        cancelCrop.current = null;
        if (mounted.current) setCropping(null);
        resolve(area && fitSquare(area, bitmap));
      };
      cancelCrop.current = () => done(null);
      setCropping({ url, index, total, done });
    });

  async function addFiles(files: File[]) {
    if (preparing) return;
    const { take, refused } = takeRoom(queue.items.length, files.length, max);
    const messages: string[] = refused ? [t(max === 1 ? "wish.photoLimit" : "compose.limit")] : [];
    setPhotoError(refused ? messages.join(" ") : null);
    if (take === 0) return;
    change();
    setPreparing(true);
    // One photo at a time: a phone holds a single full size bitmap in memory, never four.
    const chosen = files.slice(0, take);
    for (const [index, file] of chosen.entries()) {
      if (!mounted.current) break;
      let bitmap: ImageBitmap;
      try {
        bitmap = await decodePhoto(file);
      } catch {
        messages.push(t("compose.photoUnreadable", { name: file.name }));
        continue;
      }
      if (!mounted.current) { bitmap.close(); break; }
      const area = await frame(file, bitmap, index, chosen.length);
      if (!area) {
        bitmap.close();
        continue;
      }
      try {
        const renditions = await renderSquare(bitmap, area);
        if (mounted.current) queue.add(renditions);
      } catch {
        messages.push(t("compose.photoUnreadable", { name: file.name }));
      }
    }
    if (!mounted.current) return;
    setPreparing(false);
    setPhotoError(messages.length ? messages.join(" ") : null);
  }

  return <>
          <div className="flex flex-col gap-3">
            <p className="flex items-center justify-between">
              <span className="font-semibold">{t("compose.photos")}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("compose.count", { count: queue.items.length, max: max })}
              </span>
            </p>

            {queue.items.length > 0 && (
              <ul className="grid grid-cols-2 gap-3">
                {queue.items.map((item, i) => (
                  <li key={item.localId} className="overflow-hidden rounded-(--photo-radius) edge bg-background">
                    <img src={item.previewUrl} alt={t("compose.photo", { index: i + 1 })} className="aspect-square w-full object-cover" />
                    <div className="flex items-center justify-between pl-2 text-sm">
                      <span>{t("compose.photo", { index: i + 1 })}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("compose.remove", { index: i + 1 })}
                        disabled={saving}
                        onClick={() => {
                          queue.remove(item);
                          setPhotoError(null);
                          change();
                        }}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                    {item.state === "uploading" && (
                      <div
                        role="progressbar"
                        aria-label={t("compose.uploading", { index: i + 1 })}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        className="mx-2 mb-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div className="h-full bg-primary transition-[width]" style={{ width: `${item.progress * 100}%` }} />
                      </div>
                    )}
                    {item.state === "failed" && (
                      <div className="flex flex-col gap-1 px-2 pb-2">
                        <p className="text-sm text-destructive">{t(item.error ?? "compose.photoFailed")}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => queue.retry(item.localId)}>
                          <RotateCw aria-hidden="true" />
                          {t("journal.retry")}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-12"
              loading={preparing}
              disabled={saving}
              onClick={() => {
                if (queue.items.length >= max) setPhotoError(t(max === 1 ? "wish.photoLimit" : "compose.limit"));
                else fileInput.current?.click();
              }}
            >
              {!preparing && <ImagePlus aria-hidden="true" />}
              {preparing ? t("compose.preparing") : t("compose.add")}
            </Button>
            {/* image/* lets iOS hand over a JPEG for a HEIC photo. */}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple={max > 1}
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void addFiles(files);
              }}
            />
            <p className="text-sm text-muted-foreground">{t("compose.photoHelp")}</p>
            <p role="alert" className="text-sm text-destructive empty:hidden">
              {photoError}
            </p>
          </div>
    <PhotoCropDialog request={cropping} />
  </>;
}
