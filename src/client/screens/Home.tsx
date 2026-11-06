import { CalendarHeart } from "lucide-react";
import { lazy, Suspense, useCallback, useContext, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { toDayString } from "../../shared/days";
import { upcomingEvents } from "../../shared/events";
import { UpcomingCard } from "../components/bisou/EventRow";
import { Button } from "../components/ui/button";
import { TabMemory } from "../lib/tabMemory";
import { useCreateRequest, useTabNavigation } from "../lib/useTabNavigation";
import { useWishJar } from "../lib/useWishJar";
import { wishJarLevels } from "../lib/wishes";
import { useNow } from "../lib/useNow";
import type { Couple, CoupleEvent } from "../../shared/types";
import { api } from "../api";
import { Celebration } from "../components/bisou/Celebration";
import { CoupleAvatars, toPeople, type Person } from "../components/bisou/CoupleAvatars";
import { DaysCounter } from "../components/bisou/DaysCounter";
import { WishJar } from "../components/bisou/WishJar";
import { EmptyState } from "../components/bisou/EmptyState";
import { useI18n } from "../i18n";
import { startDateError } from "../lib/startDate";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The calendar (react-day-picker and its locales) loads on first use, outside the main bundle.
const EventSheet = lazy(() => import("../components/bisou/EventSheet").then((m) => ({ default: m.EventSheet })));
const DateSheet = lazy(() => import("../components/bisou/DateSheet").then((m) => ({ default: m.DateSheet })));

interface HomeProps extends SessionProps {
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  /* True right after pairing: plays the celebration once. */
  celebrate: boolean;
  onCelebrated: () => void;
}

export function Home({ couple, onCouple, celebrate, onCelebrated, ...session }: HomeProps) {
  const { t } = useI18n();
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
  const { jar, failed } = useWishJar(session.onSignedOut);
  const levels = wishJarLevels(jar);
  const navigation = useTabNavigation("home");

  // Creator first on both phones, so each partner keeps the same tint everywhere.
  const people = toPeople(couple.members.slice(0, 2), session.user) as [Person & { birthDate: string | null }, Person & { birthDate: string | null }];
  const myIndex = couple.members[0]?.id === session.user.id ? 0 : 1;

  async function saveStartDate(day: string): Promise<string | null> {
    const res = await api.setStartDate(day);
    if (!res.ok) return startDateError(t, res.status, res.error);
    onCouple(res.data.couple);
    toast.success(t("startDate.saved"));
    return null;
  }

  return (
    <SignedInShell {...session} tab="home">
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

      <section aria-label={t("nav.wishes")} className="mt-5 grid grid-cols-2 gap-2">
        <WishJar person={people[myIndex]} level={levels.mine} mine onOpen={() => {
          if (memory) {
            memory.wishesSection = "jar";
            memory.scroll.set("wishes", 0);
          }
          navigation.onSelect("wishes");
        }} />
        <WishJar person={people[myIndex === 0 ? 1 : 0]} level={levels.partner} empty={!failed && jar?.partnerJarEmpty === true} onOpen={() => {
          memory?.scroll.set("wishes", 0);
          navigation.onCreate("spin");
        }} />
      </section>

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
