import { useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import { latestDay, toDayString } from "../../../shared/days";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useI18n, type MessageKey } from "@/i18n";
import { formatDay, parseDay } from "@/lib/format";
const FIRST_DAY = new Date(1900, 0, 1);
export function DayField({ value, onChange, now, disabled, label = "compose.day" }: { value: string; onChange: (value: string) => void; now: number; disabled?: boolean; label?: MessageKey }) {
  const { t, locale } = useI18n(), id = useId(), [picking, setPicking] = useState(false), max = latestDay(now);
  return <div className="flex flex-col gap-2"><span id={`${id}-day`} className="font-semibold">{t(label)}</span>
    <Button type="button" variant="outline" className="h-12 justify-start" aria-labelledby={`${id}-day ${id}-value`} aria-describedby={`${id}-help`} disabled={disabled} aria-expanded={picking} aria-controls={`${id}-calendar`} onClick={() => setPicking((v) => !v)}><CalendarDays aria-hidden="true" /><span id={`${id}-value`}>{formatDay(value, locale)}</span></Button>
    {picking && <Calendar id={`${id}-calendar`} mode="single" captionLayout="dropdown" required selected={parseDay(value)} onSelect={(d) => { onChange(toDayString(d)); setPicking(false); }} defaultMonth={parseDay(value)} startMonth={FIRST_DAY} endMonth={parseDay(max)} disabled={[{ before: FIRST_DAY }, { after: parseDay(max) }]} className="edge mx-auto rounded-lg" />}
    <p id={`${id}-help`} className="text-sm text-muted-foreground">{t("compose.dayHelp")}</p>
  </div>;
}
