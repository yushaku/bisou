import { useEffect, useState } from "react";
import type { JournalEntry, WrittenNote } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { ComposeForm, type Lock } from "./ComposeSheet";
import { NoteForm } from "./NoteSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: "feed" | "notes";
  partnerName: string;
  onSaved: (entry: JournalEntry) => void;
  onNoteSaved: (note: WrittenNote) => void;
  onSignedOut: () => void;
}

export function JournalComposeSheet({ open, onOpenChange, initialTab, partnerName, onSaved, onNoteSaved, onSignedOut }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const [journalLock, setJournalLock] = useState<Lock>(null);
  const [noteLock, setNoteLock] = useState<Lock>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  const saving = journalLock === "saving" || noteLock === "saving";
  const close = (locks: Lock[] = [journalLock, noteLock]) => {
    if (locks.includes("saving")) return;
    if (locks.includes("dirty")) setConfirming(true);
    else onOpenChange(false);
  };
  const guard = (event: Event) => { event.preventDefault(); close(); };
  return <Drawer open={open} onOpenChange={(value) => value ? onOpenChange(true) : close()} dismissible={!journalLock && !noteLock}>
    <DrawerContent className="data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh" aria-label={t(tab === "notes" ? "compose.kindNote" : "journal.sectionFeed")} aria-labelledby={undefined} aria-describedby={undefined} onEscapeKeyDown={guard} onPointerDownOutside={guard} onCloseAutoFocus={(event) => { event.preventDefault(); focusCreateButton(); }}>
      <Tabs value={tab} onValueChange={(value) => setTab(value === "notes" ? "notes" : "feed")} className="mx-auto min-h-0 w-full max-w-md flex-1">
        <TabsList aria-label={t("nav.create")} className="mx-5 mt-2 w-auto shrink-0">
          <TabsTrigger value="feed" disabled={saving}>{t("journal.sectionFeed")}</TabsTrigger>
          <TabsTrigger value="notes" disabled={saving}>{t("compose.kindNote")}</TabsTrigger>
        </TabsList>
        <div className="grid min-h-0 flex-1">
          <TabsContent value="feed" forceMount aria-hidden={tab !== "feed"} inert={tab !== "feed"} className="flex min-h-0 flex-col [grid-area:1/1] data-[state=inactive]:invisible">
            <ComposeForm partnerName={partnerName} onSaved={onSaved} onSignedOut={onSignedOut} onLock={setJournalLock} onClose={() => close()} onDone={() => { setJournalLock(null); close([noteLock]); }} />
          </TabsContent>
          <TabsContent value="notes" forceMount aria-hidden={tab !== "notes"} inert={tab !== "notes"} className="flex min-h-0 flex-col [grid-area:1/1] data-[state=inactive]:invisible">
            <NoteForm partnerName={partnerName} onSaved={onNoteSaved} onRefresh={() => {}} onSignedOut={onSignedOut} onLock={setNoteLock} onClose={() => close()} onDone={() => { setNoteLock(null); close([journalLock]); }} />
          </TabsContent>
        </div>
      </Tabs>
    </DrawerContent>
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("compose.discardTitle")}</DialogTitle><DialogDescription>{t("compose.discardBody")}</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => { setConfirming(false); onOpenChange(false); }}>{t("compose.discard")}</Button>
          <Button autoFocus onClick={() => setConfirming(false)}>{t("compose.keep")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Drawer>;
}
