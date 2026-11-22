import { Flag, Gift, MessageCircle } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import type { NoteInput } from "../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PersonAvatar, type Person } from "./CoupleAvatars";
import { NoteParts } from "./NoteParts";
import { NoteReply, type Reply } from "./NoteReply";
import { PhotoGrid, type Photo } from "./PhotoGrid";

export interface Entry {
  id: string;
  /* "YYYY-MM-DD" */
  date: string;
  author: Person;
  body: string;
  photos: Photo[];
  commentCount?: number;
  milestone?: string;
  source?: "partner" | "wish" | "note";
  parts?: NoteInput;
  reply?: Reply;
  /* Time written, beside the author ("22:00"). */
  time?: string;
  /* A quiet line under the body, such as when a back-filled entry was written. */
  note?: string;
}

/* Long entries clamp to five lines; the toggle only appears when there is more to read. */
const CLAMP_AT = 220;

/*
 * showDate: off in the day feed, where the day heading already says it. id: lets the feed scroll
 * to and focus the card. actions: an optional control at the header's end.
 * onOpenPhoto: makes each photo a button that opens the viewer.
 */
export function EntryCard({
  entry,
  showDate = true,
  id,
  actions,
  onOpenPhoto,
  onOpen,
  onOpenComments,
  className,
}: {
  entry: Entry;
  showDate?: boolean;
  id?: string;
  actions?: ReactNode;
  onOpen?: (restoreFocus: () => void) => void;
  onOpenComments?: (restoreFocus: () => void) => void;
  onOpenPhoto?: (index: number) => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const cardOpener = useRef<HTMLButtonElement>(null);
  const restoreFocusFrom = (opener: HTMLButtonElement) => () => {
    (opener.isConnected ? opener : cardOpener.current)?.focus({ preventScroll: true });
  };
  const parts = entry.parts;
  const long = entry.body.length > CLAMP_AT;

  return (
    <Card
      id={id}
      tabIndex={id ? -1 : undefined}
      className={cn("relative gap-4 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring", className)}
    >
      {onOpen && (
        <button
          type="button"
          className="absolute inset-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring"
          aria-label={t("entry.open", { name: entry.author.name, time: entry.time ?? "" })}
          ref={cardOpener}
          onClick={(event) => onOpen(restoreFocusFrom(event.currentTarget))}
        />
      )}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <PersonAvatar person={entry.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold">{entry.author.name}</span>
            {entry.time && <span className="text-sm text-muted-foreground tabular-nums">{entry.time}</span>}
            {entry.source === "note" && <Badge variant="secondary">{t("entry.fromNote")}</Badge>}
          </p>
        </div>
        {showDate && (
          <time dateTime={entry.date} className="text-sm text-muted-foreground">
            {formatDay(entry.date, locale, "numeric")}
          </time>
        )}
        {entry.source === "wish" && (
          <Badge variant="secondary">
            <Gift aria-hidden="true" />
            {t("entry.fromWish")}
          </Badge>
        )}
        {entry.milestone && (
          <Badge variant="secondary" className="shrink-0">
            <Flag aria-hidden="true" />
            {t("milestone.label")}
          </Badge>
        )}
        <div className="relative">{actions}</div>
      </header>
      {entry.milestone && <h3 className="font-heading text-xl/snug">{entry.milestone}</h3>}
      {parts ? (
        <NoteParts note={parts} preview={!!onOpen} />
      ) : (
        entry.body && (
          <div>
            <p
              id={bodyId}
              className={cn("text-base/relaxed wrap-anywhere whitespace-pre-line", long && !open && "line-clamp-5")}
            >
              {entry.body}
            </p>
            {long && (
              <Button
                variant="link"
                size="sm"
                className="relative mt-1 h-9"
                aria-expanded={onOpen ? undefined : open}
                aria-controls={onOpen ? undefined : bodyId}
                onClick={onOpen ? (event) => onOpen(restoreFocusFrom(event.currentTarget)) : () => setOpen((v) => !v)}
              >
                {open ? t("entry.less") : t("entry.more")}
              </Button>
            )}
          </div>
        )
      )}

      {entry.reply && <NoteReply reply={entry.reply} preview={!!onOpen} />}
      {parts && onOpen && (
        <Button
          variant="link"
          className="relative h-11 self-start"
          onClick={(event) => onOpen(restoreFocusFrom(event.currentTarget))}
        >
          {t("entry.more")}
        </Button>
      )}
      <PhotoGrid photos={entry.photos} onOpen={onOpenPhoto} className="relative px-1" />
      {!!entry.commentCount &&
        (onOpenComments ? (
          <Button
            type="button"
            variant="ghost"
            className="relative self-start text-muted-foreground tabular-nums"
            aria-label={t("comments.countLabel", { count: entry.commentCount })}
            onClick={(event) => onOpenComments(restoreFocusFrom(event.currentTarget))}
          >
            <MessageCircle aria-hidden="true" />
            <span aria-hidden="true">{entry.commentCount}</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="pointer-events-none self-start">
            <MessageCircle aria-hidden="true" />
            <span className="sr-only">{t("comments.countLabel", { count: entry.commentCount })}</span>
            <span aria-hidden="true">{entry.commentCount}</span>
          </Badge>
        ))}
    </Card>
  );
}
