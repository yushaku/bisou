import { useJournal } from "../../lib/useJournal";
import type { Couple, User } from "../../../shared/types";
import { useI18n } from "../../i18n";
import { toCard } from "../../lib/journalCard";
import { toPeople } from "./CoupleAvatars";
import { EntryCard } from "./EntryCard";

/* Home's today preview: only entries dated today; a quiet day shows no section at all. */
export function TodayPosts({ couple, user, today, onSignedOut }: {
  couple: Couple;
  user: User;
  today: string;
  onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const { feed } = useJournal(onSignedOut);

  const posts = feed?.entries.filter((entry) => entry.date === today) ?? [];
  if (posts.length === 0) return null;
  const people = new Map(toPeople(couple.members, user, t).map((person, index) => [couple.members[index]!.id, person]));
  return <section aria-labelledby="today-posts" className="mt-5 flex flex-col gap-3">
    <h2 id="today-posts" className="font-heading text-xl">{t("home.todayPosts")}</h2>
    {posts.map((entry) => <EntryCard key={entry.id} entry={toCard(entry, people, t, locale)} showDate={false} />)}
  </section>;
}
