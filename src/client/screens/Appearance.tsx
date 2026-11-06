import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { ThemeControls } from "../components/bisou/ThemeControls";
import { useI18n } from "../i18n";

/* Full screen page under Settings: a page scrolls on iPhone where a tall sheet fought its drag to close. */
export function Appearance() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <SubPageHeader title={t("settings.appearance")} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
        <p className="text-sm text-muted-foreground">{t("settings.appliesImmediately")}</p>
        <ThemeControls paletteByMode />
      </main>
    </div>
  );
}
