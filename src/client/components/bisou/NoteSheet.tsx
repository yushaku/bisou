import { useEffect, useId, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import type { WrittenNote, NoteInput, NoteDelivery } from "../../../shared/types";
import { api } from "@/api";
import { useI18n } from "@/i18n";
import { useOnline } from "@/lib/useOnline";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { noteBlock } from "@/lib/notes";
import { saveErrorKey } from "@/lib/compose";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { NoteFields } from "./NoteFields";
import { ComposeBody, ComposeFooter } from "./ComposeLayout";
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
export function NoteForm({ entry, partnerName, onSaved, onRefresh, onSignedOut, onLock, onDone }: Omit<Props, "open" | "onOpenChange"> & { onLock: (lock: "saving" | "dirty" | null) => void; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n(), online = useOnline(), id = useId();
  const [value, setValue] = useState<NoteInput>(entry ?? { happened: "", feel: "", need: "", hope: "" });
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null), [locked, setLocked] = useState(false), [withdraw, setWithdraw] = useState(false);
  useEffect(() => onLock(saving ? "saving" : dirty ? "dirty" : null), [dirty, saving, onLock]);
  useEffect(() => () => onLock(null), [onLock]);
  const [delivery, setDelivery] = useState<NonNullable<NoteDelivery["delivery"]>>(entry?.scheduledAt ? "custom" : "now");
  const [sendAt, setSendAt] = useState(() => {
    if (!entry?.scheduledAt) return "";
    const date = new Date(entry.scheduledAt);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [deliveryChanged, setDeliveryChanged] = useState(!entry?.scheduledAt);
  const choosingDelivery = !entry || entry.state === "draft";
  const invalidSchedule = choosingDelivery && deliveryChanged && delivery === "custom" && (!sendAt || !Number.isFinite(new Date(sendAt).getTime()) || new Date(sendAt).getTime() <= Date.now());
  const block = noteBlock(value);
  const hint = !online ? t("offline.save") : block === "tooLong" ? t("notes.tooLong") : choosingDelivery && delivery !== "now" ? t("notes.scheduleHint") : "";
  async function save() {
    if (!online || saving || block || locked) return;
    if (invalidSchedule) { setError(t("notes.scheduleError")); return; }
    setSaving(true); setError(null);
    const input = { ...value, ...(choosingDelivery && deliveryChanged ? { delivery, ...(delivery === "custom" ? { sendAt: new Date(sendAt).getTime() } : {}) } : {}) };
    const res = entry ? await api.updateNote(entry.id, input) : await api.createNote(input);
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
  return <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
    <DrawerTitle className="sr-only">{t(entry ? "notes.edit" : "notes.write", { partner: partnerName })}</DrawerTitle>
    <ComposeBody>
      <NoteFields value={value} disabled={saving} onChange={(next) => { setValue(next); setDirty(true); if (!locked) setError(null); }} />
      {choosingDelivery && <fieldset className="flex min-w-0 flex-col gap-2" disabled={saving}>
        <legend className="mb-2 font-semibold">{t("notes.delivery")}</legend>
        <ToggleGroup type="single" variant="outline" value={delivery} className="w-full flex-wrap" onValueChange={(next) => {
          if (next === "now" || next === "eightHours" || next === "custom") { setDelivery(next); setDeliveryChanged(true); setDirty(true); setError(null); }
        }}>
          {(["now", "eightHours", "custom"] as const).map((option) => <ToggleGroupItem key={option} value={option} className="min-h-11 flex-1">{t(`notes.${option}`)}</ToggleGroupItem>)}
        </ToggleGroup>
        {delivery === "custom" && <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-send-at`} className="font-semibold">{t("notes.sendAt")}</label>
          <Input id={`${id}-send-at`} type="datetime-local" required value={sendAt} aria-invalid={!!error && invalidSchedule} onChange={(event) => { setSendAt(event.target.value); setDeliveryChanged(true); setDirty(true); setError(null); }} />
        </div>}
      </fieldset>}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </ComposeBody>
    <ComposeFooter>
      <Button type="submit" size="lg" loading={saving} disabled={!online || !!block || locked}>{t(choosingDelivery ? delivery === "now" ? "notes.send" : "notes.schedule" : "notes.save", { partner: partnerName })}</Button>
      {entry && entry.state !== "opened" && <Button type="button" variant="ghost" disabled={!online || saving || locked} onClick={() => setWithdraw(true)}>{t(entry?.state === "draft" ? "notes.delete" : "notes.withdraw")}</Button>}
    </ComposeFooter>
    <Dialog open={withdraw} onOpenChange={setWithdraw}><DialogContent><DialogHeader><DialogTitle>{t(entry?.state === "draft" ? "notes.deleteTitle" : "notes.withdrawTitle")}</DialogTitle><DialogDescription>{t(entry?.state === "draft" ? "notes.deleteBody" : "notes.withdrawBody")}</DialogDescription></DialogHeader><DialogFooter><Button variant="destructive" disabled={!online || saving} onClick={() => void remove()}>{t(entry?.state === "draft" ? "notes.delete" : "notes.withdraw")}</Button><Button variant="outline" disabled={saving} onClick={() => setWithdraw(false)}>{t("entry.cancel")}</Button></DialogFooter></DialogContent></Dialog>
  </form>;
}
