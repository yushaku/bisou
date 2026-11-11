import { useId } from "react";
import { NOTE_FIELDS, NOTE_FIELD_MAX } from "../../../shared/notes";
import type { NoteInput } from "../../../shared/types";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { softHints } from "@/lib/notes";
export function NoteFields({ value, onChange, disabled }: { value: NoteInput; onChange: (value: NoteInput) => void; disabled?: boolean }) {
  const { t } = useI18n(), id = useId();
  return <div className="flex flex-col gap-3">{NOTE_FIELDS.map((field) => {
    const length = Array.from(value[field].trim()).length;
    return <div key={field} className="flex flex-col gap-1">
      <label className="font-semibold" htmlFor={`${id}-${field}`}>{t(`notes.${field}`)}</label>
      <Textarea id={`${id}-${field}`} rows={2} className="min-h-12" disabled={disabled} value={value[field]} placeholder={t(`notes.${field}Placeholder`)} aria-invalid={length > NOTE_FIELD_MAX} aria-describedby={`${id}-${field}-hint ${id}-${field}-count`} onChange={(e) => onChange({ ...value, [field]: e.target.value })} />
      <p id={`${id}-${field}-hint`} className="text-sm text-muted-foreground empty:hidden">{softHints(value[field]).length ? t("notes.hint") : ""}</p>
      <p id={`${id}-${field}-count`} className="text-right text-sm text-muted-foreground empty:hidden">{length >= 450 ? t("compose.count", { count: length, max: NOTE_FIELD_MAX }) : ""}</p>
    </div>;
  })}</div>;
}
