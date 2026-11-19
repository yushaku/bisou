import { useApiMutation } from "@/lib/serverQuery";
import { useId, useState } from "react";
import type { CloseInput, JournalEntry } from "../../../shared/types";
import { NOTE_LINE_MAX, validateClose } from "../../../shared/notes";
import { api } from "@/api";
import { useOnline } from "@/lib/useOnline";
import { useI18n } from "@/i18n";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export function CloseFields({
  value,
  onChange,
  disabled,
}: {
  value: CloseInput;
  onChange: (value: CloseInput) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n(),
    id = useId(),
    length = Array.from(value.line.trim()).length;
  return (
    <div className="flex flex-col gap-3">
      <p id={`${id}-suggestions`} className="font-semibold">
        {t("notes.quickReplies")}
      </p>
      <div role="group" aria-labelledby={`${id}-suggestions`} className="flex flex-col gap-2">
        {(["try", "talk", "differ"] as const).map((sample) => (
          <Button
            key={sample}
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-auto min-h-11 justify-start text-left whitespace-normal"
            onClick={() =>
              onChange({
                line: value.line ? `${value.line}\n${t(`notes.sample.${sample}`)}` : t(`notes.sample.${sample}`),
              })
            }
          >
            {t(`notes.sample.${sample}`)}
          </Button>
        ))}
      </div>
      <label htmlFor={id} className="font-semibold">
        {t("notes.message")}
      </label>
      <Textarea
        id={id}
        required
        disabled={disabled}
        value={value.line}
        aria-invalid={length > NOTE_LINE_MAX}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange({ line: e.target.value })}
      />
      <p id={`${id}-hint`} className="text-sm text-muted-foreground empty:hidden">
        {!value.line.trim() || length > NOTE_LINE_MAX ? t("notes.messageHint") : ""}
      </p>
      {length >= 450 && (
        <p className="text-right text-sm text-muted-foreground">
          {t("compose.count", { count: length, max: NOTE_LINE_MAX })}
        </p>
      )}
    </div>
  );
}
export function NoteCloseSheet({
  id,
  onClose,
  onClosed,
  onSignedOut,
}: {
  id: string;
  onClose: () => void;
  onClosed: (entry: JournalEntry) => void;
  onSignedOut: () => void;
}) {
  const { t } = useI18n(),
    online = useOnline();
  const closeNote = useApiMutation(api.closeNote, ["notes", "journal"]);
  const [value, setValue] = useState<CloseInput>({ line: "" });
  const [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const dirty = !!value.line.trim();
  const valid = !("error" in validateClose(value));
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirming(true);
    else onClose();
  };
  const guard = (event: Event) => {
    event.preventDefault();
    requestClose();
  };
  async function close() {
    if (!online || saving || !valid) return;
    setSaving(true);
    setError(null);
    const res = await closeNote(id, { line: value.line });
    setSaving(false);
    if (res.ok) {
      onClosed(res.data.entry);
      return;
    }
    if (res.status === 401) {
      onSignedOut();
      return;
    }
    setError(t(res.error?.error === "note_empty" ? "notes.messageRequired" : "notes.saveError"));
  }
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      dismissible={!saving && !dirty}
    >
      <DrawerContent onEscapeKeyDown={guard} onPointerDownOutside={guard}>
        <form
          className="mx-auto flex min-h-0 w-full max-w-md flex-col gap-3 overflow-y-auto px-5 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            void close();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>{t("notes.close")}</DrawerTitle>
          </DrawerHeader>
          <p className="text-sm text-muted-foreground">{t("notes.closeHint")}</p>
          <CloseFields value={value} onChange={setValue} disabled={saving} />
          {!online && <p className="text-sm text-muted-foreground">{t("offline.continue")}</p>}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving} disabled={!online || !valid}>
            {t("notes.close")}
          </Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={requestClose}>
            {t("notes.later")}
          </Button>
        </form>
      </DrawerContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("compose.discardTitle")}</DialogTitle>
            <DialogDescription>{t("compose.discardBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onClose();
              }}
            >
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
