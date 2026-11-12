import { Ellipsis, Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import type { Couple, JournalEntry, JournalPage } from "../../shared/types";
import { api, photoUrl } from "../api";
import { toPeople } from "../components/bisou/CoupleAvatars";
import { displayName } from "../lib/displayName";
import { EmptyState } from "../components/bisou/EmptyState";
import { JournalDetailSheet } from "../components/bisou/JournalDetailSheet";
import { EntryActions } from "../components/bisou/EntryActions";
import { EntryCard } from "../components/bisou/EntryCard";
import { NotesSection } from "../components/bisou/NotesSection";
import { PhotoViewer } from "../components/bisou/PhotoViewer";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { addPage, groupByDay, refreshFirstPage, removeEntry, upsertEntry } from "../lib/journalFeed";
import { toCard } from "../lib/journalCard";
import { TabMemory } from "../lib/tabMemory";
import { useCreateRequest } from "../lib/useTabNavigation";
import { useOnline } from "../lib/useOnline";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The compose sheet, its calendar and photo tools load on first write, outside the feed bundle.
const ClosedNoteSheet = lazy(() => import("../components/bisou/ClosedNoteSheet").then((m) => ({ default: m.ClosedNoteSheet })));
const JournalComposeSheet = lazy(() => import("../components/bisou/JournalComposeSheet").then((m) => ({ default: m.JournalComposeSheet })));
const ComposeSheet = lazy(() => import("../components/bisou/ComposeSheet").then((m) => ({ default: m.ComposeSheet })));

interface JournalProps extends SessionProps {
  couple: Couple;
}

/* Starts the next page this far before the reader reaches the bottom, so scrolling rarely waits. */
const PREFETCH_MARGIN = "0px 0px 800px 0px";

export function Journal({ couple, ...session }: JournalProps) {
  const { user, onSignedOut } = session;
  const { t, locale } = useI18n();
  const memory = useContext(TabMemory);
  const [section, setSection] = useState<"feed" | "notes">(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("section") === "notes" ? "notes" : memory?.journalSection ?? "feed");
  useEffect(() => {
    if (memory) memory.journalSection = section;
    const url = new URL(window.location.href);
    if (url.searchParams.get("section") === "notes") { url.searchParams.delete("section"); history.replaceState(history.state, "", url); }
  }, [memory, section]);
  // null until the first page arrives; never shown as an empty journal while loading or failed.
  const [feed, setFeed] = useState<JournalPage | null>(() => memory?.journal ?? null);
  useLayoutEffect(() => {
    if (memory) memory.journal = feed;
  }, [feed, memory]);
  const [firstLoad, setFirstLoad] = useState<"loading" | "error">("loading");
  const [more, setMore] = useState<"idle" | "loading" | "error">("idle");
  const [stale, setStale] = useState(false);
  const online = useOnline();
  const moreBusy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const notesRef = useRef<{ refresh: () => Promise<void> }>(null);

  // Creator first, as on Home, so each partner keeps one tint everywhere.
  const people = new Map(toPeople(couple.members, user, t).map((person, index) => [couple.members[index]!.id, person]));
  const partner = couple.members.find((m) => m.id !== user.id);
  const partnerName = displayName(partner, t);

  const [fromMenu, setFromMenu] = useState(false);
  const [composing, setComposing] = useState(false);
  // Stays mounted after the first open so the sheet can animate closed.
  const [composeLoaded, setComposeLoaded] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  // Own entry being edited in the sheet; null writes a new one.
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  // Own entry whose edit and delete actions are open.
  const [acting, setActing] = useState<JournalEntry | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = feed?.entries.find((e) => e.id === detailId);
  useEffect(() => { if (!detail) setDetailId(null); }, [detail]);
  const [closedEditing, setClosedEditing] = useState<(JournalEntry & { note: NonNullable<JournalEntry["note"]> }) | null>(null);
  const write = (entry: JournalEntry | null = null, fromMenu = false) => {
    setSection("feed");
    if (entry?.note) { setClosedEditing({ ...entry, note: entry.note }); return; }
    setFromMenu(fromMenu);
    setEditing(entry);
    setComposeLoaded(true);
    setComposing(true);
  };

  const [createTab, setCreateTab] = useState<"feed" | "notes">("feed");
  const create = (tab: "feed" | "notes") => { setCreateTab(tab); setFromMenu(true); setEditing(null); setComposeLoaded(true); setComposing(true); };
  useCreateRequest("notes", () => create("notes"));
  useCreateRequest("journal", () => create(section));

  // Kept after closing, so focus can go back to the tile of the photo last shown.
  const [viewer, setViewer] = useState<{ entry: JournalEntry; index: number; open: boolean } | null>(null);
  const viewed = viewer?.open ? viewer.entry.photoIds : null;

  const deleteItem = (id: string) => {
    const entry = feed?.entries.find((e) => e.id === id);
    return entry?.note ? api.deleteNote(entry.note.id) : api.deleteEntry(id);
  };
  const onDeleted = (id: string) => {
    setFeed((f) => f && removeEntry(f, id));
    toast.success(t("entry.deleted"));
  };

  // A saved entry joins the loaded feed in its place without a refetch; the partner sees it on their next refresh.
  const onSaved = (entry: JournalEntry) => {
    setFeed((f) => (f ? upsertEntry(f, entry) : { entries: [entry], nextCursor: null }));
    setFocusId(entry.id);
    toast.success(t("compose.saved", { day: formatDay(entry.date, locale) }));
  };

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`entry-${focusId}`);
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
    setFocusId(null);
  }, [focusId, feed]);

  // A 401 leaves the journal; its data goes with the session.
  const refresh = useCallback(async () => {
    const res = await api.journal();
    if (!res.ok) {
      if (res.status === 401) return onSignedOut();
      setFirstLoad("error");
      setStale(true);
      return;
    }
    setStale(false);
    setFeed((f) => (f ? refreshFirstPage(f, res.data) : res.data));
  }, [onSignedOut]);

  const pullRefresh = useCallback(async () => {
    await Promise.all([refresh(), section === "notes" ? notesRef.current?.refresh() : undefined]);
  }, [refresh, section]);

  const loadMore = useCallback(async () => {
    const cursor = feed?.nextCursor;
    if (!cursor || moreBusy.current) return;
    moreBusy.current = true;
    setMore("loading");
    const res = await api.journal(cursor);
    moreBusy.current = false;
    if (!res.ok) {
      if (res.status === 401) return onSignedOut();
      setMore("error");
      return;
    }
    setMore("idle");
    setFeed((f) => (f ? addPage(f, res.data) : res.data));
  }, [feed?.nextCursor, onSignedOut]);

  const retryFirst = () => {
    setFirstLoad("loading");
    void refresh();
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Picks up the partner's entries when the app comes back to the front or the network returns.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => {
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  // A new observer per page: observe() reports at once, so a sentinel still in view loads the next page too.
  const autoLoad = typeof IntersectionObserver !== "undefined";
  useEffect(() => {
    const el = sentinel.current;
    if (!autoLoad || !el || more !== "idle") return;
    const io = new IntersectionObserver((items) => {
      if (items.some((i) => i.isIntersecting)) void loadMore();
    }, { rootMargin: PREFETCH_MARGIN });
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad, loadMore, more, feed]);

  return (
    <SignedInShell {...session} tab="journal" onRefresh={pullRefresh}>
      <Tabs value={section} onValueChange={(value) => { const next = value === "notes" ? "notes" : "feed"; setSection(next); if (memory) memory.journalSection = next; }}>
        <TabsList className="mb-4 w-full"><TabsTrigger value="feed">{t("journal.sectionFeed")}</TabsTrigger><TabsTrigger value="notes">{t("journal.sectionNotes")}</TabsTrigger></TabsList>
        <TabsContent value="notes"><NotesSection ref={notesRef} onClosed={(entry) => { onSaved(entry); setSection("feed"); }} couple={couple} user={user} onSignedOut={onSignedOut} /></TabsContent>
        <TabsContent value="feed">

      {feed && online && stale && (
        <div role="status" className="mb-4 rounded-control bg-warning px-4 py-3 text-base text-warning-foreground">
          {t("journal.stale")}{" "}
          <Button variant="link" size="sm" className="h-auto text-warning-foreground" onClick={() => void refresh()}>
            {t("journal.retry")}
          </Button>
        </div>
      )}

      {!feed && firstLoad === "loading" && (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-base text-muted-foreground">
            {t("journal.loading")}
          </p>
          <Skeleton className="h-7 w-48" aria-hidden="true" />
          <Skeleton className="h-44 rounded-xl" aria-hidden="true" />
          <Skeleton className="h-44 rounded-xl" aria-hidden="true" />
        </div>
      )}

      {!feed && firstLoad === "error" && (
        <EmptyState
          situation="error"
          title={t("journal.loadError")}
          description={t("journal.loadErrorBody")}
          action={{ label: t("journal.retry"), onClick: retryFirst }}
        />
      )}

      {feed && feed.entries.length === 0 && (
        <EmptyState
          title={t("journal.emptyTitle")}
          description={t("journal.emptyBody")}
          action={{ label: t("compose.first"), onClick: () => write(), icon: Plus }}
        />
      )}

      {feed && feed.entries.length > 0 && (
        <>
          {groupByDay(feed.entries).map((group) => (
            <section key={group.date} aria-labelledby={`day-${group.date}`} className="mb-8 flex flex-col gap-3">
              <h2 id={`day-${group.date}`} className="font-heading text-xl">
                <time dateTime={group.date}>{formatDay(group.date, locale)}</time>
              </h2>
              {group.entries.map((e) => {
                const card = toCard(e, people, t, locale);
                return (
                  <EntryCard
                    key={e.id}
                    id={`entry-${e.id}`}
                    entry={card}
                    showDate={false}
                    onOpen={() => setDetailId(e.id)}
                    onOpenPhoto={(index) => setViewer({ entry: e, index, open: true })}
                    // Only the author changes or deletes an entry (journal R10, R11), either partner a note entry (journal R26); the server checks it again.
                    actions={
                      (e.authorId === user.id || !!e.note) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-my-2 -mr-2"
                          aria-label={t("entry.options", { name: card.author.name, time: card.time ?? "" })}
                          onClick={() => setActing(e)}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      )
                    }
                  />
                );
              })}
            </section>
          ))}

          {feed.nextCursor ? (
            <div ref={sentinel} className="flex min-h-11 flex-col items-center gap-2 pb-4">
              {more === "loading" && (
                <p role="status" className="flex items-center gap-2 text-base text-muted-foreground">
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                  {t("journal.loadingMore")}
                </p>
              )}
              {more === "error" && (
                <>
                  <p role="alert" className="text-base text-destructive">
                    {t("journal.moreError")}
                  </p>
                  <Button variant="outline" onClick={() => void loadMore()}>
                    {t("journal.retry")}
                  </Button>
                </>
              )}
              {more === "idle" && !autoLoad && (
                <Button variant="outline" onClick={() => void loadMore()}>
                  {t("journal.loadMore")}
                </Button>
              )}
            </div>
          ) : (
            <p className="pb-4 text-sm text-muted-foreground">{t("journal.end")}</p>
          )}
        </>
      )}

      <PhotoViewer
        photos={viewed && viewed.map((id, i) => ({ src: photoUrl(id, "full"), alt: t("entry.photo", { index: i + 1, count: viewed.length }) }))}
        index={viewer?.index ?? 0}
        onIndex={(index) => setViewer((v) => v && { ...v, index })}
        onClose={() => setViewer((v) => v && { ...v, open: false })}
        onReturnFocus={(index) =>
          document.getElementById(`entry-${viewer?.entry.id}`)?.querySelector<HTMLElement>(`[data-photo="${index}"]`)?.focus()
        }
      />

      <EntryActions entry={detail ?? null} own={detail?.authorId === user.id || !!detail?.note} remove={deleteItem} onClose={() => setDetailId(null)} onEdit={write} onDeleted={onDeleted} onSignedOut={onSignedOut}
        detail={detail && <JournalDetailSheet entry={toCard(detail, people, t, locale)} onOpenPhoto={(index) => { setDetailId(null); setViewer({ entry: detail, index, open: true }); }} />} />
      <EntryActions remove={deleteItem} entry={acting} onClose={() => setActing(null)} onEdit={write} onDeleted={onDeleted} onSignedOut={onSignedOut} />

      {closedEditing && <Suspense fallback={null}><ClosedNoteSheet key={closedEditing.id} entry={closedEditing} onClose={() => setClosedEditing(null)} onSignedOut={onSignedOut} onSaved={(entry) => { onSaved(entry); setClosedEditing(null); }} /></Suspense>}
      </TabsContent></Tabs>
      {composeLoaded && (
        <Suspense fallback={null}>
          {fromMenu && !editing ? <JournalComposeSheet open={composing} onOpenChange={setComposing} initialTab={createTab} partnerName={partnerName} onSignedOut={onSignedOut}
            onSaved={(entry) => { onSaved(entry); setSection("feed"); }}
            onNoteSaved={(note) => { setSection("notes"); void notesRef.current?.refresh(); toast.success(t(note.state === "sent" ? "notes.sent" : "notes.saved")); }} /> : <ComposeSheet
            fromMenu={fromMenu}
            open={composing}
            onOpenChange={setComposing}
            partnerName={partnerName}
            entry={editing ?? undefined}
            onSaved={onSaved}
            onSignedOut={onSignedOut}
          />}
        </Suspense>
      )}
    </SignedInShell>
  );
}
