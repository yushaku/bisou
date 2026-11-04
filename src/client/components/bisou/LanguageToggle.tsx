import { isLocale, LOCALES, type Locale } from "../../../shared/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/i18n";

/* Language codes are the same in both languages; the autonym is the accessible name. */
const LABELS: Record<Locale, { code: string; name: string }> = {
  vi: { code: "VI", name: "Tiếng Việt" },
  en: { code: "EN", name: "English" },
};

export function LanguageToggle({ onChange, className }: { onChange?: (locale: Locale) => void; className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={1}
      value={locale}
      aria-label={t("language")}
      className={className}
      onValueChange={(value) => {
        if (!isLocale(value) || value === locale) return;
        setLocale(value);
        onChange?.(value);
      }}
    >
      {LOCALES.map((l) => (
        <ToggleGroupItem key={l} value={l} aria-label={LABELS[l].name} lang={l} className="min-w-11">
          {LABELS[l].code}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
