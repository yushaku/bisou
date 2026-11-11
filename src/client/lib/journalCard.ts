import { toDayString } from "../../shared/days";
import type { JournalEntry, Locale } from "../../shared/types";
import { photoUrl } from "../api";
import type { Person } from "../components/bisou/CoupleAvatars";
import type { Entry } from "../components/bisou/EntryCard";
import type { Translate } from "../i18n";
import { noteText } from "./notes";
import { displayName } from "./displayName";
import { formatDay, formatTime } from "./format";

/** The feed card for one entry; Home's today posts reuse it unchanged. */
export function toCard(e: JournalEntry, people: Map<string, Person>, t: Translate, locale: Locale): Entry {
  const time = formatTime(e.createdAt, locale);
  const written = toDayString(new Date(e.createdAt));
  return {
    id: e.id,
    source: e.note ? "note" : e.source,
    parts: e.note,
    reply: e.note ? { person: people.get(e.note.recipientId) ?? { name: displayName(undefined, t), tone: "secondary" }, pick: e.note.pick, line: e.note.line } : undefined,
    date: e.date,
    author: people.get(e.authorId) ?? { name: displayName(undefined, t), tone: "secondary" },
    body: e.note ? noteText(t, e.note) : e.text,
    photos: e.photoIds.map((id, i) => ({
      src: photoUrl(id, "thumb"),
      srcSet: `${photoUrl(id, "thumb")} 480w, ${photoUrl(id, "full")} 1440w`,
      alt: t("entry.photo", { index: i + 1, count: e.photoIds.length }),
    })),
    time,
    // A back-filled entry says when it was really written, so the time is not read as the event's.
    note: written !== e.date ? t("journal.writtenOn", { date: formatDay(written, locale), time }) : undefined,
  };
}
