import { lazy, Suspense, useState } from "react";
import { toDayString } from "../../shared/days";
import { upcomingEvents, type UpcomingEvent } from "../../shared/events";
import type { Couple, CoupleEvent, User } from "../../shared/types";
import { BottomBar } from "../components/bisou/AppShell";
import { toPeople } from "../components/bisou/CoupleAvatars";
import { EventRow } from "../components/bisou/EventRow";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { Card } from "../components/ui/card";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { useNow } from "../lib/useNow";
import { useTabNavigation } from "../lib/useTabNavigation";

const EventSheet = lazy(() => import("../components/bisou/EventSheet").then((m) => ({ default: m.EventSheet })));

export function Events({ couple, user, onCouple, onSignedOut }: { couple: Couple; user: User; onCouple: (couple: Couple | null) => void; onSignedOut: () => void }) {
  const [editing, setEditing] = useState<CoupleEvent | null>();
  const openEvent = (id: string) => setEditing(couple.events.find((event) => event.id === id));
  const { t, locale } = useI18n();
  const now = useNow();
  const navigation = useTabNavigation();
  const people = toPeople(couple.members, user, t);
  const later: UpcomingEvent[] = [];
  const months = new Map<string, UpcomingEvent[]>();
  for (const event of upcomingEvents(couple.startDate, people, toDayString(now), couple.events)) {
    if (event.kind === "custom" && event.later) { later.push(event); continue; }
    const month = event.date.slice(0, 7);
    const group = months.get(month);
    if (group) group.push(event);
    else months.set(month, [event]);
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <SubPageHeader title={t("events.title")} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
        {[...months].map(([month, events]) => (
          <section key={month} aria-labelledby={`month-${month}`} className="flex flex-col gap-3">
            <h2 id={`month-${month}`} className="font-heading text-xl first-letter:uppercase">
              <time dateTime={month}>{formatDay(`${month}-01`, locale, "month")}</time>
            </h2>
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">{events.map((event, index) => <EventRow key={event.kind === "custom" ? event.id : index} event={event} onOpen={openEvent} />)}</ul>
            </Card>
          </section>
        ))}
        {later.length > 0 && <section aria-labelledby="events-later" className="flex flex-col gap-3">
          <h2 id="events-later" className="font-heading text-xl">{t("events.later")}</h2>
          <Card className="gap-0 py-0"><ul className="divide-y divide-border">{later.map((event, index) => <EventRow key={event.kind === "custom" ? event.id : index} event={event} onOpen={openEvent} />)}</ul></Card>
        </section>}
        {editing !== undefined && <Suspense fallback={null}><EventSheet event={editing} onClose={() => setEditing(undefined)} onCouple={onCouple} onSignedOut={onSignedOut} /></Suspense>}
      </main>
      <BottomBar active="home" {...navigation} onCreate={() => setEditing(null)} />
    </div>
  );
}
