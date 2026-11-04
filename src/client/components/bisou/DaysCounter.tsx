import { CalendarHeart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { daysBetween, formatDay, formatNumber, nextAnniversary, parseDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoupleAvatars, type Person } from "./CoupleAvatars";

interface DaysCounterProps {
  /* First day together, "YYYY-MM-DD". */
  startDate: string;
  people?: [Person, Person];
  /* Injected for the /design page and tests; defaults to now. */
  today?: Date;
  className?: string;
}

export function DaysCounter({ startDate, people, today = new Date(), className }: DaysCounterProps) {
  const { t, locale } = useI18n();
  const start = parseDay(startDate);
  // Day one counts as 1, the way couples count it.
  const days = daysBetween(start, today) + 1;
  const next = nextAnniversary(start, today);

  return (
    <Card className={cn("gap-0 px-5 py-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-muted-foreground">{t("days.since", { date: formatDay(startDate, locale) })}</p>
        {people && <CoupleAvatars people={people} size="sm" />}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
        <span className="font-heading text-7xl leading-none tabular-nums">{formatNumber(days, locale)}</span>
        <span className="text-lg font-semibold">{t("days.unit")}</span>
      </p>
      <p className="mt-4 flex items-center gap-2 text-base text-pretty">
        <CalendarHeart className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          {days <= 1
            ? t("days.today")
            : next.daysLeft === 0
              ? t("days.anniversaryToday", { years: next.years })
              : t("days.nextAnniversary", {
                  years: next.years,
                  date: formatDay(next.date, locale, "short"),
                  days: formatNumber(next.daysLeft, locale),
                })}
        </span>
      </p>
    </Card>
  );
}
