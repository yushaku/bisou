import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Button } from "../ui/button";
import { JournalDetailSheet } from "./JournalDetailSheet";
import { useJournal } from "../../lib/useJournal";
import type { Couple, User } from "../../../shared/types";
import { useI18n } from "../../i18n";
import { formatDay } from "../../lib/format";
import { toCard } from "../../lib/journalCard";
import { toPeople } from "./CoupleAvatars";
import { EntryCard } from "./EntryCard";

/* Home's today preview: only entries dated today; a quiet day shows no section at all. */
export function TodayPosts({
  couple,
  user,
  today,
  onSignedOut,
}: {
  couple: Couple;
  user: User;
  today: string;
  onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const { feed } = useJournal(onSignedOut);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = feed?.entries.find((entry) => entry.id === detailId && entry.note);

  const posts = feed?.entries.filter((entry) => entry.date === today) ?? [];
  if (posts.length === 0) return null;
  const people = new Map(toPeople(couple.members, user, t).map((person, index) => [couple.members[index]!.id, person]));
  return (
    <section aria-labelledby="today-posts" className="mt-5 flex flex-col gap-3">
      <h2 id="today-posts" className="font-heading text-xl">
        {t("home.todayPosts")}
      </h2>
      {posts.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={toCard(entry, people, t, locale)}
          showDate={false}
          onOpen={entry.note ? () => setDetailId(entry.id) : undefined}
        />
      ))}
      <Drawer
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DrawerContent aria-describedby={undefined}>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-5 pb-5">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-heading text-xl">{detail ? formatDay(detail.date, locale) : ""}</DrawerTitle>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {detail && <JournalDetailSheet entry={toCard(detail, people, t, locale)} onOpenPhoto={() => {}} />}
            </div>
            <Button variant="ghost" size="lg" onClick={() => setDetailId(null)}>
              {t("common.close")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
