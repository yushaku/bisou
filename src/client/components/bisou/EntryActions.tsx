import { PencilLine, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { JournalEntry } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { useOnline } from "@/lib/useOnline";

interface EntryActionsProps {
  /* The author's own entry whose actions are open, or null. */
  entry: JournalEntry | null;
  onClose: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDeleted: (id: string) => void;
  onSignedOut: () => void;
}

/*
 * Edit or delete one's own entry (R10, R11). Delete asks first, naming the day and photo
 * count; a failure keeps the entry and the dialog for another try. There is no undo.
 */
export function EntryActions({ entry, onClose, onEdit, onDeleted, onSignedOut }: EntryActionsProps) {
  const { t, locale } = useI18n();
  const online = useOnline();
  // The sheet still shows its entry while it animates closed.
  const last = useRef(entry);
  if (entry) last.current = entry;
  const shown = entry ?? last.current;
  const [target, setTarget] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: JournalEntry) {
    if (!online || deleting) return;
    setDeleting(true);
    setError(null);
    const res = await api.deleteEntry(e.id);
    setDeleting(false);
    // Already gone (deleted on the other phone): the result the author wanted.
    if (res.ok || res.error?.error === "not_found") {
      setTarget(null);
      onDeleted(e.id);
      return;
    }
    if (res.status === 401) return onSignedOut();
    setError(t("entry.deleteError"));
  }

  const day = target ? formatDay(target.date, locale) : "";
  const count = target?.photoIds.length ?? 0;

  return (
    <>
      <Drawer open={!!entry} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent aria-describedby={undefined}>
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-5 pb-5">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-heading text-xl">{shown ? formatDay(shown.date, locale) : ""}</DrawerTitle>
            </DrawerHeader>
            {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
            <Button
              variant="outline"
              size="lg"
              className="justify-start"
              onClick={() => {
                if (!shown) return;
                onClose();
                onEdit(shown);
              }}
            >
              <PencilLine aria-hidden="true" />
              {t("entry.edit")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="justify-start text-destructive"
              disabled={!online}
              onClick={() => {
                setError(null);
                setTarget(shown);
                onClose();
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("entry.delete")}
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose}>
              {t("entry.cancel")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={!!target} onOpenChange={(open) => !open && !deleting && setTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{t("entry.deleteTitle")}</DialogTitle>
            <DialogDescription className="text-base">
              {count > 0 ? t("entry.deleteBody", { day, count }) : t("entry.deleteBodyText", { day })}
            </DialogDescription>
          </DialogHeader>
          {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
          <p role="alert" className="text-base text-destructive empty:hidden">
            {error}
          </p>
          <DialogFooter>
            <Button variant="destructive" disabled={!online} loading={deleting} onClick={() => target && void remove(target)}>
              {t("entry.deleteYes")}
            </Button>
            <Button autoFocus disabled={deleting} onClick={() => setTarget(null)}>
              {t("entry.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
