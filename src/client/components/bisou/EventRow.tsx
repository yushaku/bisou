import { Cake, Gift, Heart, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { UpcomingEvent } from "../../../shared/events";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { formatDay, formatNumber } from "@/lib/format";

const ICONS = { anniversary: Heart, days: Sparkles, birthday: Cake, holiday: Gift };

export function EventRow({ event }: { event: UpcomingEvent }) {
  const { t, locale } = useI18n();
  const Icon = ICONS[event.kind];
  const title = event.kind === "anniversary" ? t("events.anniversary", { years: formatNumber(event.years, locale) })
    : event.kind === "days" ? t("events.days", { n: formatNumber(event.days, locale) })
    : event.kind === "birthday" ? t("events.birthday", { name: event.name })
    : t(`events.holiday.${event.holiday}`);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 break-words">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground"><time dateTime={event.date}>{formatDay(event.date, locale, "short")}</time></p>
        {event.kind === "birthday" && <p className="text-sm text-muted-foreground">{t("events.turns", { name: event.name, age: formatNumber(event.age, locale) })}</p>}
      </div>
      {event.daysLeft === 0 ? <Badge>{t("events.today")}</Badge> :
        <span className="max-w-20 shrink-0 text-right text-sm text-muted-foreground">
          {event.daysLeft === 1 ? t("events.tomorrow") : t("events.inDays", { days: formatNumber(event.daysLeft, locale) })}
        </span>}
    </li>
  );
}

export function UpcomingCard({ events, action }: { events: UpcomingEvent[]; action: ReactNode }) {
  const { t } = useI18n();
  return (
    <Card className="mt-4 gap-0 pb-0">
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <h2 className="font-heading text-xl">{t("events.title")}</h2>
        {action}
      </div>
      <ul className="divide-y divide-border">{events.slice(0, 3).map((event, index) => <EventRow key={index} event={event} />)}</ul>
    </Card>
  );
}
