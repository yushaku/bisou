import { BookHeart, CalendarHeart, ChevronRight } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import type { ApiError, Couple } from "../../shared/types";
import { api } from "../api";
import { Celebration } from "../components/bisou/Celebration";
import { CoupleAvatars, type Person } from "../components/bisou/CoupleAvatars";
import { DaysCounter } from "../components/bisou/DaysCounter";
import { EmptyState } from "../components/bisou/EmptyState";
import { WishTeaser } from "../components/bisou/WishTeaser";
import { PageHeader } from "../components/bisou/PageHeader";
import { useI18n, type Translate } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";

// The calendar (react-day-picker and its locales) loads on first use, outside the main bundle.
const StartDateSheet = lazy(() => import("../components/bisou/StartDateSheet").then((m) => ({ default: m.StartDateSheet })));

interface HomeProps extends SessionProps {
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  /* True right after pairing: plays the celebration once. */
  celebrate: boolean;
  onCelebrated: () => void;
}

/* "Today" in the device's calendar; moves on at local midnight and when the app comes back. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const id = setTimeout(() => setNow(new Date()), tomorrow.getTime() - now.getTime() + 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [now]);
  return now;
}

function startDateError(t: Translate, status: number, error: ApiError | null): string {
  if (status === 0) return t("error.network");
  return error?.error === "invalid_start_date" ? t("error.invalid_start_date") : t("error.generic");
}

export function Home({ couple, onCouple, celebrate, onCelebrated, ...session }: HomeProps) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [picking, setPicking] = useState(false);
  // Stays mounted after the first open so the sheet can animate closed.
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const pick = () => {
    setSheetLoaded(true);
    setPicking(true);
  };
  const now = useNow();

  // Creator first on both phones, so each partner keeps the same tint everywhere.
  const tones: Person["tone"][] = ["primary", "secondary"];
  const people = couple.members.slice(0, 2).map((m, i) => ({
    name: (m.id === session.user.id ? session.user.displayName : m.displayName) ?? "?",
    tone: tones[i] ?? "primary",
  })) as [Person, Person];

  async function saveStartDate(day: string): Promise<string | null> {
    const res = await api.setStartDate(day);
    if (!res.ok) return startDateError(t, res.status, res.error);
    onCouple(res.data.couple);
    toast.success(t("startDate.saved"));
    return null;
  }

  return (
    <SignedInShell {...session} tab="home">
      <PageHeader title={t("home.ourCorner")} className="pb-2" />
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

      <Link
        href="/journal"
        className="press mt-6 flex items-center gap-4 rounded-xl edge elevate bg-card p-4 text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <BookHeart className="size-6 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-xl">{t("journal.title")}</span>
          <span className="block text-sm text-muted-foreground">{t("journal.open")}</span>
        </span>
        <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
      </Link>

      <div className="mt-4"><WishTeaser onOpen={() => navigate("/wishes")} /></div>

      {sheetLoaded && (
        <Suspense fallback={null}>
          <StartDateSheet open={picking} onOpenChange={setPicking} value={couple.startDate} onSave={saveStartDate} />
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
