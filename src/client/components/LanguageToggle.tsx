import { LOCALES, type Locale } from "../../shared/types";
import { useI18n } from "../i18n";

const LABELS: Record<Locale, string> = { vi: "VI", en: "EN" };

export function LanguageToggle({ onChange }: { onChange?: (locale: Locale) => void }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("language")} className="inline-flex rounded-full bg-surface0 p-1 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => {
            setLocale(l);
            onChange?.(l);
          }}
          className={
            "rounded-full px-3 py-1 font-semibold transition-colors " +
            (l === locale ? "bg-accent text-on-accent" : "text-subtext0")
          }
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
