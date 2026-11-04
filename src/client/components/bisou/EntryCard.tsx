import { Flag } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PersonAvatar, type Person } from "./CoupleAvatars";
import { PhotoGrid, type Photo } from "./PhotoGrid";

export interface Entry {
  id: string;
  /* "YYYY-MM-DD" */
  date: string;
  author: Person;
  body: string;
  photos: Photo[];
  milestone?: string;
}

/* Long entries clamp to five lines; the toggle only appears when there is more to read. */
const CLAMP_AT = 220;

/* showDate: off in the day feed, where the day heading already says it. */
export function EntryCard({ entry, showDate = true, className }: { entry: Entry; showDate?: boolean; className?: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const long = entry.body.length > CLAMP_AT;

  return (
    <Card className={cn("gap-4 px-4 py-4", className)}>
      <header className="flex items-center gap-3">
        <PersonAvatar person={entry.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{entry.author.name}</p>
          {showDate && (
            <p className="text-sm text-muted-foreground">
              <time dateTime={entry.date}>{formatDay(entry.date, locale, "weekday")}</time>
            </p>
          )}
        </div>
        {entry.milestone && (
          <Badge variant="secondary" className="shrink-0">
            <Flag aria-hidden="true" />
            {t("milestone.label")}
          </Badge>
        )}
      </header>

      {entry.milestone && <h3 className="font-heading text-xl leading-snug">{entry.milestone}</h3>}

      <div>
        <p id={bodyId} className={cn("text-base leading-relaxed whitespace-pre-line", long && !open && "line-clamp-5")}>
          {entry.body}
        </p>
        {long && (
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-9"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("entry.less") : t("entry.more")}
          </Button>
        )}
      </div>

      <PhotoGrid photos={entry.photos} className="px-1 pb-1" />
    </Card>
  );
}
