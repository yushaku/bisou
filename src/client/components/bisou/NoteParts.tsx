import { NOTE_FIELDS } from "../../../shared/notes";
import type { NoteInput } from "../../../shared/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
export function NoteParts({ note, preview = false }: { note: NoteInput; preview?: boolean }) {
  const { t } = useI18n();
  return (
    <dl className="flex flex-col gap-3">
      {NOTE_FIELDS.map((field) => (
        <div key={field} className="min-w-0">
          <dt className="mb-1 text-sm font-semibold text-muted-foreground">{t(`notes.${field}`)}</dt>
          <dd className={cn("text-base/6 wrap-anywhere whitespace-pre-wrap", preview && "line-clamp-2")}>
            {note[field]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
