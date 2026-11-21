import { defined, noop } from "../../../shared/guards";
import { useRef, useState } from "react";
import { JournalDetailDrawer } from "./JournalDetailDrawer";
import { useJournal } from "../../lib/useJournal";
import type { Couple, User } from "../../../shared/types";
import { useI18n } from "../../i18n";
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
  const [jumpToThread, setJumpToThread] = useState(false);
  const countButton = useRef<HTMLButtonElement | null>(null);
  const openEntry = (id: string, button: HTMLButtonElement | null = null) => {
    countButton.current = button;
    setJumpToThread(!!button);
    setDetailId(id);
  };
  const detail = feed?.entries.find((entry) => entry.id === detailId && entry.note);

  const posts = feed?.entries.filter((entry) => entry.date === today) ?? [];
  if (posts.length === 0) return null;
  const people = new Map(
    toPeople(couple.members, user, t).map((person, index) => [defined(couple.members[index]).id, person]),
  );
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
          onOpen={entry.note ? () => openEntry(entry.id) : undefined}
          onOpenComments={entry.note ? (button) => openEntry(entry.id, button) : undefined}
        />
      ))}
      <JournalDetailDrawer
        entry={detail ? toCard(detail, people, t, locale) : null}
        people={people}
        userId={user.id}
        jumpToThread={jumpToThread}
        onClose={() => setDetailId(null)}
        onReturnFocus={() => {
          countButton.current?.focus({ preventScroll: true });
          countButton.current = null;
        }}
        onOpenPhoto={noop}
        onSignedOut={onSignedOut}
      />
    </section>
  );
}
