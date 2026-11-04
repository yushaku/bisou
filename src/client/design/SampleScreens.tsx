import { ChevronRight, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell, type TabId } from "@/components/bisou/AppShell";
import { DaysCounter } from "@/components/bisou/DaysCounter";
import { EntryCard } from "@/components/bisou/EntryCard";
import { PageHeader } from "@/components/bisou/PageHeader";
import { SettingsSheet } from "@/components/bisou/SettingsSheet";
import { SpinCard } from "@/components/bisou/SpinCard";
import { WishCard } from "@/components/bisou/WishCard";
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
  return (
    <AppShell
      className={cn(framed && "min-h-full")}
      onOpenSettings={() => setSettings(true)}
      tabs={{
        active: SCREEN_TAB[screen],
        onSelect: (tab) => {
          if (tab === "home" || tab === "journal" || tab === "wishes") setScreen(tab);
          else setSettings(true);
        },
      }}
    >
      {screen === "home" && <HomeScreen onSeeAll={() => setScreen("journal")} />}
      {screen === "journal" && <JournalScreen />}
      {screen === "wishes" && <WishesScreen />}
      <SettingsSheet open={settings} onOpenChange={setSettings} />
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

function HomeScreen({ onSeeAll }: { onSeeAll: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <h1 className="sr-only">{t("nav.home")}</h1>
      <DaysCounter startDate={START_DATE} people={COUPLE} today={TODAY} className="mt-2" />
      <SectionTitle
        action={
          <Button variant="ghost" size="sm" className="-mr-2" onClick={onSeeAll}>
            {t("home.seeAll")}
            <ChevronRight aria-hidden="true" />
          </Button>
        }
      >
        {t("home.latest")}
      </SectionTitle>
      <div className="flex flex-col gap-4">
        {ENTRIES.slice(0, 2).map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </>
  );
}

function JournalScreen() {
  const { t, locale } = useI18n();
  const d = useDesignT();
  const id = useId();
  const days = [...new Set(ENTRIES.map((e) => e.date))];
  return (
    <>
      <PageHeader
        title={t("nav.journal")}
        action={
          <Button size="icon" aria-label={t("journal.new")} onClick={() => toast.info(d("previewOnly"))}>
            <Plus />
          </Button>
        }
      />
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
      <PageHeader title={t("nav.wishes")} />
      <SpinCard
        partnerName={QUOC_BAO.name}
        wishes={PARTNER_WISHES}
        initialBudget={500_000}
        onClaim={() => toast.info(d("previewOnly"))}
        initialState={result ? { step: "result", wish: result } : undefined}
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
