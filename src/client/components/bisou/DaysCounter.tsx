import { CalendarHeart } from "lucide-react";
import couple from "@/assets/couple.webp";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { daysBetween, formatDay, formatNumber, nextAnniversary, parseDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Person } from "./CoupleAvatars";

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
    <Card className={cn("gap-0 p-2", className)}>
      <div className="rounded-lg border border-dashed border-primary/40 px-3 pt-4 pb-3">
        {people && <span className="sr-only">{people.map((person) => person.name).join(" & ")}</span>}
        <div className="relative flex min-h-32 items-center">
          <div className="relative z-10 w-[57%]">
            <p className="font-heading text-5xl leading-none tabular-nums sm:text-6xl">{formatNumber(days, locale)}</p>
            <p className="mt-2 text-lg font-semibold">{t("days.unit")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("days.since", { date: formatDay(startDate, locale, "numeric") })}</p>
          </div>
          <img src={couple} alt="" width={640} height={466} className="absolute -right-5 bottom-0 h-36 w-[66%] max-w-56 object-contain object-bottom" />
        </div>
        <p className="mt-3 flex items-start gap-2 border-t border-border/70 pt-3 text-sm text-pretty">
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
      </div>
    </Card>
  );
}
