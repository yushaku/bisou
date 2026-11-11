import { useId, useState } from "react";
import type { CloseInput, JournalEntry } from "../../../shared/types";
import { NOTE_LINE_MAX, NOTE_PICKS } from "../../../shared/notes";
import { api } from "@/api";
import { useOnline } from "@/lib/useOnline";
import { useI18n } from "@/i18n";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export function CloseFields({ value, onChange, disabled }: { value: { pick: CloseInput["pick"] | ""; line: string }; onChange: (value: { pick: CloseInput["pick"] | ""; line: string }) => void; disabled?: boolean }) {
  const { t } = useI18n(), id = useId(), length = Array.from(value.line.trim()).length;
  return <div className="flex flex-col gap-3"><ToggleGroup type="single" className="flex w-full flex-col" value={value.pick} disabled={disabled} onValueChange={(pick) => { if (NOTE_PICKS.includes(pick as CloseInput["pick"])) onChange({ ...value, pick: pick as CloseInput["pick"] }); }}>
    {NOTE_PICKS.map((pick) => <ToggleGroupItem key={pick} value={pick} className="min-h-11 w-full justify-start whitespace-normal text-left">{t(`notes.pick.${pick}`)}</ToggleGroupItem>)}
  </ToggleGroup><label htmlFor={id} className="font-semibold">{t("notes.line")}</label><Textarea id={id} disabled={disabled} value={value.line} aria-invalid={length > NOTE_LINE_MAX} onChange={(e) => onChange({ ...value, line: e.target.value })} />{length >= 450 && <p className="text-right text-sm text-muted-foreground">{t("compose.count", { count: length, max: NOTE_LINE_MAX })}</p>}</div>;
}
export function NoteCloseSheet({ id, onClose, onClosed, onSignedOut }: { id: string; onClose: () => void; onClosed: (entry: JournalEntry) => void; onSignedOut: () => void }) {
  const { t } = useI18n(), online = useOnline();
  const [value, setValue] = useState<{ pick: CloseInput["pick"] | ""; line: string }>({ pick: "", line: "" });
  const [saving, setSaving] = useState(false), [error, setError] = useState(false);
  async function close() {
    if (!online || saving || !value.pick || Array.from(value.line.trim()).length > NOTE_LINE_MAX) return;
    setSaving(true); setError(false);
    const res = await api.closeNote(id, { pick: value.pick, line: value.line }); setSaving(false);
    if (res.ok) { onClosed(res.data.entry); return; }
    if (res.status === 401) return onSignedOut();
    setError(true);
  }
  return <Drawer open onOpenChange={(open) => { if (!open && !saving) onClose(); }} dismissible={!saving}>
    <DrawerContent>
      <form className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 pb-5" onSubmit={(e) => { e.preventDefault(); void close(); }}>
        <DrawerHeader><DrawerTitle>{t("notes.close")}</DrawerTitle></DrawerHeader>
        <CloseFields value={value} onChange={setValue} disabled={saving} />
        {!online && <p className="text-sm text-muted-foreground">{t("offline.continue")}</p>}
        {error && <p role="alert" className="text-destructive">{t("notes.saveError")}</p>}
        <Button type="submit" size="lg" loading={saving} disabled={!online || !value.pick || Array.from(value.line.trim()).length > NOTE_LINE_MAX}>{t("notes.close")}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>{t("common.close")}</Button>
      </form>
    </DrawerContent>
  </Drawer>;
}
