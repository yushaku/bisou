import { CalendarDays, ImagePlus, RotateCw, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toDayString } from "../../../shared/days";
import { ENTRY_PHOTOS_MAX, ENTRY_TEXT_MAX, entryText } from "../../../shared/journal";
import type { JournalEntry } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useI18n, type MessageKey } from "@/i18n";
import { defaultDay, fitSquare, maxDay, saveBlock, saveErrorKey, takeRoom, textLength, type SaveBlock } from "@/lib/compose";
import { formatDay, parseDay } from "@/lib/format";
import { decodePhoto, renderSquare, type Area } from "@/lib/photo";
import { cn } from "@/lib/utils";
import { PersonAvatar, type Person } from "./CoupleAvatars";
import { PhotoCropDialog, type CropRequest } from "./PhotoCropDialog";
import { useUploadQueue } from "./useUploadQueue";

interface ComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: Person;
  partnerName: string;
  /* The author's own entry to change (R10); omit to write a new one. */
  entry?: JournalEntry;
  onSaved: (entry: JournalEntry) => void;
  onSignedOut: () => void;
}

/* Changed: closing asks first. Saving: closing waits. */
type Lock = "dirty" | "saving" | null;

const FIRST_DAY = new Date(1900, 0, 1);
const COUNTER_FROM = 1800;

const HINTS: Record<SaveBlock, MessageKey> = {
  tooLong: "compose.tooLong",
  date: "compose.dateError",
  photos: "compose.waitPhotos",
  empty: "compose.emptyHint",
};

/*
 * Bottom sheet to write an entry. Nothing is kept after it closes (no drafts, R9), so a
 * changed form asks before it is discarded, by the close button, Escape, a tap outside or a swipe.
 */
