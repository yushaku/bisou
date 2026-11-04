import { Cake, Gift, Heart, House, MapPin, Plane, Sparkles, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Icons a milestone can carry; stored by name so the data stays plain. */
export const MILESTONE_ICONS = {
  heart: Heart,
  place: MapPin,
  trip: Plane,
  home: House,
  gift: Gift,
  birthday: Cake,
  spark: Sparkles,
} satisfies Record<string, LucideIcon>;
export type MilestoneIcon = keyof typeof MILESTONE_ICONS;

export interface Milestone {
  id: string;
  date: string;
  title: string;
  icon: MilestoneIcon;
  note?: string;
}

/* One row of the milestone timeline: a marker on the rail, then the date and the title. */
export function MilestoneItem({ milestone, last = false, className }: { milestone: Milestone; last?: boolean; className?: string }) {
  const { locale } = useI18n();
  const Icon = MILESTONE_ICONS[milestone.icon];
  return (
    <li className={cn("relative flex gap-4 pb-6 last:pb-0", className)}>
      {!last && <span aria-hidden="true" className="absolute top-11 bottom-0 left-[1.3125rem] w-0.5 bg-border" />}
      <span className="edge-ink elevate-sm relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-muted-foreground">
          <time dateTime={milestone.date}>{formatDay(milestone.date, locale)}</time>
        </p>
        <h3 className="font-heading text-lg leading-snug">{milestone.title}</h3>
        {milestone.note && <p className="mt-1 text-base text-muted-foreground">{milestone.note}</p>}
      </div>
    </li>
  );
}
