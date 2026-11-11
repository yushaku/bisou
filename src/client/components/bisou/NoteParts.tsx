import { NOTE_FIELDS } from "../../../shared/notes";
import type { NoteInput } from "../../../shared/types";
import { useI18n } from "@/i18n";
export function NoteParts({ note }: { note: NoteInput }) {
  const { t } = useI18n();
  return <dl className="flex flex-col gap-3">{NOTE_FIELDS.map((field) => <div key={field}><dt className="font-semibold">{t(`notes.${field}`)}</dt><dd className="whitespace-pre-wrap break-words">{note[field]}</dd></div>)}</dl>;
}
