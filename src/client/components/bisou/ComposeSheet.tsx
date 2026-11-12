import { useEffect, useId, useState } from "react";
import { ENTRY_PHOTOS_MAX, ENTRY_TEXT_MAX, entryText } from "../../../shared/journal";
import { receivedText } from "../../../shared/wishes";
import type { JournalEntry, Wish } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { defaultDay, saveBlock, saveErrorKey, textLength } from "@/lib/compose";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { useOnline } from "@/lib/useOnline";
import { DayField } from "./DayField";
import { PhotoPicker } from "./PhotoPicker";
import { useUploadQueue } from "./useUploadQueue";
import { ComposeBody, ComposeFooter } from "./ComposeLayout";

interface ComposeSheetProps {
  fromMenu?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  /* The author's own entry to change (R10); omit to write a new one. */
  entry?: JournalEntry;
  receiving?: Wish;
  onSaved: (entry: JournalEntry) => void;
  onSignedOut: () => void;
}

/* Changed: closing asks first. Saving: closing waits. */
export type Lock = "dirty" | "saving" | null;

/*
 * Bottom sheet to write an entry. Nothing is kept after it closes (no drafts, R9), so a
 * changed form asks before it is discarded, by the close button, Escape, a tap outside or a swipe.
 */
export function ComposeSheet({ open, onOpenChange, fromMenu, ...form }: ComposeSheetProps) {
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
      <DrawerContent onCloseAutoFocus={(event) => {
        if (fromMenu) { event.preventDefault(); focusCreateButton(); }
      }} aria-describedby={undefined} onEscapeKeyDown={guard} onPointerDownOutside={guard}>
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

interface ComposeFormProps extends Omit<ComposeSheetProps, "open" | "onOpenChange" | "fromMenu"> {
  expandedPhotos?: boolean;
  onLock: (lock: Lock) => void;
  onClose: () => void;
  onDone: () => void;
}

/* Lives inside the drawer content, so its state and uploads end when the sheet closes. */
export function ComposeForm({ expandedPhotos = false, entry, receiving, onSaved, onSignedOut, onLock, onDone }: ComposeFormProps) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const ids = useId();
  const [now] = useState(Date.now);
  const [date, setDate] = useState(() => entry?.date ?? defaultDay(now));
  const [text, setText] = useState(entry?.text ?? "");
  const [dirty, setDirty] = useState(false);
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

  const change = () => {
    setDirty(true);
    setFormError(null);
  };

  async function save() {
    if (!online || block || saving) return;
    setSaving(true);
    setFormError(null);
    const input = { date, text: entryText(text), photoIds: queue.items.map((i) => i.photoId ?? "") };
    const res = receiving ? await api.receiveWish(receiving.id, { date, note: text.trim(), photoIds: input.photoIds, locale })
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
      <form onSubmit={(e) => { e.preventDefault(); if (!online) return; if (receiving) setConfirmReceiving(true); else void save(); }} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
        <DrawerTitle className="sr-only">{t(receiving ? "received.action" : entry ? "compose.edit" : "compose.new")}</DrawerTitle>

        <ComposeBody>
          {receiving && <p className="font-heading text-xl">{receiving.title}</p>}
          <DayField value={date} now={now} disabled={saving} label={receiving ? "received.day" : "compose.day"} onChange={(value) => { setDate(value); change(); }} />

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
              className="min-h-32"
              onChange={(e) => {
                setText(e.target.value);
                change();
              }}
            />
          </div>

          {receiving && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{journalText}</p>}
          <PhotoPicker expandedEmpty={expandedPhotos} queue={queue} onPreparingChange={setPreparing} max={ENTRY_PHOTOS_MAX} saving={saving} onChange={change} />

          <p role="alert" className="text-base text-destructive empty:hidden">
            {formError}
          </p>
        </ComposeBody>

        <ComposeFooter>
          <Button type="submit" size="lg" loading={saving} disabled={!online || !!block}>
            {saving ? t("compose.saving") : t(receiving ? "received.action" : "compose.save")}
          </Button>
        </ComposeFooter>
      </form>
      <Dialog open={confirmReceiving} onOpenChange={(open) => { if (!saving) setConfirmReceiving(open); }}>
        <DialogContent showCloseButton={!saving}>
          <DialogHeader><DialogTitle>{t("received.action")}</DialogTitle><DialogDescription>{t("received.confirm")}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setConfirmReceiving(false)}>{t("common.close")}</Button><Button disabled={!online} loading={saving} onClick={() => void save()}>{t("received.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
