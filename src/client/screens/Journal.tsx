import { defined } from "../../shared/guards";
import { Ellipsis, Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { refreshJournalDetails, useJournal } from "../lib/useJournal";
import { toast } from "@/components/ui/ding-toaster";
import type { Couple, JournalEntry } from "../../shared/types";
import { api, photoUrl } from "../api";
import { toPeople } from "../components/bisou/CoupleAvatars";
import { displayName } from "../lib/displayName";
import { EmptyState } from "../components/bisou/EmptyState";
import { JournalDetailDrawer } from "../components/bisou/JournalDetailDrawer";
import { EntryActions } from "../components/bisou/EntryActions";
import { EntryCard } from "../components/bisou/EntryCard";
import { NotesSection } from "../components/bisou/NotesSection";
import { PhotoViewer } from "../components/bisou/PhotoViewer";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { groupByDay } from "../lib/journalFeed";
import { toCard } from "../lib/journalCard";
import { remember, TabMemory } from "../lib/tabMemory";
import { useCreateRequest } from "../lib/useTabNavigation";
import { ApiQueryError } from "../lib/apiQueryError";
import { queries } from "../lib/queries";
import { useServerQuery } from "../lib/serverQuery";
import { useOnline } from "../lib/useOnline";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The compose sheet, its calendar and photo tools load on first write, outside the feed bundle.
const ClosedNoteSheet = lazy(() =>
  import("../components/bisou/ClosedNoteSheet").then((m) => ({ default: m.ClosedNoteSheet })),
);
const JournalComposeSheet = lazy(() =>
  import("../components/bisou/JournalComposeSheet").then((m) => ({ default: m.JournalComposeSheet })),
);
const ComposeSheet = lazy(() => import("../components/bisou/ComposeSheet").then((m) => ({ default: m.ComposeSheet })));

interface JournalProps extends SessionProps {
  couple: Couple;
}

/* Starts the next page this far before the reader reaches the bottom, so scrolling rarely waits. */
const PREFETCH_MARGIN = "0px 0px 800px 0px";

export function Journal({ couple, ...session }: JournalProps) {
  const { user, onSignedOut } = session;
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const memory = useContext(TabMemory);
  const search = useSearch();
  const linkedId = new URLSearchParams(search).get("entry") || null;
  const [selectedSection, setSection] = useState<"feed" | "notes">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("section") === "notes"
      ? "notes"
      : (memory?.journalSection ?? "feed"),
  );
  const section = linkedId ? "feed" : selectedSection;
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs again each time Activity reveals the tab, to pick up the section Home asked for
    if (memory?.journalSection === "notes") setSection("notes");
  }, [memory]);
  useEffect(() => {
    remember(memory, { journalSection: section });
    const url = new URL(window.location.href);
    if (url.searchParams.get("section") === "notes") {
      url.searchParams.delete("section");
      history.replaceState(history.state, "", url);
    }
  }, [memory, section]);
  // null until the first page arrives; never shown as an empty journal while loading or failed.
  const {
    feed,
    refresh,
    loadMore,
    failed,
    moreFailed,
    loadingMore,
    saveEntry,
    removeEntry: removeCachedEntry,
  } = useJournal(onSignedOut);
  const firstLoad = failed ? "error" : "loading";
  const more = loadingMore ? "loading" : moreFailed ? "error" : "idle";
  const stale = failed && !moreFailed;
  const online = useOnline();
  const sentinel = useRef<HTMLDivElement>(null);
  const notesRef = useRef<{ refresh: () => Promise<void> }>(null);

  // Creator first, as on Home, so each partner keeps one tint everywhere.
  const people = useMemo(
    () =>
      new Map(toPeople(couple.members, user, t).map((person, index) => [defined(couple.members[index]).id, person])),
    [couple.members, user, t],
  );
  const partner = couple.members.find((m) => m.id !== user.id);
  const partnerName = displayName(partner, t);

  const groups = useMemo(() => (feed ? groupByDay(feed.entries) : []), [feed]);
  const cards = useMemo(
    () => new Map((feed?.entries ?? []).map((e) => [e.id, toCard(e, people, t, locale)])),
    [feed, people, t, locale],
  );

  const [fromMenu, setFromMenu] = useState(false);
  const [composing, setComposing] = useState(false);
  // Stays mounted after the first open so the sheet can animate closed.
  const [composeLoaded, setComposeLoaded] = useState(false);
  // Entry to scroll to and focus once it shows in the feed.
  const focusId = useRef<string | null>(null);
  // Entry being edited in the sheet; null writes a new one.
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  // Entry whose actions are open.
  const [acting, setActing] = useState<JournalEntry | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMenu, setDetailMenu] = useState(false);
  const [jumpToThread, setJumpToThread] = useState(false);
  const returnFocus = useRef<(() => void) | null>(null);
  const linkQuery = useMemo(
    () => ({
      ...queries.journalEntry(linkedId ?? ""),
      enabled: linkedId !== null,
    }),
    [linkedId],
  );
  const { data: linkedEntry, error: linkError, refresh: retryLink } = useServerQuery(linkQuery, onSignedOut);
  const missingLink = linkError instanceof ApiQueryError && linkError.status === 404;
  const feedDetail = feed?.entries.find((e) => e.id === detailId);
  const detail = linkedId ? (missingLink ? undefined : linkedEntry?.entry) : feedDetail;
  // The open entry left the feed (deleted on the other phone).
  if (detailId && !feedDetail) setDetailId(null);
  const clearEntryLink = () => {
    if (!linkedId) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("entry");
    history.replaceState(history.state, "", url);
  };
  const openEntry = (id: string, restoreFocus: () => void, showComments = false) => {
    clearEntryLink();
    returnFocus.current = restoreFocus;
    setJumpToThread(showComments);
    setDetailId(id);
  };
  const closeDetail = () => {
    clearEntryLink();
    setDetailMenu(false);
    setDetailId(null);
  };
  const [closedEditing, setClosedEditing] = useState<
    (JournalEntry & { note: NonNullable<JournalEntry["note"]> }) | null
  >(null);
  const write = (entry: JournalEntry | null = null, fromMenu = false) => {
    setSection("feed");
    if (entry?.note) {
      setClosedEditing({ ...entry, note: entry.note });
      return;
    }
    setFromMenu(fromMenu);
    setEditing(entry);
    setComposeLoaded(true);
    setComposing(true);
  };

  const [createTab, setCreateTab] = useState<"feed" | "notes">("feed");
  const create = (tab: "feed" | "notes") => {
    setCreateTab(tab);
    setFromMenu(true);
    setEditing(null);
    setComposeLoaded(true);
    setComposing(true);
  };
  useCreateRequest("notes", () => create("notes"));
  useCreateRequest("journal", () => create(section));

  // Kept after closing, so focus can go back to the tile of the photo last shown.
  const [viewer, setViewer] = useState<{ entry: JournalEntry; index: number; open: boolean } | null>(null);
  const viewed = viewer?.open ? viewer.entry.photoIds : null;

  const deleteItem = (id: string, entry: JournalEntry) =>
    entry.note ? api.deleteNote(entry.note.id) : api.deleteEntry(id);
  const onDeleted = (id: string) => {
    removeCachedEntry(id);
    toast.success(t("entry.deleted"));
  };

  // A saved entry joins the shared feed in place; the partner sees it on their next refresh.
  const onSaved = (entry: JournalEntry) => {
    saveEntry(entry);
    focusId.current = entry.id;
    toast.success(t("compose.saved", { day: formatDay(entry.date, locale) }));
  };

  useEffect(() => {
    const id = focusId.current;
    if (!id) return;
    const el = document.getElementById(`entry-${id}`);
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
    focusId.current = null;
  }, [feed]);

  const pullRefresh = useCallback(async () => {
    await Promise.all([
      refresh(),
      refreshJournalDetails(queryClient),
      section === "notes" ? notesRef.current?.refresh() : undefined,
    ]);
  }, [queryClient, refresh, section]);

  const retryFirst = () => {
    void refresh();
  };

  // A new observer per page: observe() reports at once, so a sentinel still in view loads the next page too.
  const autoLoad = typeof IntersectionObserver !== "undefined";
  useEffect(() => {
    const el = sentinel.current;
    if (!autoLoad || !el || more !== "idle") return;
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) void loadMore();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad, loadMore, more, feed]);

  return (
    <SignedInShell {...session} tab="journal" onRefresh={pullRefresh}>
      <Tabs
        value={section}
        onValueChange={(value) => {
          const next = value === "notes" ? "notes" : "feed";
          clearEntryLink();
          setSection(next);
          remember(memory, { journalSection: next });
        }}
      >
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="feed">{t("journal.sectionFeed")}</TabsTrigger>
          <TabsTrigger value="notes">{t("journal.sectionNotes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
          <NotesSection
            ref={notesRef}
            onClosed={(entry) => {
              onSaved(entry);
              setSection("feed");
            }}
            couple={couple}
            user={user}
            onSignedOut={onSignedOut}
          />
        </TabsContent>
        <TabsContent value="feed">
          {linkedId && !detail && (
            <div className="mb-4">
              {linkError ? (
                <EmptyState
                  situation="error"
                  title={t(missingLink ? "comments.entryMissing" : "comments.entryLoadError")}
                  action={missingLink ? undefined : { label: t("journal.retry"), onClick: () => void retryLink() }}
                />
              ) : (
                <p role="status" className="text-muted-foreground">
                  {t("journal.loading")}
                </p>
              )}
              <Button variant="ghost" onClick={closeDetail}>
                {t("common.close")}
              </Button>
            </div>
          )}
          {feed && online && stale && (
            <div role="status" className="mb-4 rounded-control bg-warning px-4 py-3 text-base text-warning-foreground">
              {t("journal.stale")}{" "}
              <Button
                variant="link"
                size="sm"
                className="h-auto text-warning-foreground"
                onClick={() => void refresh()}
              >
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

          {feed?.entries.length === 0 && (
            <EmptyState
              title={t("journal.emptyTitle")}
              description={t("journal.emptyBody")}
              action={{ label: t("compose.first"), onClick: () => write(), icon: Plus }}
            />
          )}

          {feed && feed.entries.length > 0 && (
            <>
              {groups.map((group) => (
                <section key={group.date} aria-labelledby={`day-${group.date}`} className="mb-8 flex flex-col gap-3">
                  <h2 id={`day-${group.date}`} className="font-heading text-xl">
                    <time dateTime={group.date}>{formatDay(group.date, locale)}</time>
                  </h2>
                  {group.entries.map((e) => {
                    const card = defined(cards.get(e.id));
                    return (
                      <EntryCard
                        key={e.id}
                        id={`entry-${e.id}`}
                        entry={card}
                        showDate={false}
                        onOpen={(restoreFocus) => openEntry(e.id, restoreFocus)}
                        onOpenComments={(restoreFocus) => openEntry(e.id, restoreFocus, true)}
                        onOpenPhoto={(index) => setViewer({ entry: e, index, open: true })}
                        actions={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="-my-2 -mr-2"
                            aria-label={t("entry.options", { name: card.author.name, time: card.time ?? "" })}
                            onClick={() => setActing(e)}
                          >
                            <Ellipsis aria-hidden="true" />
                          </Button>
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
                      <span
                        className="size-2 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
                        aria-hidden="true"
                      />
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
            photos={
              viewed
                ? viewed.map((id, i) => ({
                    src: photoUrl(id, "full"),
                    alt: t("entry.photo", { index: i + 1, count: viewed.length }),
                  }))
                : null
            }
            index={viewer?.index ?? 0}
            onIndex={(index) => setViewer((v) => v && { ...v, index })}
            onClose={() => setViewer((v) => v && { ...v, open: false })}
            onReturnFocus={(index) =>
              document
                .getElementById(`entry-${viewer?.entry.id}`)
                ?.querySelector<HTMLElement>(`[data-photo="${index}"]`)
                ?.focus()
            }
          />

          <JournalDetailDrawer
            entry={detail ? toCard(detail, people, t, locale) : null}
            people={people}
            userId={user.id}
            jumpToThread={!linkedId && jumpToThread}
            onClose={closeDetail}
            onReturnFocus={() => {
              returnFocus.current?.();
              returnFocus.current = null;
            }}
            onOpenOptions={detail ? () => setDetailMenu(true) : undefined}
            onOpenPhoto={(index) => {
              if (!detail) return;
              returnFocus.current = null;
              closeDetail();
              setViewer({ entry: detail, index, open: true });
            }}
            onSignedOut={onSignedOut}
          >
            <EntryActions
              nested
              entry={detailMenu ? (detail ?? null) : null}
              canDelete={detail?.authorId === user.id || !!detail?.note}
              remove={deleteItem}
              onClose={() => setDetailMenu(false)}
              onEdit={(entry) => {
                closeDetail();
                write(entry);
              }}
              onDeleted={(id) => {
                closeDetail();
                onDeleted(id);
              }}
              onSignedOut={onSignedOut}
            />
          </JournalDetailDrawer>
          <EntryActions
            remove={deleteItem}
            entry={acting}
            canDelete={acting?.authorId === user.id || !!acting?.note}
            onClose={() => setActing(null)}
            onEdit={write}
            onDeleted={onDeleted}
            onSignedOut={onSignedOut}
          />

          {closedEditing && (
            <Suspense fallback={null}>
              <ClosedNoteSheet
                key={closedEditing.id}
                entry={closedEditing}
                recipient={
                  people.get(closedEditing.note.recipientId) ?? { name: displayName(undefined, t), tone: "secondary" }
                }
                onClose={() => setClosedEditing(null)}
                onSignedOut={onSignedOut}
                onSaved={(entry) => {
                  onSaved(entry);
                  setClosedEditing(null);
                }}
              />
            </Suspense>
          )}
        </TabsContent>
      </Tabs>
      {composeLoaded && (
        <Suspense fallback={null}>
          {fromMenu && !editing ? (
            <JournalComposeSheet
              open={composing}
              onOpenChange={setComposing}
              initialTab={createTab}
              partnerName={partnerName}
              onSignedOut={onSignedOut}
              onSaved={(entry) => {
                onSaved(entry);
                setSection("feed");
              }}
              onNoteSaved={() => {
                setSection("notes");
                void notesRef.current?.refresh();
              }}
            />
          ) : (
            <ComposeSheet
              fromMenu={fromMenu}
              open={composing}
              onOpenChange={setComposing}
              partnerName={partnerName}
              entry={editing ?? undefined}
              onSaved={onSaved}
              onSignedOut={onSignedOut}
            />
          )}
        </Suspense>
      )}
    </SignedInShell>
  );
}
