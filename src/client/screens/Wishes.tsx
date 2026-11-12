import { ArrowLeft, Check, Ellipsis, ListFilter, PencilLine, Plus, Trash2 } from "lucide-react";
import { lazy, Suspense, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import { toast } from "@/components/ui/ding-toaster";
import type { Couple, Wish } from "../../shared/types";
import { api } from "../api";
import { EmptyState } from "../components/bisou/EmptyState";
import { Celebration } from "../components/bisou/Celebration";
import { ClaimsList } from "../components/bisou/ClaimsList";
import { toPeople } from "../components/bisou/CoupleAvatars";
import { SpinCard } from "../components/bisou/SpinCard";
import { WishJar } from "../components/bisou/WishJar";
import { WishDetailSheet } from "../components/bisou/WishDetailSheet";
import { WishCard } from "../components/bisou/WishCard";
import { Button } from "../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../components/ui/drawer";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../components/ui/select";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { displayName } from "../lib/displayName";
import { useOnline } from "../lib/useOnline";
import { wishErrorKey, wishJarLevels } from "../lib/wishes";
import { useCreateRequest } from "../lib/useTabNavigation";
import { readCreateRequest } from "../lib/navigation";
import { useWishJar } from "../lib/useWishJar";
import { TabMemory } from "../lib/tabMemory";
import { SignedInShell, type SessionProps } from "./SignedInShell";

const WishSheet = lazy(() => import("../components/bisou/WishSheet").then((m) => ({ default: m.WishSheet })));

// The sections of the Wishes tab; both jars sit above them on every section.
const SECTIONS = { jar: "wishes.mine", claims: "claims.title" } as const;
type Section = keyof typeof SECTIONS;
// My jar lists open and received wishes together, narrowed by a filter.
const FILTERS = { all: "wishes.filterAll", open: "wishes.filterOpen", received: "received.list" } as const;
type Filter = keyof typeof FILTERS;

const ComposeSheet = lazy(() => import("../components/bisou/ComposeSheet").then((m) => ({ default: m.ComposeSheet })));

export function Wishes({ couple, ...session }: SessionProps & { couple: Couple }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const memory = useContext(TabMemory);
  const historyState = useHistoryState<{ shortcut?: boolean } | null>();
  const request = readCreateRequest(historyState);
  const [view, setView] = useState<Section | "spin">(() => request === "spin" ? "spin" : memory?.wishesSection ?? "jar");
  const [filter, setFilter] = useState<Filter>(() => memory?.wishesFilter ?? "all");
  const partnerName = displayName(couple.members.find((m) => m.id !== session.user.id), t);
  const people = toPeople(couple.members, session.user, t);
  const myIndex = couple.members[0]?.id === session.user.id ? 0 : 1;
  const myJar = people[myIndex]!;
  const partnerJar = people[myIndex === 0 ? 1 : 0]!;
  const [receiving, setReceiving] = useState<Wish | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const { jar, setJar, failed, refresh } = useWishJar(session.onSignedOut);
  const levels = wishJarLevels(jar);
  useLayoutEffect(() => {
    if (!memory) return;
    if (view !== "spin") memory.wishesSection = view;
    memory.wishesFilter = filter;
  }, [view, filter, memory]);
  const [fromMenu, setFromMenu] = useState(false);
  const [editing, setEditing] = useState<Wish | null | undefined>(undefined);
  const [acting, setActing] = useState<Wish | null>(null);
  const [detail, setDetail] = useState(false);
  useEffect(() => { if (acting && jar && ![...jar.open, ...jar.received].some((wish) => wish.id === acting.id)) setActing(null); }, [jar, acting]);
  // The options sheet still shows its wish while it animates closed.
  const lastActing = useRef(acting);
  if (acting) lastActing.current = acting;
  const shownWish = acting ?? lastActing.current;
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useCreateRequest("spin", () => setView("spin"));
  useCreateRequest("wishes", () => { setFromMenu(true); setView("jar"); setEditing(null); });

  async function remove() {
    if (!online || !acting || busy) return;
    setBusy(true);
    const res = await api.deleteWish(acting.id);
    setBusy(false);
    if (res.ok) {
      setJar((j) => j && { ...j, open: j.open.filter((w) => w.id !== acting.id), received: j.received.filter((w) => w.id !== acting.id) });
      setActing(null); toast.success(t("wish.deleted"));
    } else if (res.status === 401) session.onSignedOut();
    else setError(t(wishErrorKey(res.error?.error)));
  }

  const optionsButton = (wish: Wish) => <Button variant="ghost" size="icon" aria-label={t("wish.options", { title: wish.title })} onClick={() => { setDetail(false); setActing(wish); setDeleting(false); setError(null); }}><Ellipsis aria-hidden="true" /></Button>;

  return <SignedInShell {...session} tab="wishes" onRefresh={refresh}>
    {view === "spin" ? <Button variant="ghost" className="mb-3 self-start" onClick={() => setView("jar")}><ArrowLeft aria-hidden="true" />{t("wishes.back")}</Button> : <>
      <section aria-label={t("nav.wishes")} className="mb-4 grid grid-cols-2 gap-2">
        <WishJar person={myJar} level={levels.mine} mine onOpen={() => setView("jar")} />
        <WishJar person={partnerJar} level={levels.partner} empty={!failed && jar?.partnerJarEmpty === true} onOpen={() => setView("spin")} />
      </section>
      <Tabs value={view} onValueChange={(value) => setView(value as Section)} className="mb-4">
        <TabsList className="w-full">
          {(Object.keys(SECTIONS) as Section[]).map((id) => <TabsTrigger key={id} value={id}>{t(SECTIONS[id])}</TabsTrigger>)}
        </TabsList>
      <TabsContent value="jar">
      <div className="mb-4 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t("wishes.private")}</p>
        {jar && jar.open.length + jar.received.length > 0 && <>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            {/* Icon only; a dot marks a filter other than All. The chevron is hidden. */}
            <SelectTrigger size="sm" aria-label={`${t("wishes.filter")}: ${t(FILTERS[filter])}`} className="relative size-9 shrink-0 justify-center p-0 [&>svg:last-child]:hidden">
              <ListFilter className="size-4" aria-hidden="true" />
              {filter !== "all" && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {(Object.keys(FILTERS) as Filter[]).map((id) => <SelectItem key={id} value={id}>
                {t(FILTERS[id])}
                <span className="tabular-nums text-muted-foreground">{id === "all" ? jar.open.length + jar.received.length : jar[id].length}</span>
              </SelectItem>)}
            </SelectContent>
          </Select>
        </>}
      </div>
    {failed && <div role="alert" className="mb-4 text-destructive">{t("wishes.loadError")} <Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
    {!jar && !failed && <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
    {jar && (jar.open.length + jar.received.length === 0
      ? <EmptyState title={t("empty.wishes")} description={t("wishes.private")} action={{ label: t("wishes.add"), onClick: () => { setFromMenu(false); setEditing(null); }, icon: Plus }} />
      : <>
        {filter === "received" && jar.received.length === 0 && <EmptyState title={t("received.empty")} />}
        {filter === "open" && jar.open.length === 0 && <EmptyState title={t("empty.wishes")} action={{ label: t("wishes.add"), onClick: () => { setFromMenu(false); setEditing(null); }, icon: Plus }} />}
        <div className="flex flex-col gap-3 pb-6">
          {filter !== "received" && jar.open.map((wish) => <WishCard key={wish.id} wish={wish} onOpen={() => { setDetail(true); setActing(wish); setDeleting(false); setError(null); }} actions={optionsButton(wish)} />)}
          {filter !== "open" && jar.received.map((wish) => <WishCard key={wish.id} wish={wish} onOpen={() => { setDetail(true); setActing(wish); setDeleting(false); setError(null); }} actions={optionsButton(wish)}>
            {wish.receivedOn && <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground"><span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="size-3" strokeWidth={3} aria-hidden="true" /></span>{t("received.on", { date: formatDay(wish.receivedOn, locale) })}</p>}
            {wish.note && <p className="mt-1 whitespace-pre-line text-sm">{wish.note}</p>}
          </WishCard>)}
          {filter === "received" && jar.received.length > 0 && <Button asChild variant="outline"><Link href="/journal">{t("received.journal")}</Link></Button>}
        </div>
      </>)}
      </TabsContent>
      <TabsContent value="claims"><ClaimsList onSignedOut={session.onSignedOut} /></TabsContent>
      </Tabs>
    </>}
    {view === "spin" && <SpinCard partnerName={partnerName} partnerJarEmpty={jar?.partnerJarEmpty === true} onSignedOut={session.onSignedOut} onViewClaims={() => setView("claims")} />}
    {editing !== undefined && <Suspense fallback={null}><WishSheet fromMenu={fromMenu} key={editing?.id ?? "new"} wish={editing} onClose={() => setEditing(undefined)} onSignedOut={session.onSignedOut} onSaved={(wish) => {
      setJar((j) => j && { ...j, open: [wish, ...j.open.filter((w) => w.id !== wish.id)].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)) });
      toast.success(t("wish.saved"));
    }} /></Suspense>}
    {receiving && <Suspense fallback={null}><ComposeSheet open receiving={receiving} partnerName={partnerName}
      onOpenChange={(open) => { if (!open) setReceiving(null); }} onSignedOut={session.onSignedOut} onSaved={(entry) => {
        setJar((j) => j && { ...j, open: j.open.filter((w) => w.id !== receiving.id), received: [{ ...receiving, status: "received", receivedOn: entry.date, note: null, updatedAt: entry.updatedAt }, ...j.received] });
        setView("jar"); setFilter("received"); setCelebrate(true); void refresh();
      }} /></Suspense>}
    <Celebration open={celebrate} onOpenChange={setCelebrate} />
    <Drawer open={!!acting} onOpenChange={(open) => { if (!open && !busy) setActing(null); }}>
      <DrawerContent className="max-h-[80vh]" aria-describedby={undefined}>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-5 pb-5">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-heading text-xl">{shownWish?.title}</DrawerTitle>
            {deleting && <p id="wish-delete-confirm" className="text-sm text-muted-foreground">{t("wish.deleteConfirm", { title: shownWish?.title ?? "" })}</p>}
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {detail && shownWish && !deleting && <WishDetailSheet wish={shownWish} />}
          <p role="alert" className="text-destructive empty:hidden">{error}</p>
          {!online && <p id="wish-action-offline" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
          {deleting ? <>
            <Button key="confirm-delete" autoFocus aria-describedby={!online ? "wish-delete-confirm wish-action-offline" : "wish-delete-confirm"} variant="destructive" size="lg" disabled={!online} loading={busy} onClick={() => void remove()}><Trash2 aria-hidden="true" />{t("wish.delete")}</Button>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => { setDeleting(false); setError(null); }}>{t("common.back")}</Button>
          </> : <>
            {shownWish?.status === "open" && <Button size="lg" className="justify-start" onClick={() => { setReceiving(acting); setActing(null); }}><Check aria-hidden="true" />{t("received.action")}</Button>}
            {shownWish?.status === "open" && <Button variant="outline" size="lg" className="justify-start" onClick={() => { setFromMenu(false); setEditing(acting); setActing(null); }}><PencilLine aria-hidden="true" />{t("wish.edit")}</Button>}
            <Button aria-describedby={!online ? "wish-action-offline" : undefined} variant="outline" size="lg" disabled={!online} className="justify-start text-destructive" onClick={() => setDeleting(true)}><Trash2 aria-hidden="true" />{t("wish.delete")}</Button>
            <Button variant="ghost" size="lg" onClick={() => setActing(null)}>{t("common.close")}</Button>
          </>}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  </SignedInShell>;
}
