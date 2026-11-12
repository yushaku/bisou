import { type ReactNode, useId } from "react";
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

interface EntryActionsProps<T extends Pick<JournalEntry, "id" | "date" | "photoIds">> {
  /* The author's own entry whose actions are open, or null. */
  entry: T | null;
  detail?: ReactNode;
  title?: string;
  remove?: typeof api.deleteEntry;
  own?: boolean;
  onClose: () => void;
  onEdit: (entry: T) => void;
  onDeleted: (id: string) => void;
  onSignedOut: () => void;
}

/*
 * Edit or delete one's own entry (journal R10, R11) or a note entry (journal R26). Delete asks first, naming the day and photo
 * count; a failure keeps the entry and the dialog for another try. There is no undo.
 */
export function EntryActions<T extends Pick<JournalEntry, "id" | "date" | "photoIds">>({ entry, onClose, onEdit, onDeleted, onSignedOut, detail, title, own = true, remove: deleteItem = api.deleteEntry }: EntryActionsProps<T>) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const offlineId = useId();
  // The sheet still shows its entry while it animates closed.
  const last = useRef(entry);
  if (entry) last.current = entry;
  const shown = entry ?? last.current;
  const [target, setTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: T) {
    if (!online || deleting) return;
    setDeleting(true);
    setError(null);
    const res = await deleteItem(e.id);
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
        <DrawerContent className="max-h-[80vh]" aria-describedby={undefined}>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-5 pb-5">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-heading text-xl">{title ?? (shown ? formatDay(shown.date, locale) : "")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {detail}
            {own && <>
            {!online && <p id={`${offlineId}-1`} className="text-sm text-muted-foreground">{t("offline.save")}</p>}
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
              aria-describedby={!online ? `${offlineId}-1` : undefined} disabled={!online}
              onClick={() => {
                setError(null);
                setTarget(shown);
                onClose();
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("entry.delete")}
            </Button>
            </>}
            </div>
            <Button variant="ghost" size="lg" onClick={onClose}>
              {t(own ? "entry.cancel" : "common.close")}
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
          {!online && <p id={`${offlineId}-2`} className="text-sm text-muted-foreground">{t("offline.save")}</p>}
          <p role="alert" className="text-base text-destructive empty:hidden">
            {error}
          </p>
          <DialogFooter>
            <Button variant="destructive" aria-describedby={!online ? `${offlineId}-2` : undefined} disabled={!online} loading={deleting} onClick={() => target && void remove(target)}>
              {t("entry.deleteYes")}
            </Button>
            <Button autoFocus disabled={deleting} onClick={() => setTarget(null)}>
              {t(own ? "entry.cancel" : "common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
