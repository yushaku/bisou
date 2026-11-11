import { lazy, Suspense, useState } from "react";
import { Mailbox } from "lucide-react";
import { toast } from "sonner";
import type { Couple, User, WrittenNote } from "../../../shared/types";
import { useI18n } from "@/i18n";
import { useNotes } from "@/lib/useNotes";
import { formatDay, formatTime } from "@/lib/format";
import { vnDay } from "../../../shared/days";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { toPeople } from "./CoupleAvatars";
import { EntryActions } from "./EntryActions";
import { NoteParts } from "./NoteParts";
const NoteSheet = lazy(() => import("./NoteSheet").then((m) => ({ default: m.NoteSheet })));
export function NotesSection({ couple, user, onSignedOut }: { couple: Couple; user: User; onSignedOut: () => void }) {
  const { t, locale } = useI18n();
  const { lists, failed, refresh } = useNotes(onSignedOut);
  const [editing, setEditing] = useState<WrittenNote>(), [composing, setComposing] = useState(false), [loaded, setLoaded] = useState(false), [detail, setDetail] = useState<WrittenNote | null>(null);
  const people = toPeople(couple.members, user, t), partner = people[couple.members.findIndex((m) => m.id !== user.id)];
  if (couple.members.length !== 2 || !partner) return null;
  const write = (note?: WrittenNote) => { setEditing(note); setLoaded(true); setComposing(true); };
  return <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">{t("notes.invite")}</p>
    {(!lists || lists.fromMe.length > 0 || lists.toMe.length > 0) && <Button variant="outline" size="lg" onClick={() => write()}>{t("notes.write", { partner: partner.name })}</Button>}
    {!lists && (failed ? <EmptyState title={t("notes.loadError")} action={{ label: t("journal.retry"), onClick: () => void refresh() }} /> : <><p role="status">{t("notes.loading")}</p><Skeleton className="h-44 rounded-xl" /></>)}
    {lists && failed && <p role="status">{t("notes.stale")} <Button variant="link" onClick={() => void refresh()}>{t("journal.retry")}</Button></p>}
    {lists && !lists.fromMe.length && !lists.toMe.length && <EmptyState icon={Mailbox} title={t("notes.empty")} action={{ label: t("notes.write", { partner: partner.name }), onClick: () => write() }} />}
    {!!lists?.toMe.length && <section className="flex flex-col gap-3"><h2 className="font-heading text-xl">{t("notes.toMe")}</h2>{lists.toMe.map((note) => <Card key={note.id} className="gap-3 p-4"><p>{partner.name}</p><p>{t("notes.waiting")}</p></Card>)}</section>}
    {!!lists?.fromMe.length && <section className="flex flex-col gap-3"><h2 className="font-heading text-xl">{t("notes.fromMe")}</h2>{lists.fromMe.map((note) => {
      const time = formatTime(note.sendableAt, locale), day = vnDay(note.sendableAt);
      const state = note.state === "opened" ? t("notes.opened") : note.state === "sent" ? t("notes.notOpened") : Date.now() >= note.sendableAt ? t("notes.ready") : t("notes.cooling", { time: day === vnDay(Date.now()) ? time : `${formatDay(day, locale, "short")} ${time}` });
      return <Card key={note.id} className="p-4"><button type="button" className="flex min-h-11 flex-col gap-2 text-left" onClick={() => note.state === "opened" ? setDetail(note) : write(note)}><p className="line-clamp-2 whitespace-pre-wrap">{note.happened}</p><p className="text-sm text-muted-foreground">{state}</p></button></Card>;
    })}</section>}
    <EntryActions title={t("notes.opened")} entry={detail && { id: detail.id, date: vnDay(Date.now()), photoIds: [] }} own={false} onClose={() => setDetail(null)} onEdit={() => {}} onDeleted={() => {}} onSignedOut={onSignedOut} detail={detail && <NoteParts note={detail} />} />
    {loaded && <Suspense fallback={null}><NoteSheet open={composing} onOpenChange={setComposing} partnerName={partner.name} entry={editing} onSignedOut={onSignedOut} onRefresh={() => void refresh()} onSaved={() => { toast.success(t("notes.saved")); void refresh(); }} /></Suspense>}
  </div>;
}
