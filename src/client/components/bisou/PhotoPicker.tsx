import { ImagePlus, RotateCw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/ding-toaster";
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
  const [cropping, setCropping] = useState<CropRequest | null>(null);
  const toastId = useId();
  const loading = useRef<"preparing" | "uploading" | null>(null);
  const batch = useRef(new Set<string>());
  const latestQueue = useRef(queue);
  latestQueue.current = queue;
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const cancelCrop = useRef<(() => void) | null>(null);
  useEffect(() => { onPreparingChange?.(preparing); }, [preparing, onPreparingChange]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelCrop.current?.(); onPreparingChange?.(false); };
  }, [onPreparingChange]);
  useEffect(() => () => { toast.dismiss(toastId); }, [toastId]);
  useEffect(() => {
    const pending = queue.items.filter((item) => item.state === "queued" || item.state === "uploading");
    for (const item of pending) batch.current.add(item.localId);
    const photos = queue.items.filter((item) => batch.current.has(item.localId));
    if (pending.length) {
      const settled = photos.filter((item) => item.state === "done" || item.state === "failed").length;
      const title = t("compose.uploadProgress", { index: Math.min(settled + 1, photos.length), total: photos.length });
      const progress = photos.reduce((sum, item) => sum + (item.state === "done" ? 1 : item.state === "uploading" ? item.progress : 0), 0) / photos.length;
      toast.loading(title, { id: toastId, progress });
      loading.current = "uploading";
    } else if (preparing) {
      if (loading.current !== "preparing") toast.loading(t("compose.preparing"), { id: toastId });
      loading.current = "preparing";
    } else if (loading.current) {
      const failed = queue.items.filter((item) => item.state === "failed");
      if (failed.length) {
        toast.error(t(failed[0]!.error ?? "compose.photoFailed"), {
          id: toastId,
          action: { label: t("journal.retry"), onClick: () => {
            if (!mounted.current) return;
            for (const item of latestQueue.current.items) {
              if (item.state === "failed") latestQueue.current.retry(item.localId);
            }
          } },
        });
      } else if (photos.some((item) => item.state === "done")) {
        toast.success(t("compose.photosUploaded"), { id: toastId });
      } else toast.dismiss(toastId);
      loading.current = null;
      batch.current.clear();
    }
  }, [queue.items, queue.retry, preparing, t, toastId]);
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
    if (refused) toast.warning(t(max === 1 ? "wish.photoLimit" : "compose.limit"));
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
        if (mounted.current) toast.error(t("compose.photoUnreadable", { name: file.name }));
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
        if (mounted.current) toast.error(t("compose.photoUnreadable", { name: file.name }));
      }
    }
    if (!mounted.current) return;
    setPreparing(false);
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
                    <img src={item.previewUrl} alt={t("compose.photo", { index: i + 1 })} className={`aspect-square w-full object-cover${item.state === "uploading" || item.state === "queued" ? " opacity-60" : ""}`} />
                    <div className="flex items-center justify-between pl-2 text-sm">
                      <span>{t("compose.photo", { index: i + 1 })}</span>
                      {item.state === "failed" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("compose.retryPhoto", { index: i + 1 })}
                          disabled={saving}
                          onClick={() => queue.retry(item.localId)}
                        >
                          <RotateCw aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("compose.remove", { index: i + 1 })}
                        disabled={saving}
                        onClick={() => {
                          queue.remove(item);
                          change();
                        }}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
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
                if (queue.items.length >= max) toast.warning(t(max === 1 ? "wish.photoLimit" : "compose.limit"));
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
          </div>
    <PhotoCropDialog request={cropping} />
  </>;
}
