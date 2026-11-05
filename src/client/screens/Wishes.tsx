import { ArrowLeft, Ellipsis, Gift, LockKeyhole, Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Couple, Wish } from "../../shared/types";
import { api } from "../api";
import { EmptyState } from "../components/bisou/EmptyState";
import { PageHeader } from "../components/bisou/PageHeader";
import { ClaimsList } from "../components/bisou/ClaimsList";
import { SpinCard } from "../components/bisou/SpinCard";
import { WishTeaser } from "../components/bisou/WishTeaser";
import { WishCard } from "../components/bisou/WishCard";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { wishErrorKey } from "../lib/wishes";
import { SignedInShell, type SessionProps } from "./SignedInShell";

const WishSheet = lazy(() => import("../components/bisou/WishSheet").then((m) => ({ default: m.WishSheet })));

export function Wishes({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { t } = useI18n();
  const [view, setView] = useState<"jar" | "spin" | "claims">("jar");
  const partnerName = couple.members.find((m) => m.id !== session.user.id)?.displayName ?? "?";
  const [jar, setJar] = useState<{ open: Wish[]; received: Wish[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Wish | null | undefined>(undefined);
  const [acting, setActing] = useState<Wish | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const res = await api.wishes();
    if (res.ok) { setJar(res.data); setFailed(false); }
    else if (res.status === 401) session.onSignedOut();
    else setFailed(true);
  }, [session.onSignedOut]);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => { document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);

  async function remove() {
    if (!acting || busy) return;
    setBusy(true);
    const res = await api.deleteWish(acting.id);
    setBusy(false);
    if (res.ok) {
      setJar((j) => j && { open: j.open.filter((w) => w.id !== acting.id), received: j.received.filter((w) => w.id !== acting.id) });
      setActing(null); toast.success(t("wish.deleted"));
    } else if (res.status === 401) session.onSignedOut();
    else setError(t(wishErrorKey(res.error?.error)));
  }

  return <SignedInShell {...session} tab="wishes">
    {view !== "jar" && <Button variant="ghost" className="mb-3 self-start" onClick={() => setView("jar")}><ArrowLeft aria-hidden="true" />{t("wishes.back")}</Button>}
    <PageHeader title={t(view === "jar" ? "wishes.mine" : view === "spin" ? "spin.title" : "claims.title")} description={view === "jar" ? t("wishes.private") : undefined} />
    {view === "spin" && <SpinCard partnerName={partnerName} onSignedOut={session.onSignedOut} onViewClaims={() => setView("claims")} />}
    {view === "claims" && <ClaimsList onSignedOut={session.onSignedOut} />}
    {view === "jar" && <>
    <WishTeaser onOpen={() => setView("spin")} title={t("spin.entry", { name: partnerName })} description={t("spin.entryHint")} />
    <div className="my-4 flex justify-between"><Button variant="ghost" onClick={() => setView("claims")}><LockKeyhole aria-hidden="true" />{t("claims.title")}</Button></div>
    {failed && <div role="alert" className="mb-4 text-destructive">{t("wishes.loadError")} <Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
    {!jar && !failed && <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
    {jar && <>
      {jar.open.length === 0 ? <EmptyState icon={Gift} title={t("empty.wishes")} description={t("wishes.private")} action={{ label: t("wishes.add"), onClick: () => setEditing(null), icon: Plus }} /> :
        <div className="flex flex-col gap-3 pb-6">{jar.open.map((wish) => <WishCard key={wish.id} wish={wish} actions={<Button variant="ghost" size="icon" aria-label={t("wish.options", { title: wish.title })} onClick={() => { setActing(wish); setDeleting(false); setError(null); }}><Ellipsis aria-hidden="true" /></Button>} />)}</div>}
      <div className="pointer-events-none sticky bottom-[calc(--spacing(19)+env(safe-area-inset-bottom))] z-20 mt-auto flex justify-end">
        <Button size="lg" className="pointer-events-auto elevate" onClick={() => setEditing(null)}><Plus aria-hidden="true" />{t("wishes.add")}</Button>
      </div>
    </>}
    </>}
    {editing !== undefined && <Suspense fallback={null}><WishSheet key={editing?.id ?? "new"} wish={editing} onClose={() => setEditing(undefined)} onSignedOut={session.onSignedOut} onSaved={(wish) => {
      setJar((j) => j && { ...j, open: [wish, ...j.open.filter((w) => w.id !== wish.id)].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)) });
      toast.success(t("wish.saved"));
    }} /></Suspense>}
    <Dialog open={!!acting} onOpenChange={(open) => { if (!open && !busy) setActing(null); }}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader><DialogTitle>{acting?.title}</DialogTitle><DialogDescription>{deleting ? t("wish.deleteConfirm", { title: acting?.title ?? "" }) : t("wish.options", { title: acting?.title ?? "" })}</DialogDescription></DialogHeader>
        <p role="alert" className="text-destructive empty:hidden">{error}</p>
        <DialogFooter>
          {!deleting && <Button onClick={() => { setEditing(acting); setActing(null); }}>{t("wish.edit")}</Button>}
          <Button variant="destructive" loading={busy} onClick={() => deleting ? void remove() : setDeleting(true)}>{t("wish.delete")}</Button>
          <Button variant="outline" disabled={busy} onClick={() => setActing(null)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SignedInShell>;
}
