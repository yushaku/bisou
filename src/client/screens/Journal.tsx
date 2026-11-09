import { useOnline } from "../lib/useOnline";
import { BookHeart, Ellipsis, Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Couple, JournalEntry, JournalPage } from "../../shared/types";
import { api, photoUrl } from "../api";
import { toPeople } from "../components/bisou/CoupleAvatars";
import { displayName } from "../lib/displayName";
import { EmptyState } from "../components/bisou/EmptyState";
import { JournalDetailSheet } from "../components/bisou/JournalDetailSheet";
import { EntryActions } from "../components/bisou/EntryActions";
import { EntryCard } from "../components/bisou/EntryCard";
import { PhotoViewer } from "../components/bisou/PhotoViewer";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { addPage, groupByDay, refreshFirstPage, removeEntry, upsertEntry } from "../lib/journalFeed";
import { toCard } from "../lib/journalCard";
import { TabMemory } from "../lib/tabMemory";
import { useCreateRequest } from "../lib/useTabNavigation";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The compose sheet, its calendar and photo tools load on first write, outside the feed bundle.
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

  // Creator first, as on Home, so each partner keeps one tint everywhere.
  const people = new Map(toPeople(couple.members, user, t).map((person, index) => [couple.members[index]!.id, person]));
  const me = people.get(user.id) ?? { name: displayName(user, t), tone: "primary" };
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
  const write = (entry: JournalEntry | null = null, fromMenu = false) => {
    setFromMenu(fromMenu);
    setEditing(entry);
    setComposeLoaded(true);
    setComposing(true);
  };

  useCreateRequest("journal", () => write(null, true));

  // Kept after closing, so focus can go back to the tile of the photo last shown.
  const [viewer, setViewer] = useState<{ entry: JournalEntry; index: number; open: boolean } | null>(null);
  const viewed = viewer?.open ? viewer.entry.photoIds : null;

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
    <SignedInShell {...session} tab="journal">

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
          title={t("journal.loadError")}
          description={t("journal.loadErrorBody")}
          action={{ label: t("journal.retry"), onClick: retryFirst }}
        />
      )}

      {feed && feed.entries.length === 0 && (
        <EmptyState
          icon={BookHeart}
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
                    // Only the author changes or deletes an entry (R10, R11); the server checks it again.
                    actions={
                      e.authorId === user.id && (
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

      <EntryActions entry={detail ?? null} own={detail?.authorId === user.id} onClose={() => setDetailId(null)} onEdit={write} onDeleted={onDeleted} onSignedOut={onSignedOut}
        detail={detail && <JournalDetailSheet entry={toCard(detail, people, t, locale)} onOpenPhoto={(index) => { setDetailId(null); setViewer({ entry: detail, index, open: true }); }} />} />
      <EntryActions entry={acting} onClose={() => setActing(null)} onEdit={write} onDeleted={onDeleted} onSignedOut={onSignedOut} />

      {composeLoaded && (
        <Suspense fallback={null}>
          <ComposeSheet
            fromMenu={fromMenu}
            open={composing}
            onOpenChange={setComposing}
            author={me}
            partnerName={partnerName}
            entry={editing ?? undefined}
            onSaved={onSaved}
            onSignedOut={onSignedOut}
          />
        </Suspense>
      )}
    </SignedInShell>
  );
}
