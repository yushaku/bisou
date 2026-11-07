import { Cake, Gift, Heart, Sparkles, Plane, Music, UtensilsCrossed, Users, Star } from "lucide-react";
import type { ReactNode } from "react";
import { eventTitle, type UpcomingEvent } from "../../../shared/events";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { formatDay, formatNumber } from "@/lib/format";

export const EVENT_ICON_COMPONENTS = { heart: Heart, plane: Plane, music: Music, dinner: UtensilsCrossed, gift: Gift, cake: Cake, family: Users, star: Star };

const ICONS = { anniversary: Heart, days: Sparkles, birthday: Cake, holiday: Gift };

export function EventRow({ event, onOpen }: { event: UpcomingEvent; onOpen?: (id: string) => void }) {
  const { t, locale } = useI18n();
  const Icon = event.kind === "custom" ? EVENT_ICON_COMPONENTS[event.icon] : ICONS[event.kind];
  const title = eventTitle(event, t, locale);
  const content = <>
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
  </>;
  return <li>{event.kind === "custom" && onOpen ? (
    <button type="button" onClick={() => onOpen(event.id)} className="press flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset">{content}</button>
  ) : <div className="flex items-center gap-3 px-4 py-3">{content}</div>}</li>;
}

export function UpcomingCard({ events, action, onOpen }: { events: UpcomingEvent[]; action: ReactNode; onOpen?: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <Card className="mt-4 gap-0 pb-0">
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <h2 className="font-heading text-xl">{t("events.title")}</h2>
        {action}
      </div>
      <ul className="divide-y divide-border">{events.slice(0, 3).map((event, index) => <EventRow key={event.kind === "custom" ? event.id : index} event={event} onOpen={onOpen} />)}</ul>
    </Card>
  );
}
