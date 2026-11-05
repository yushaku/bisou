import { CalendarDays, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { latestDay, toDayString } from "../../../shared/days";
import { ENTRY_PHOTOS_MAX, ENTRY_TEXT_MAX, entryText } from "../../../shared/journal";
import { receivedText } from "../../../shared/wishes";
import type { JournalEntry, Wish } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useI18n, type MessageKey } from "@/i18n";
import { defaultDay, saveBlock, saveErrorKey, textLength, type SaveBlock } from "@/lib/compose";
import { formatDay, parseDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PersonAvatar, type Person } from "./CoupleAvatars";
import { PhotoPicker } from "./PhotoPicker";
import { useUploadQueue } from "./useUploadQueue";

interface ComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: Person;
  partnerName: string;
  /* The author's own entry to change (R10); omit to write a new one. */
  entry?: JournalEntry;
  receiving?: Wish;
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
        <ComposeForm key={form.receiving?.id ?? form.entry?.id ?? "new"} {...form} onLock={setLock} onClose={requestClose} onDone={() => onOpenChange(false)} />
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
function ComposeForm({ author, partnerName, entry, receiving, onSaved, onSignedOut, onLock, onClose, onDone }: ComposeFormProps) {
  const { t, locale } = useI18n();
  const ids = useId();
  const [now] = useState(Date.now);
  const max = latestDay(now);
  const [date, setDate] = useState(() => entry?.date ?? defaultDay(now));
  const [text, setText] = useState(entry?.text ?? "");
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReceiving, setConfirmReceiving] = useState(false);
  // An edited entry keeps its photos as they are; to frame one again, remove it and add it anew.
  const queue = useUploadQueue(entry?.photoIds);

  useEffect(() => onLock(saving ? "saving" : dirty ? "dirty" : null), [dirty, saving, onLock]);
  useEffect(() => () => onLock(null), [onLock]);

  const journalText = receiving ? receivedText(locale, receiving.title, text) : text;
  const length = textLength(journalText);
  const block = preparing ? "photos" : saveBlock({ date, text: journalText, photos: queue.items }, now);
  const hint = block ? t(HINTS[block], { max: formatDay(max, locale, "numeric") }) : t("compose.shared", { partner: partnerName });

  const change = () => {
    setDirty(true);
    setFormError(null);
  };

  async function save() {
    if (block || saving) return;
    setSaving(true);
    setFormError(null);
    const input = { date, text: entryText(text), photoIds: queue.items.map((i) => i.photoId ?? "") };
    const res = receiving ? await api.receiveWish(receiving.id, { date, note: text.trim(), photoIds: input.photoIds })
      : entry ? await api.updateEntry(entry.id, input) : await api.createEntry(input);
    setConfirmReceiving(false);
    setSaving(false);
    if (res.ok) {
      queue.saved();
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
      <form onSubmit={(e) => { e.preventDefault(); if (receiving) setConfirmReceiving(true); else void save(); }} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
        <DrawerHeader className="flex-row items-center gap-2 px-5 pt-2 pb-3 text-left">
          <DrawerTitle className="min-w-0 flex-1 font-heading text-2xl">{t(receiving ? "received.action" : entry ? "compose.edit" : "compose.new")}</DrawerTitle>
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.close")} disabled={saving} onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4">
          <p className="flex items-center gap-2 font-semibold">
            <PersonAvatar person={author} size="sm" />
            {author.name}
          </p>

          {receiving && <p className="font-heading text-xl">{receiving.title}</p>}
          <div className="flex flex-col gap-2">
            <span id={`${ids}-day`} className="font-semibold">
              {t(receiving ? "received.day" : "compose.day")}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-12 justify-start"
              aria-labelledby={`${ids}-day ${ids}-day-value`}
              aria-describedby={`${ids}-day-help`}
              disabled={saving}
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
              {t(receiving ? "received.note" : "compose.text")}
            </label>
            <Textarea
              id={`${ids}-text`}
              disabled={saving}
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

          {receiving && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{journalText}</p>}
          <PhotoPicker queue={queue} onPreparingChange={setPreparing} max={ENTRY_PHOTOS_MAX} saving={saving} onChange={change} />

          <p role="alert" className="text-base text-destructive empty:hidden">
            {formError}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-5">
          <p id={`${ids}-hint`} aria-live="polite" className="text-center text-sm text-muted-foreground">
            {hint}
          </p>
          <Button type="submit" size="lg" loading={saving} disabled={!!block} aria-describedby={`${ids}-hint`}>
            {saving ? t("compose.saving") : t(receiving ? "received.action" : "compose.save")}
          </Button>
        </div>
      </form>
      <Dialog open={confirmReceiving} onOpenChange={(open) => { if (!saving) setConfirmReceiving(open); }}>
        <DialogContent showCloseButton={!saving}>
          <DialogHeader><DialogTitle>{t("received.action")}</DialogTitle><DialogDescription>{t("received.confirm")}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setConfirmReceiving(false)}>{t("common.close")}</Button><Button loading={saving} onClick={() => void save()}>{t("received.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
