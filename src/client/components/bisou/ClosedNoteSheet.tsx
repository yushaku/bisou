import { useState } from "react";
import type { ClosedNoteInput, JournalEntry } from "../../../shared/types";
import { validateClosedNote } from "../../../shared/notes";
import { api } from "@/api";
import { useOnline } from "@/lib/useOnline";
import { useI18n } from "@/i18n";
import { saveErrorKey } from "@/lib/compose";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NoteFields } from "./NoteFields";
import { CloseFields } from "./NoteCloseSheet";
import { DayField } from "./DayField";
export function ClosedNoteSheet({ entry, onClose, onSaved, onSignedOut }: { entry: JournalEntry & { note: NonNullable<JournalEntry["note"]> }; onClose: () => void; onSaved: (entry: JournalEntry) => void; onSignedOut: () => void }) {
  const { t } = useI18n(), online = useOnline();
  const [value, setValue] = useState<ClosedNoteInput>({ ...entry.note, date: entry.date });
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [discard, setDiscard] = useState(false), [error, setError] = useState<string | null>(null);
  const change = (next: ClosedNoteInput) => { setValue(next); setDirty(true); setError(null); };
  const close = () => { if (!saving) { if (dirty) setDiscard(true); else onClose(); } };
  const parsed = validateClosedNote(value, Date.now());
  async function save() {
    if (!online || saving || "error" in parsed) return;
    setSaving(true); setError(null);
    const res = await api.updateClosedNote(entry.note.id, parsed.input); setSaving(false);
    if (res.ok) { onSaved(res.data.entry); return; }
    if (res.status === 401) return onSignedOut();
    setError(t(saveErrorKey(res.error?.error)));
  }
  return <>
    <Drawer open onOpenChange={(open) => { if (!open) close(); }} dismissible={!saving && !dirty}>
      <DrawerContent onEscapeKeyDown={(e) => { e.preventDefault(); close(); }} onPointerDownOutside={(e) => { e.preventDefault(); close(); }}>
        <form className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <DrawerHeader><DrawerTitle>{t("notes.edit")}</DrawerTitle></DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3">
            <NoteFields value={value} disabled={saving} onChange={(parts) => change({ ...value, ...parts })} />
            <CloseFields value={value} disabled={saving} onChange={(reply) => { if (reply.pick) change({ ...value, pick: reply.pick, line: reply.line }); }} />
            <DayField now={Date.now()} value={value.date} disabled={saving} onChange={(date) => change({ ...value, date })} />
          </div>
          <div className="flex flex-col gap-2 border-t px-5 pt-3 pb-5">
            {!online && <p className="text-sm text-muted-foreground">{t("offline.save")}</p>}
            {error && <p role="alert" className="text-destructive">{error}</p>}
            <Button type="submit" size="lg" loading={saving} disabled={!online || "error" in parsed}>{t("notes.save")}</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={close}>{t("common.close")}</Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
    <Dialog open={discard} onOpenChange={setDiscard}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("compose.discardTitle")}</DialogTitle><DialogDescription>{t("compose.discardBody")}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="destructive" onClick={onClose}>{t("compose.discard")}</Button><Button onClick={() => setDiscard(false)}>{t("compose.keep")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
