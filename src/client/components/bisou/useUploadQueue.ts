import { useCallback, useEffect, useRef, useState } from "react";
import { api, photoUrl } from "@/api";
import type { MessageKey } from "@/i18n";
import { startable, uploadErrorKey, type PhotoState } from "@/lib/compose";
import { uploadPhoto, type Renditions } from "@/lib/photo";

export interface QueuedPhoto {
  localId: string;
  previewUrl: string;
  state: PhotoState;
  /* 0 to 1 while uploading. */
  progress: number;
  photoId?: string;
  error?: MessageKey;
  /* Kept until the upload succeeds, so retry needs no new crop. Absent for photos already in the entry. */
  renditions?: Renditions;
}

/*
 * Photos of the open compose sheet, in picked order. Uploads start as soon as a photo is
 * rendered, at most two at a time; a failed one keeps its preview for retry or remove.
 * Existing photos of an edited entry start as done and are never re-uploaded.
 */
export function useUploadQueue(existing: string[] = []) {
  const [items, setItems] = useState<QueuedPhoto[]>(() =>
    existing.map((id) => ({ localId: id, previewUrl: photoUrl(id, "thumb"), state: "done", progress: 1, photoId: id })),
  );
  const aborts = useRef(new Map<string, AbortController>());
  const uploaded = useRef(new Map<string, string>());
  const ownUrls = useRef(new Set<string>());

  const patch = useCallback((localId: string, change: Partial<QueuedPhoto>) => {
    setItems((list) => list.map((i) => (i.localId === localId ? { ...i, ...change } : i)));
  }, []);

  useEffect(() => {
    for (const id of startable(items)) {
      const renditions = items.find((i) => i.localId === id)?.renditions;
      if (!renditions) continue;
      const controller = new AbortController();
      aborts.current.set(id, controller);
      patch(id, { state: "uploading", progress: 0, error: undefined });
      void uploadPhoto(renditions, (progress) => patch(id, { progress }), controller.signal).then((res) => {
        aborts.current.delete(id);
        if (controller.signal.aborted) {
          if (res.ok) void api.deletePhoto(res.data.photo.id);
          return;
        }
        if (res.ok) {
          uploaded.current.set(id, res.data.photo.id);
          patch(id, { state: "done", progress: 1, photoId: res.data.photo.id, renditions: undefined });
        } else patch(id, { state: "failed", error: uploadErrorKey(res.error?.error) });
      });
    }
  }, [items, patch]);

  const forget = useCallback((url: string) => {
    if (ownUrls.current.delete(url)) URL.revokeObjectURL(url);
  }, []);

  const add = useCallback((renditions: Renditions) => {
    const previewUrl = URL.createObjectURL(renditions.thumb);
    ownUrls.current.add(previewUrl);
    setItems((list) => [...list, { localId: crypto.randomUUID(), previewUrl, state: "queued", progress: 0, renditions }]);
  }, []);

  const retry = useCallback((localId: string) => patch(localId, { state: "queued", error: undefined }), [patch]);

  const remove = useCallback(
    (item: QueuedPhoto) => {
      aborts.current.get(item.localId)?.abort();
      const photoId = uploaded.current.get(item.localId);
      if (photoId) void api.deletePhoto(photoId);
      uploaded.current.delete(item.localId);
      forget(item.previewUrl);
      setItems((list) => list.filter((i) => i.localId !== item.localId));
    },
    [forget],
  );

  // Cleanup is best effort; the server sweep handles uploads whose response never arrived.
  useEffect(
    () => () => {
      for (const c of aborts.current.values()) c.abort();
      for (const photoId of uploaded.current.values()) void api.deletePhoto(photoId);
      uploaded.current.clear();
      for (const url of ownUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  return { items, add, retry, remove, saved: () => uploaded.current.clear() };
}
