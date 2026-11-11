import { demoSpin } from "./samples";
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { AppShell, type TabId } from "@/components/bisou/AppShell";
import { DaysCounter } from "@/components/bisou/DaysCounter";
import { EntryCard } from "@/components/bisou/EntryCard";
import { AppearanceSettings } from "@/components/bisou/ThemeControls";
import { SpinCard } from "@/components/bisou/SpinCard";
import { WishCard } from "@/components/bisou/WishCard";
import { WishJar } from "@/components/bisou/WishJar";
import { CoupleAvatars } from "@/components/bisou/CoupleAvatars";
import { UpcomingCard } from "@/components/bisou/EventRow";
import { upcomingEvents } from "../../shared/events";
import { toDayString } from "../../shared/days";
import type { CreateDestination } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDesignT } from "./messages";
import { COUPLE, ENTRIES, MY_WISHES, PARTNER_WISHES, QUOC_BAO, START_DATE, TODAY } from "./samples";

export type SampleScreen = "home" | "journal" | "wishes";
const SCREEN_TAB: Record<SampleScreen, TabId> = { home: "home", journal: "journal", wishes: "wishes" };

/* One sample screen inside the real AppShell; the tab bar switches between the three samples. */
export function SampleApp({ initial, framed = false }: { initial: SampleScreen; framed?: boolean }) {
  const [screen, setScreen] = useState<SampleScreen>(initial);
  const [settings, setSettings] = useState(false);
  const { t } = useI18n();
  const d = useDesignT();
  const tabs = {
    active: settings ? undefined : SCREEN_TAB[screen],
    onSelect: (tab: TabId) => {
      if (tab === "home" || tab === "journal" || tab === "wishes") { setScreen(tab); setSettings(false); }
    },
    onCreate: (tab: CreateDestination) => { setScreen(tab === "event" ? "home" : tab === "spin" ? "wishes" : tab === "notes" ? "journal" : tab); setSettings(false); toast.info(d("previewOnly")); },
  };
  if (settings) return (
    <AppShell tabs={tabs} title={t("settings.title")} className={cn(framed && "min-h-full")} action={
      <Button variant="ghost" size="icon" aria-label={t("common.back")} onClick={() => setSettings(false)}><ArrowLeft /></Button>
    }>
      <AppearanceSettings onOpen={() => toast.info(d("previewOnly"))} />
    </AppShell>
  );
  return (
    <AppShell
      className={cn(framed && "min-h-full")}
      title={t(screen === "home" ? "home.ourCorner" : screen === "journal" ? "journal.title" : "nav.wishes")}
      onOpenSettings={() => setSettings(true)}
      tabs={tabs}
    >
      {screen === "home" && <HomeScreen />}
      {screen === "journal" && <JournalScreen />}
      {screen === "wishes" && <WishesScreen />}
    </AppShell>
  );
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center justify-between gap-3">
      <h2 className="font-heading text-2xl">{children}</h2>
      {action}
    </div>
  );
}

function HomeScreen() {
  const { t } = useI18n();
  const d = useDesignT();
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <CoupleAvatars people={COUPLE} size="sm" />
        <p className="min-w-0 truncate text-base text-muted-foreground">{t("couple.and", { a: COUPLE[0].name, b: COUPLE[1].name })}</p>
      </div>
      <DaysCounter startDate={START_DATE} people={COUPLE} today={TODAY} />
      <section aria-label={t("nav.wishes")} className="mt-5 grid grid-cols-2 gap-2">
        <WishJar person={COUPLE[0]} level={3} mine onOpen={() => toast.info(d("previewOnly"))} />
        <WishJar person={COUPLE[1]} level={2} onOpen={() => toast.info(d("previewOnly"))} />
      </section>
      <UpcomingCard events={upcomingEvents(START_DATE, COUPLE, toDayString(TODAY))} action={
        <Button variant="ghost" size="sm" onClick={() => toast.info(d("previewOnly"))}>{t("home.seeAll")}</Button>
      } />
    </>
  );
}

function JournalScreen() {
  const { locale } = useI18n();
  const id = useId();
  const days = [...new Set(ENTRIES.map((e) => e.date))];
  return (
    <>
      <div className="flex flex-col gap-8">
        {days.map((day) => (
          <section key={day} aria-labelledby={`${id}-${day}`} className="flex flex-col gap-3">
            <h2 id={`${id}-${day}`} className="font-heading text-xl first-letter:uppercase">
              <time dateTime={day}>{formatDay(day, locale, "weekday")}</time>
            </h2>
            {ENTRIES.filter((e) => e.date === day).map((e) => (
              <EntryCard key={e.id} entry={e} showDate={false} />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

function WishesScreen() {
  const { t } = useI18n();
  const d = useDesignT();
  const result = PARTNER_WISHES[0];
  return (
    <>
      <SpinCard
        partnerName={QUOC_BAO.name}
        onSpin={demoSpin}
        initialBudget={500_000}
        onClaim={async () => { toast.info(d("previewOnly")); return { ok: false, status: 0, error: null }; }}
        initialState={result ? { step: "result", wish: { ...result, price: result.price! } } : undefined}
      />
      <SectionTitle
        action={
          <Button variant="outline" size="sm" onClick={() => toast.info(d("previewOnly"))}>
            <Plus aria-hidden="true" />
            {t("wishes.add")}
          </Button>
        }
      >
        {t("wishes.mine")}
      </SectionTitle>
      <div className="flex flex-col gap-3">
        {MY_WISHES.map((w) => (
          <WishCard key={w.id} wish={w} />
        ))}
      </div>
    </>
  );
}
