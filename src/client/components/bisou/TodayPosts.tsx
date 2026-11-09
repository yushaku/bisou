import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Couple, JournalEntry, User } from "../../../shared/types";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { toCard } from "../../lib/journalCard";
import { TabMemory } from "../../lib/tabMemory";
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
  const memory = useContext(TabMemory);
  const [entries, setEntries] = useState<JournalEntry[] | null>(() => memory?.journal?.entries ?? null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    const result = await api.journal();
    if (version !== request.current) return;
    if (result.ok) setEntries(result.data.entries);
    else if (result.status === 401) onSignedOut();
  }, [onSignedOut]);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      ++request.current;
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [refresh]);

  const posts = entries?.filter((entry) => entry.date === today) ?? [];
  if (posts.length === 0) return null;
  const people = new Map(toPeople(couple.members, user, t).map((person, index) => [couple.members[index]!.id, person]));
  return <section aria-labelledby="today-posts" className="mt-5 flex flex-col gap-3">
    <h2 id="today-posts" className="font-heading text-xl">{t("home.todayPosts")}</h2>
    {posts.map((entry) => <EntryCard key={entry.id} entry={toCard(entry, people, t, locale)} showDate={false} />)}
  </section>;
}
