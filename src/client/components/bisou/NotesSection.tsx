import { lazy, Suspense, useContext, useEffect, useImperativeHandle, useState, type Ref } from "react";
import { Mailbox } from "lucide-react";
import { toast } from "@/components/ui/ding-toaster";
import type { Couple, User, WrittenNote, ReceivedNote, JournalEntry } from "../../../shared/types";
import { vnDay } from "../../../shared/days";
import { api } from "@/api";
import { useI18n } from "@/i18n";
import { useNotes } from "@/lib/useNotes";
import { useOnline } from "@/lib/useOnline";
import { TabMemory } from "@/lib/tabMemory";
import { formatDay, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { toPeople } from "./CoupleAvatars";
import { EntryActions } from "./EntryActions";
import { NoteParts } from "./NoteParts";
import { NoteEnvelope } from "./NoteEnvelope";
const NoteSheet = lazy(() => import("./NoteSheet").then((m) => ({ default: m.NoteSheet })));
const NoteCloseSheet = lazy(() => import("./NoteCloseSheet").then((m) => ({ default: m.NoteCloseSheet })));
export function NotesSection({ ref, couple, user, onSignedOut, onClosed, composeRequested, onComposeHandled }: { ref?: Ref<{ refresh: () => Promise<void> }>; couple: Couple; user: User; onSignedOut: () => void; onClosed?: (entry: JournalEntry) => void; composeRequested?: boolean; onComposeHandled?: () => void }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const memory = useContext(TabMemory);
  const [opening, setOpening] = useState<string | null>(null), [received, setReceived] = useState<Extract<ReceivedNote, { state: "opened" }> | null>(null), [closing, setClosing] = useState<string | null>(null);
  const { lists, failed, refresh } = useNotes(onSignedOut);
  useImperativeHandle(ref, () => ({ refresh }), [refresh]);
  const [editing, setEditing] = useState<WrittenNote>(), [composing, setComposing] = useState(false), [loaded, setLoaded] = useState(false), [detail, setDetail] = useState<WrittenNote | null>(null);
  const people = toPeople(couple.members, user, t), partner = people[couple.members.findIndex((m) => m.id !== user.id)];
  const [fromMenu, setFromMenu] = useState(false);
  useEffect(() => {
    if (!composeRequested) return;
    setEditing(undefined); setLoaded(true); setComposing(true); setFromMenu(true);
    onComposeHandled?.();
  }, [composeRequested, onComposeHandled]);
  if (couple.members.length !== 2 || !partner) return null;
  const write = (note?: WrittenNote) => { setFromMenu(false); setEditing(note); setLoaded(true); setComposing(true); };
  async function open(note: ReceivedNote) {
    if (!online || opening) return;
    if (note.state === "opened") { setReceived(note); return; }
    setOpening(note.id);
    const res = await api.openNote(note.id); setOpening(null);
    if (res.ok && res.data.note.state === "opened") { setReceived(res.data.note); void refresh(); }
    else if (!res.ok && res.status === 401) onSignedOut();
    else { toast.error(t("notes.loadError")); void refresh(); }
  }
  return <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">{t("notes.invite")}</p>
    {!lists && (failed ? <EmptyState title={t("notes.loadError")} action={{ label: t("journal.retry"), onClick: () => void refresh() }} /> : <><p role="status">{t("notes.loading")}</p><Skeleton className="h-44 rounded-xl" /></>)}
    {lists && failed && <p role="status">{t("notes.stale")} <Button variant="link" onClick={() => void refresh()}>{t("journal.retry")}</Button></p>}
    {lists && !lists.fromMe.length && !lists.toMe.length && <EmptyState icon={Mailbox} title={t("notes.empty")} action={{ label: t("notes.write", { partner: partner.name }), onClick: () => write() }} />}
    {!!lists?.toMe.length && <section className="flex flex-col gap-3"><h2 className="font-heading text-xl">{t("notes.toMe")}</h2><div className="note-envelope-grid">{lists.toMe.map((note) => {
      const address = t("notes.fromPartner", { partner: partner.name }), state = t(note.state === "opened" ? "notes.opened" : "notes.notOpened");
      return <div key={note.id} className="note-envelope">
        {note.state === "waiting" ? <>
          <NoteEnvelope address={address} state={{ kind: "waiting", text: state }} />
          <Button className="note-ready-button w-full" size="lg" aria-label={`${address}, ${state}, ${t("notes.readyToHear")}`} disabled={!online || opening !== null} onClick={() => void open(note)}>{t("notes.readyToHear")}</Button>
          {!online && <p className="text-sm text-muted-foreground">{t("offline.continue")}</p>}
        </> : <button type="button" aria-label={`${address}, ${state}, ${t("notes.readAgain")}`} className="note-envelope-button press w-full text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setReceived(note)}><NoteEnvelope address={address} state={{ kind: "opened", text: state }} preview={note.happened} /></button>}
      </div>;
    })}</div></section>}
    {!!lists?.fromMe.length && <section className="flex flex-col gap-3"><h2 className="font-heading text-xl">{t("notes.fromMe")}</h2><div className="note-envelope-grid">{lists.fromMe.map((note) => {
      const time = formatTime(note.sendableAt, locale), day = vnDay(note.sendableAt);
      const state = note.state === "opened" ? t("notes.opened") : note.state === "sent" ? t("notes.notOpened") : Date.now() >= note.sendableAt ? t("notes.ready") : t("notes.cooling", { time: day === vnDay(Date.now()) ? time : `${formatDay(day, locale, "short")} ${time}` });
      const kind = note.state === "draft" ? Date.now() >= note.sendableAt ? "ready" : "cooling" : note.state;
      return <div key={note.id} className="note-envelope"><button type="button" aria-label={`${t("notes.toPartner", { partner: partner.name })}, ${state}`} className="note-envelope-button press min-h-11 w-full p-0 text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => note.state === "opened" ? setDetail(note) : write(note)}><NoteEnvelope address={t("notes.toPartner", { partner: partner.name })} state={{ kind, text: state }} preview={note.happened} /></button></div>;
    })}</div></section>}
    <EntryActions title={t("notes.opened")} entry={detail && { id: detail.id, date: vnDay(Date.now()), photoIds: [] }} own={false} onClose={() => setDetail(null)} onEdit={() => {}} onDeleted={() => {}} onSignedOut={onSignedOut} detail={detail && <NoteParts note={detail} />} />
    <EntryActions title={partner.name} entry={received && { id: received.id, date: vnDay(Date.now()), photoIds: [] }} own={false} onClose={() => setReceived(null)} onEdit={() => {}} onDeleted={() => {}} onSignedOut={onSignedOut} detail={received && <><NoteParts note={received} /><Button size="lg" disabled={!online} onClick={() => { setClosing(received.id); setReceived(null); }}>{t("notes.readDone")}</Button>{!online && <p className="text-sm text-muted-foreground">{t("offline.continue")}</p>}</>} />
    {closing && <Suspense fallback={null}><NoteCloseSheet id={closing} onClose={() => setClosing(null)} onSignedOut={onSignedOut} onClosed={(entry) => { if (memory?.notes) memory.notes = { fromMe: memory.notes.fromMe.filter((n) => n.id !== closing), toMe: memory.notes.toMe.filter((n) => n.id !== closing) }; setClosing(null); void refresh(); toast.success(t("notes.closed")); onClosed?.(entry); }} /></Suspense>}
    {loaded && <Suspense fallback={null}><NoteSheet fromMenu={fromMenu} open={composing} onOpenChange={setComposing} partnerName={partner.name} entry={editing} onSignedOut={onSignedOut} onRefresh={() => void refresh()} onSaved={(note) => { toast.success(t(note.state === "sent" ? "notes.sent" : "notes.saved")); void refresh(); }} /></Suspense>}
  </div>;
}
