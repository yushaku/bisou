import { CalendarHeart, PencilLine } from "lucide-react";
import { daysTogether, nextMilestone, toDayString, type Milestone } from "../../../shared/days";
import type { Locale } from "../../../shared/types";
import couple from "@/assets/couple.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n, type Translate } from "@/i18n";
import { formatDay, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Person } from "./CoupleAvatars";

interface DaysCounterProps {
  /* First day together, "YYYY-MM-DD". */
  startDate: string;
  people?: [Person, Person];
  /* Injected for the /design page and tests; defaults to now, read in the device's calendar. */
  today?: Date;
  /* Shows an edit button next to the start date. */
  onEditStartDate?: () => void;
  className?: string;
}

function milestoneText(t: Translate, locale: Locale, m: Milestone): string {
  const date = formatDay(m.date, locale, "short");
  const days = formatNumber(m.daysLeft, locale);
  if (m.kind === "days") {
    const n = formatNumber(m.days, locale);
    if (m.daysLeft === 0) return t("days.hundredToday", { n });
    if (m.daysLeft === 1) return t("days.nextHundredTomorrow", { n });
    return t("days.nextHundred", { n, date, days });
  }
  if (m.daysLeft === 0) return t("days.anniversaryToday", { years: m.years });
  if (m.daysLeft === 1) return t("days.nextAnniversaryTomorrow", { years: m.years });
  return t("days.nextAnniversary", { years: m.years, date, days });
}

export function DaysCounter({ startDate, people, today = new Date(), onEditStartDate, className }: DaysCounterProps) {
  const { t, locale } = useI18n();
  const day = toDayString(today);
  // Day one counts as 1, the way couples count it (see shared/days.ts).
  const days = Math.max(1, daysTogether(startDate, day));
  const next = nextMilestone(startDate, day);

  return (
    <Card className={cn("gap-0 p-2", className)}>
      <div className="rounded-lg border border-dashed border-primary/40 px-3 pt-4 pb-3">
        {people && <span className="sr-only">{people.map((person) => person.name).join(" & ")}</span>}
        <div className="relative flex min-h-32 items-center">
          <div className="relative z-10 w-[57%]">
            <p className="font-heading text-5xl leading-none tabular-nums sm:text-6xl">{formatNumber(days, locale)}</p>
            <p className="mt-2 text-lg font-semibold">{t("days.unit")}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              {t("days.since", { date: formatDay(startDate, locale, "numeric") })}
              {onEditStartDate && (
                <Button variant="ghost" size="icon-sm" className="-my-2" aria-label={t("startDate.edit")} onClick={onEditStartDate}>
                  <PencilLine aria-hidden="true" />
                </Button>
              )}
            </p>
          </div>
          <img src={couple} alt="" width={640} height={466} className="absolute -right-5 bottom-0 h-36 w-[66%] max-w-56 object-contain object-bottom" />
        </div>
        <p className="mt-3 flex items-start gap-2 border-t border-border/70 pt-3 text-sm text-pretty">
          <CalendarHeart className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span>{milestoneText(t, locale, next)}</span>
        </p>
      </div>
    </Card>
  );
}
