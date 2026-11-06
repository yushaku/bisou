import { ArrowLeft, Check, Ellipsis, Gift, Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import type { Couple, Wish } from "../../shared/types";
import { api } from "../api";
import { EmptyState } from "../components/bisou/EmptyState";
import { Celebration } from "../components/bisou/Celebration";
import { ClaimsList } from "../components/bisou/ClaimsList";
import { SpinCard } from "../components/bisou/SpinCard";
import { WishTeaser } from "../components/bisou/WishTeaser";
import { WishCard } from "../components/bisou/WishCard";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { wishErrorKey } from "../lib/wishes";
import { useCreateRequest } from "../lib/useTabNavigation";
import { TabMemory } from "../lib/tabMemory";
import { SignedInShell, type SessionProps } from "./SignedInShell";

const WishSheet = lazy(() => import("../components/bisou/WishSheet").then((m) => ({ default: m.WishSheet })));

// The sections of the Wishes tab; the partner's jar sits above them on every section.
const SECTIONS = { jar: "wishes.mine", claims: "claims.title" } as const;
type Section = keyof typeof SECTIONS;
// My jar lists open and received wishes together, narrowed by a filter.
const FILTERS = { all: "wishes.filterAll", open: "wishes.filterOpen", received: "received.list" } as const;
type Filter = keyof typeof FILTERS;

const ComposeSheet = lazy(() => import("../components/bisou/ComposeSheet").then((m) => ({ default: m.ComposeSheet })));

export function Wishes({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { t, locale } = useI18n();
  const memory = useContext(TabMemory);
  const [view, setView] = useState<Section | "spin">(() => memory?.wishesSection ?? "jar");
  const [filter, setFilter] = useState<Filter>(() => memory?.wishesFilter ?? "all");
  const partnerName = couple.members.find((m) => m.id !== session.user.id)?.displayName ?? "?";
  const [receiving, setReceiving] = useState<Wish | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [jar, setJar] = useState<{ open: Wish[]; received: Wish[] } | null>(() => memory?.wishes ?? null);
  useLayoutEffect(() => {
    if (!memory) return;
    memory.wishes = jar;
    if (view !== "spin") memory.wishesSection = view;
    memory.wishesFilter = filter;
  }, [jar, view, filter, memory]);
  const [failed, setFailed] = useState(false);
  const [fromMenu, setFromMenu] = useState(false);
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

  useCreateRequest("wishes", () => { setFromMenu(true); setView("jar"); setEditing(null); });

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

  const optionsButton = (wish: Wish) => <Button variant="ghost" size="icon" aria-label={t("wish.options", { title: wish.title })} onClick={() => { setActing(wish); setDeleting(false); setError(null); }}><Ellipsis aria-hidden="true" /></Button>;

  return <SignedInShell {...session} tab="wishes">
    {view === "spin" ? <Button variant="ghost" className="mb-3 self-start" onClick={() => setView("jar")}><ArrowLeft aria-hidden="true" />{t("wishes.back")}</Button> : <>
      <h1 className="sr-only">{t(SECTIONS[view])}</h1>
      <div className="mb-4"><WishTeaser onOpen={() => setView("spin")} title={t("spin.entry", { name: partnerName })} description={t("spin.entryHint")} /></div>
      <Tabs value={view} onValueChange={(value) => setView(value as Section)} className="mb-4">
        <TabsList className="w-full">
          {(Object.keys(SECTIONS) as Section[]).map((id) => <TabsTrigger key={id} value={id}>{t(SECTIONS[id])}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {view === "jar" && <p className="mb-4 text-sm text-muted-foreground">{t("wishes.private")}</p>}
    </>}
    {view === "spin" && <SpinCard partnerName={partnerName} onSignedOut={session.onSignedOut} onViewClaims={() => setView("claims")} />}
    {view === "claims" && <ClaimsList onSignedOut={session.onSignedOut} />}
    {view === "jar" && <>
    {failed && <div role="alert" className="mb-4 text-destructive">{t("wishes.loadError")} <Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
    {!jar && !failed && <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
    {jar && (jar.open.length + jar.received.length === 0
      ? <EmptyState icon={Gift} title={t("empty.wishes")} description={t("wishes.private")} action={{ label: t("wishes.add"), onClick: () => { setFromMenu(false); setEditing(null); }, icon: Plus }} />
      : <>
        <ToggleGroup type="single" variant="outline" size="sm" spacing={1} aria-label={t("wishes.filter")} className="mb-4" value={filter}
          onValueChange={(value) => { if (value) setFilter(value as Filter); }}>
          {(Object.keys(FILTERS) as Filter[]).map((id) => <ToggleGroupItem key={id} value={id} className="px-3">
            {t(FILTERS[id])}
            <span className="tabular-nums text-muted-foreground">{id === "all" ? jar.open.length + jar.received.length : jar[id].length}</span>
          </ToggleGroupItem>)}
        </ToggleGroup>
        {filter === "received" && jar.received.length === 0 && <EmptyState icon={Gift} title={t("received.empty")} />}
        {filter === "open" && jar.open.length === 0 && <EmptyState icon={Gift} title={t("empty.wishes")} action={{ label: t("wishes.add"), onClick: () => { setFromMenu(false); setEditing(null); }, icon: Plus }} />}
        <div className="flex flex-col gap-3 pb-6">
          {filter !== "received" && jar.open.map((wish) => <WishCard key={wish.id} wish={wish} actions={optionsButton(wish)} />)}
          {filter !== "open" && jar.received.map((wish) => <div key={wish.id}>
            <WishCard wish={wish} actions={optionsButton(wish)} />
            {wish.receivedOn && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="size-3.5" strokeWidth={3} aria-hidden="true" /></span>{t("received.on", { date: formatDay(wish.receivedOn, locale) })}</p>}
            {wish.note && <p className="mt-1 whitespace-pre-line">{wish.note}</p>}
          </div>)}
          {filter === "received" && jar.received.length > 0 && <Button asChild variant="outline"><Link href="/journal">{t("received.journal")}</Link></Button>}
        </div>
      </>)}
    </>}
    {editing !== undefined && <Suspense fallback={null}><WishSheet fromMenu={fromMenu} key={editing?.id ?? "new"} wish={editing} onClose={() => setEditing(undefined)} onSignedOut={session.onSignedOut} onSaved={(wish) => {
      setJar((j) => j && { ...j, open: [wish, ...j.open.filter((w) => w.id !== wish.id)].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)) });
      toast.success(t("wish.saved"));
    }} /></Suspense>}
    {receiving && <Suspense fallback={null}><ComposeSheet open receiving={receiving} author={{ name: session.user.displayName ?? "?", tone: couple.members[0]?.id === session.user.id ? "primary" : "secondary" }} partnerName={partnerName}
      onOpenChange={(open) => { if (!open) setReceiving(null); }} onSignedOut={session.onSignedOut} onSaved={(entry) => {
        setJar((j) => j && { open: j.open.filter((w) => w.id !== receiving.id), received: [{ ...receiving, status: "received", receivedOn: entry.date, note: null, updatedAt: entry.updatedAt }, ...j.received] });
        setView("jar"); setFilter("received"); setCelebrate(true); void refresh();
      }} /></Suspense>}
    <Celebration open={celebrate} onOpenChange={setCelebrate} />
    <Dialog open={!!acting} onOpenChange={(open) => { if (!open && !busy) setActing(null); }}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader><DialogTitle>{acting?.title}</DialogTitle><DialogDescription>{deleting ? t("wish.deleteConfirm", { title: acting?.title ?? "" }) : t("wish.options", { title: acting?.title ?? "" })}</DialogDescription></DialogHeader>
        <p role="alert" className="text-destructive empty:hidden">{error}</p>
        <DialogFooter>
          {!deleting && acting?.status === "open" && <Button onClick={() => { setReceiving(acting); setActing(null); }}>{t("received.action")}</Button>}
          {!deleting && acting?.status === "open" && <Button variant="outline" onClick={() => { setFromMenu(false); setEditing(acting); setActing(null); }}>{t("wish.edit")}</Button>}
          <Button variant="destructive" loading={busy} onClick={() => deleting ? void remove() : setDeleting(true)}>{t("wish.delete")}</Button>
          <Button variant="outline" disabled={busy} onClick={() => setActing(null)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SignedInShell>;
}
