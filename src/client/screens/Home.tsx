import { CalendarHeart } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { Link } from "wouter";
import { toDayString } from "../../shared/days";
import { upcomingEvents } from "../../shared/events";
import { UpcomingCard } from "../components/bisou/EventRow";
import { Button } from "../components/ui/button";
import { TabMemory } from "../lib/tabMemory";
import { useCreateRequest, useTabNavigation } from "../lib/useTabNavigation";
import { useNow } from "../lib/useNow";
import { useNotes } from "../lib/useNotes";
import { useOnline } from "../lib/useOnline";
import type { Couple, CoupleEvent } from "../../shared/types";
import { api } from "../api";
import { Celebration } from "../components/bisou/Celebration";
import { CoupleAvatars, toPeople, type Person } from "../components/bisou/CoupleAvatars";
import { DailyQuestion } from "../components/bisou/DailyQuestion";
import { DaysCounter } from "../components/bisou/DaysCounter";
import { TodayPosts } from "../components/bisou/TodayPosts";
import { EmptyState } from "../components/bisou/EmptyState";
import { NotesInbox } from "../components/bisou/NotesInbox";
import { NotificationCard } from "../components/bisou/NotificationCard";
import { InstallCard } from "../components/bisou/InstallCard";
import { useI18n } from "../i18n";
import { startDateError } from "../lib/startDate";
import { waitingCount } from "../lib/notes";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The calendar (react-day-picker and its locales) loads on first use, outside the main bundle.
const EventSheet = lazy(() => import("../components/bisou/EventSheet").then((m) => ({ default: m.EventSheet })));
const DateSheet = lazy(() => import("../components/bisou/DateSheet").then((m) => ({ default: m.DateSheet })));

interface HomeProps extends SessionProps {
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  onRefresh?: () => void | Promise<void>;
  /* True right after pairing: plays the celebration once. */
  celebrate: boolean;
  onCelebrated: () => void;
}

export function Home({ couple, onCouple, onRefresh, celebrate, onCelebrated, ...session }: HomeProps) {
  const { t } = useI18n();
  const online = useOnline();
  const [editingEvent, setEditingEvent] = useState<CoupleEvent | null>();
  const openAdd = useCallback(() => setEditingEvent(null), []);
  useCreateRequest("event", openAdd);
  const [picking, setPicking] = useState(false);
  // Stays mounted after the first open so the sheet can animate closed.
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const pick = () => {
    setSheetLoaded(true);
    setPicking(true);
  };
  const now = useNow();
  const memory = useContext(TabMemory);
  const { lists, failed: notesFailed } = useNotes(session.onSignedOut);
  const navigation = useTabNavigation("home");

  // Creator first on both phones, so each partner keeps the same tint everywhere.
  const people = toPeople(couple.members.slice(0, 2), session.user, t) as [Person & { birthDate: string | null }, Person & { birthDate: string | null }];

  async function saveStartDate(day: string): Promise<string | null> {
    const res = await api.setStartDate(day);
    if (!res.ok) return startDateError(t, res.status, res.error);
    onCouple(res.data.couple);
    toast.success(t("startDate.saved"));
    return null;
  }

  if (couple.members.length !== 2) return null;

  return (
    <SignedInShell {...session} tab="home" onRefresh={onRefresh}>
      <div className="mb-4 flex items-center gap-3">
        <CoupleAvatars people={people} size="sm" />
        <p className="min-w-0 truncate text-base text-muted-foreground">{t("couple.and", { a: people[0].name, b: people[1].name })}</p>
      </div>

      {couple.startDate ? (
        <DaysCounter startDate={couple.startDate} people={people} today={now} onEditStartDate={pick} />
      ) : (
        <EmptyState
          icon={CalendarHeart}
          title={t("startDate.prompt")}
          action={{ label: t("startDate.set"), onClick: pick }}
        />
      )}

      <DailyQuestion couple={couple} user={session.user} onSignedOut={session.onSignedOut} />

      {(!notesFailed || !online) && <NotesInbox count={waitingCount(lists)} onOpen={() => { if (memory) { memory.journalSection = "notes"; memory.scroll.set("journal", 0); } navigation.onSelect("journal"); }} />}
      <TodayPosts couple={couple} user={session.user} today={toDayString(now)} onSignedOut={session.onSignedOut} />

      <InstallCard />

      <UpcomingCard onOpen={(id) => setEditingEvent(couple.events.find((event) => event.id === id))} events={upcomingEvents(couple.startDate, people, toDayString(now), couple.events).filter((event) => !(event.kind === "custom" && event.later))} action={
        <Button asChild variant="ghost" size="sm">
          <Link id="events-see-all" href="/events" state={{ from: "/" }} onClick={() => {
            if (memory) {
              memory.scroll.set("home", window.scrollY);
              memory.returnFocus = "events-see-all";
            }
          }}>{t("home.seeAll")}</Link>
        </Button>
      } />

      <NotificationCard />

      {editingEvent !== undefined && <Suspense fallback={null}><EventSheet event={editingEvent} onClose={() => setEditingEvent(undefined)} onCouple={onCouple} onSignedOut={session.onSignedOut} /></Suspense>}
      {sheetLoaded && (
        <Suspense fallback={null}>
          <DateSheet title={t("startDate.title")} hint={t("startDate.hint")} saveLabel={t("startDate.save")} firstMonth={new Date(1950, 0, 1)} open={picking} onOpenChange={setPicking} value={couple.startDate} onSave={saveStartDate} />
        </Suspense>
      )}
      <Celebration
        open={celebrate}
        onOpenChange={(open) => {
          if (!open) onCelebrated();
        }}
        title={t("paired.title")}
        body={t("paired.body", { a: people[0].name, b: people[1].name })}
      />
    </SignedInShell>
  );
}
