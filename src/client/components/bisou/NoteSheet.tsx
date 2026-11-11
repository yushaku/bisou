import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WrittenNote, NoteInput } from "../../../shared/types";
import { api } from "@/api";
import { useI18n } from "@/i18n";
import { useOnline } from "@/lib/useOnline";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { noteBlock } from "@/lib/notes";
import { saveErrorKey } from "@/lib/compose";
import { formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { NoteFields } from "./NoteFields";
interface Props { fromMenu?: boolean; open: boolean; onOpenChange: (open: boolean) => void; partnerName: string; entry?: WrittenNote; onSaved: (note: WrittenNote) => void; onRefresh: () => void; onSignedOut: () => void }
export function NoteSheet({ open, onOpenChange, fromMenu, ...props }: Props) {
  const { t } = useI18n();
  const [lock, setLock] = useState<"saving" | "dirty" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const close = () => { if (lock === "saving") return; if (lock === "dirty") setConfirm(true); else onOpenChange(false); };
  return <Drawer open={open} onOpenChange={(value) => value ? onOpenChange(true) : close()} dismissible={lock !== "saving"}>
    <DrawerContent onCloseAutoFocus={(event) => { if (fromMenu) { event.preventDefault(); focusCreateButton(); } }}><NoteForm key={props.entry?.id ?? "new"} {...props} onLock={setLock} onClose={close} onDone={() => onOpenChange(false)} /></DrawerContent>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogHeader><DialogTitle>{t("compose.discardTitle")}</DialogTitle><DialogDescription>{t("compose.discardBody")}</DialogDescription></DialogHeader><DialogFooter><Button variant="destructive" onClick={() => { setConfirm(false); onOpenChange(false); }}>{t("compose.discard")}</Button><Button onClick={() => setConfirm(false)}>{t("compose.keep")}</Button></DialogFooter></DialogContent></Dialog>
  </Drawer>;
}
function NoteForm({ entry, partnerName, onSaved, onRefresh, onSignedOut, onLock, onClose, onDone }: Omit<Props, "open" | "onOpenChange"> & { onLock: (lock: "saving" | "dirty" | null) => void; onClose: () => void; onDone: () => void }) {
  const { t, locale } = useI18n(), online = useOnline();
  const [value, setValue] = useState<NoteInput>(entry ?? { happened: "", feel: "", need: "", hope: "" });
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null), [locked, setLocked] = useState(false), [withdraw, setWithdraw] = useState(false);
  useEffect(() => onLock(saving ? "saving" : dirty ? "dirty" : null), [dirty, saving, onLock]);
  useEffect(() => () => onLock(null), [onLock]);
  const block = noteBlock(value), ready = entry?.state === "draft" && Date.now() >= entry.sendableAt;
  async function save(send = false) {
    if (!online || saving || block || locked) return;
    setSaving(true); setError(null);
    const res = send && entry ? await api.sendNote(entry.id, value) : entry ? await api.updateNote(entry.id, value) : await api.createNote(value);
    setSaving(false);
    if (res.ok) { setDirty(false); onSaved(res.data.note); onDone(); return; }
    if (res.status === 401) return onSignedOut();
    if (res.error?.error === "note_opened") { setLocked(true); setError(t("notes.errors.opened", { partner: partnerName })); onRefresh(); return; }
    if (res.status === 409) { toast.error(t(saveErrorKey(res.error?.error))); onRefresh(); onDone(); return; }
    setError(t(res.error ? saveErrorKey(res.error.error) : "notes.saveError"));
  }
  async function remove() {
    if (!online || saving || !entry) return;
    setSaving(true);
    const res = await api.deleteNote(entry.id); setSaving(false);
    if (res.ok || res.status === 404) { toast.success(t("notes.deleted")); onRefresh(); onDone(); return; }
    if (res.status === 401) return onSignedOut();
    setWithdraw(false);
    if (res.error?.error === "note_opened") { setLocked(true); setError(t("notes.errors.opened", { partner: partnerName })); onRefresh(); }
    else setError(t("notes.deleteError"));
  }
  return <form onSubmit={(e) => { e.preventDefault(); void save(!!ready); }} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
    <DrawerHeader><DrawerTitle>{t(entry ? "notes.edit" : "notes.write", { partner: partnerName })}</DrawerTitle></DrawerHeader>
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3">
      {ready && <p>{t("notes.reread")}</p>}
      <NoteFields value={value} disabled={saving} onChange={(next) => { setValue(next); setDirty(true); if (!locked) setError(null); }} />
      <p className="text-sm text-muted-foreground">{!online ? t("offline.save") : block ? t(block === "tooLong" ? "notes.tooLong" : "notes.emptyHint") : entry?.state === "draft" && !ready ? t("notes.cooling", { time: formatTime(entry.sendableAt, locale) }) : !entry ? t("notes.saveHint") : ""}</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
    <div className="flex shrink-0 flex-col gap-2 border-t px-5 pt-3 pb-5">
      <Button type="submit" size="lg" loading={saving} disabled={!online || !!block || locked}>{t(ready ? "notes.send" : "notes.save", { partner: partnerName })}</Button>
      {ready && <Button type="button" variant="outline" disabled={!online || saving || !!block || locked} onClick={() => void save()}>{t("notes.saveLater")}</Button>}
      {entry && entry.state !== "opened" && <Button type="button" variant="ghost" disabled={!online || saving || locked} onClick={() => setWithdraw(true)}>{t(entry?.state === "draft" ? "notes.delete" : "notes.withdraw")}</Button>}
      <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>{t("common.close")}</Button>
    </div>
    <Dialog open={withdraw} onOpenChange={setWithdraw}><DialogContent><DialogHeader><DialogTitle>{t(entry?.state === "draft" ? "notes.deleteTitle" : "notes.withdrawTitle")}</DialogTitle><DialogDescription>{t(entry?.state === "draft" ? "notes.deleteBody" : "notes.withdrawBody")}</DialogDescription></DialogHeader><DialogFooter><Button variant="destructive" disabled={!online || saving} onClick={() => void remove()}>{t(entry?.state === "draft" ? "notes.delete" : "notes.withdraw")}</Button><Button variant="outline" disabled={saving} onClick={() => setWithdraw(false)}>{t("entry.cancel")}</Button></DialogFooter></DialogContent></Dialog>
  </form>;
}