export function ComposeSheet({ open, onOpenChange, ...form }: ComposeSheetProps) {
  const { t } = useI18n();
  const [lock, setLock] = useState<Lock>(null);
  const [confirming, setConfirming] = useState(false);

  const requestClose = () => {
    if (lock === "dirty") setConfirming(true);
    else if (!lock) onOpenChange(false);
  };
  const guard = (e: Event) => {
    if (!lock) return;
    e.preventDefault();
    requestClose();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!lock}>
      <DrawerContent aria-describedby={undefined} onEscapeKeyDown={guard} onPointerDownOutside={guard}>
        {/* Keyed by entry, so switching between new and edit never carries a form over. */}
        <ComposeForm key={form.entry?.id ?? "new"} {...form} onLock={setLock} onClose={requestClose} onDone={() => onOpenChange(false)} />
      </DrawerContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{t("compose.discardTitle")}</DialogTitle>
            <DialogDescription className="text-base">{t("compose.discardBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => { setConfirming(false); onOpenChange(false); }}>
              {t("compose.discard")}
            </Button>
            <Button autoFocus onClick={() => setConfirming(false)}>
              {t("compose.keep")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}

interface ComposeFormProps extends Omit<ComposeSheetProps, "open" | "onOpenChange"> {
  onLock: (lock: Lock) => void;
  onClose: () => void;
  onDone: () => void;
}

/* Lives inside the drawer content, so its state and uploads end when the sheet closes. */
function ComposeForm({ author, partnerName, entry, onSaved, onSignedOut, onLock, onClose, onDone }: ComposeFormProps) {
  const { t, locale } = useI18n();
  const ids = useId();
  const [now] = useState(Date.now);
  const max = maxDay(now);
  const [date, setDate] = useState(() => entry?.date ?? defaultDay(now));
  const [text, setText] = useState(entry?.text ?? "");
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropping, setCropping] = useState<CropRequest | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // An edited entry keeps its photos as they are; to frame one again, remove it and add it anew.
  const queue = useUploadQueue(entry?.photoIds);

  useEffect(() => onLock(saving ? "saving" : dirty ? "dirty" : null), [dirty, saving, onLock]);
  useEffect(() => () => onLock(null), [onLock]);

  const length = textLength(text);
  const block = saveBlock({ date, text, photos: queue.items }, now);
  const hint = block ? t(HINTS[block], { max: formatDay(max, locale, "numeric") }) : t("compose.shared", { partner: partnerName });

  const change = () => {
    setDirty(true);
    setFormError(null);
  };

  /* The square the author frames in the crop step, or null when they skip the photo. */
  const frame = (file: File, bitmap: ImageBitmap, index: number, total: number) =>
    new Promise<Area | null>((resolve) => {
      const url = URL.createObjectURL(file);
      setCropping({
        url,
        index,
        total,
        done: (area) => {
          URL.revokeObjectURL(url);
          setCropping(null);
          resolve(area && fitSquare(area, bitmap));
        },
      });
    });

  async function addFiles(files: File[]) {
    const { take, refused } = takeRoom(queue.items.length, files.length);
    const messages: string[] = refused ? [t("compose.limit")] : [];
    setPhotoError(refused ? messages.join(" ") : null);
    if (take === 0) return;
    change();
    setPreparing(true);
    // One photo at a time: a phone holds a single full size bitmap in memory, never four.
    const chosen = files.slice(0, take);
    for (const [index, file] of chosen.entries()) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await decodePhoto(file);
      } catch {
        messages.push(t("compose.photoUnreadable", { name: file.name }));
        continue;
      }
      const area = await frame(file, bitmap, index, chosen.length);
      if (!area) {
        bitmap.close();
        continue;
      }
      try {
        queue.add(await renderSquare(bitmap, area));
      } catch {
        messages.push(t("compose.photoUnreadable", { name: file.name }));
      }
    }
    setPreparing(false);
    setPhotoError(messages.length ? messages.join(" ") : null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (block || saving) return;
    setSaving(true);
    setFormError(null);
    const input = { date, text: entryText(text), photoIds: queue.items.map((i) => i.photoId ?? "") };
    const res = entry ? await api.updateEntry(entry.id, input) : await api.createEntry(input);
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      onSaved(res.data.entry);
      onDone();
      return;
    }
    if (res.status === 401) return onSignedOut();
    setFormError(t(saveErrorKey(res.error?.error)));
  }

  return (
    <>
      <form onSubmit={(e) => void save(e)} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
        <DrawerHeader className="flex-row items-center gap-2 px-5 pt-2 pb-3 text-left">
          <DrawerTitle className="min-w-0 flex-1 font-heading text-2xl">{t(entry ? "compose.edit" : "compose.new")}</DrawerTitle>
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.close")} disabled={saving} onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4">
          <p className="flex items-center gap-2 font-semibold">
            <PersonAvatar person={author} size="sm" />
            {author.name}
          </p>

          <div className="flex flex-col gap-2">
            <span id={`${ids}-day`} className="font-semibold">
              {t("compose.day")}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-12 justify-start"
              aria-labelledby={`${ids}-day ${ids}-day-value`}
              aria-describedby={`${ids}-day-help`}
              aria-expanded={picking}
              aria-controls={`${ids}-calendar`}
              onClick={() => setPicking((v) => !v)}
            >
              <CalendarDays aria-hidden="true" />
              <span id={`${ids}-day-value`}>{formatDay(date, locale)}</span>
            </Button>
            {picking && (
              <Calendar
                id={`${ids}-calendar`}
                mode="single"
                captionLayout="dropdown"
                required
                selected={parseDay(date)}
                onSelect={(d) => {
                  setDate(toDayString(d));
                  setPicking(false);
                  change();
                }}
                defaultMonth={parseDay(date)}
                startMonth={FIRST_DAY}
                endMonth={parseDay(max)}
                disabled={[{ before: FIRST_DAY }, { after: parseDay(max) }]}
                className="edge mx-auto rounded-lg"
              />
            )}
            <p id={`${ids}-day-help`} className="text-sm text-muted-foreground">
              {t("compose.dayHelp")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-text`} className="font-semibold">
              {t("compose.text")}
            </label>
            <Textarea
              id={`${ids}-text`}
              value={text}
              placeholder={t("compose.placeholder")}
              aria-invalid={length > ENTRY_TEXT_MAX}
              aria-describedby={`${ids}-counter`}
              className="min-h-32"
              onChange={(e) => {
                setText(e.target.value);
                change();
              }}
            />
            <p
              id={`${ids}-counter`}
              className={cn("min-h-5 text-right text-sm tabular-nums", length > ENTRY_TEXT_MAX ? "text-destructive" : "text-muted-foreground")}
            >
              {length >= COUNTER_FROM ? t("compose.count", { count: length, max: ENTRY_TEXT_MAX }) : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="flex items-center justify-between">
              <span className="font-semibold">{t("compose.photos")}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("compose.count", { count: queue.items.length, max: ENTRY_PHOTOS_MAX })}
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
                if (queue.items.length >= ENTRY_PHOTOS_MAX) setPhotoError(t("compose.limit"));
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
              multiple
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

          <p role="alert" className="text-base text-destructive empty:hidden">
            {formError}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-5">
          <p id={`${ids}-hint`} aria-live="polite" className="text-center text-sm text-muted-foreground">
            {hint}
          </p>
          <Button type="submit" size="lg" loading={saving} disabled={!!block} aria-describedby={`${ids}-hint`}>
            {saving ? t("compose.saving") : t("compose.save")}
          </Button>
        </div>
      </form>
      <PhotoCropDialog request={cropping} />
    </>
  );
}
