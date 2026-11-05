import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { Locale } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { BACKGROUNDS, DARK_THEMES, LIGHT_THEMES, MODES, STYLES, type Mode, type ThemeDef } from "@/theme/themes";
import { LanguageToggle } from "./LanguageToggle";

const MODE_ICONS: Record<Mode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

function Field({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={id} className="text-sm font-semibold">
        {label}
      </p>
      {children(id)}
    </div>
  );
}

function Swatches({ theme }: { theme: ThemeDef }) {
  // Registry data, not UI colour: each dot previews one token of that theme.
  return (
    <span aria-hidden="true" className="flex -space-x-1.5">
      {theme.swatches.slice(1, 4).map((hex) => (
        <span key={hex} className="size-4 rounded-full ring-2 ring-card" style={{ backgroundColor: hex }} />
      ))}
    </span>
  );
}

/* Every appearance choice; used by the Settings sheet and the /design toolbar. */
export function ThemeControls({ onLocaleChange, showStyle = true, className }: { onLocaleChange?: (l: Locale) => void; showStyle?: boolean; className?: string }) {
  const { t } = useI18n();
  const { prefs, setPrefs } = useTheme();
  const item = "flex-1 basis-0";

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {showStyle && STYLES.length > 1 && (
        <Field label={t("settings.style")}>
          {(id) => (
            <ToggleGroup type="single" variant="outline" spacing={1} className="w-full" aria-labelledby={id} value={prefs.style}
              onValueChange={(v) => { const s = STYLES.find((x) => x.id === v); if (s) setPrefs({ style: s.id }); }}>
              {STYLES.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id} className={item}>{t(s.labelKey)}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </Field>
      )}

      <Field label={t("settings.mode")}>
        {(id) => (
          <ToggleGroup type="single" variant="outline" spacing={1} className="w-full" aria-labelledby={id} value={prefs.mode}
            onValueChange={(v) => { const m = MODES.find((x) => x === v); if (m) setPrefs({ mode: m }); }}>
            {MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              return (
                <ToggleGroupItem key={m} value={m} className={item}>
                  <Icon aria-hidden="true" />
                  {t(`mode.${m}`)}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        )}
      </Field>

      {LIGHT_THEMES.length > 0 && (
        <Field label={t("settings.lightTheme")}>
          {(id) => (
            <ToggleGroup type="single" variant="outline" spacing={1} className="w-full flex-wrap" aria-labelledby={id} value={prefs.lightTheme}
              onValueChange={(v) => { const th = LIGHT_THEMES.find((x) => x.id === v); if (th) setPrefs({ lightTheme: th.id }); }}>
              {LIGHT_THEMES.map((th) => (
                <ToggleGroupItem key={th.id} value={th.id} className={item}><Swatches theme={th} />{th.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </Field>
      )}

      <Field label={t("settings.darkTheme")}>
        {(id) => (
          <ToggleGroup type="single" variant="outline" spacing={1} className="grid w-full grid-cols-2" aria-labelledby={id} value={prefs.darkTheme}
            onValueChange={(v) => { const th = DARK_THEMES.find((x) => x.id === v); if (th) setPrefs({ darkTheme: th.id }); }}>
            {DARK_THEMES.map((th) => (
              <ToggleGroupItem key={th.id} value={th.id} className={cn(item, "flex-col gap-1 py-1.5 h-14")}>
                <Swatches theme={th} />
                {th.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </Field>

      <Field label={t("settings.background")}>
        {(id) => (
          <ToggleGroup type="single" variant="outline" spacing={1} className="grid w-full grid-cols-3" aria-labelledby={id} value={prefs.background}
            onValueChange={(v) => { const b = BACKGROUNDS.find((x) => x.id === v); if (b) setPrefs({ background: b.id }); }}>
            {BACKGROUNDS.map((b) => (
              <ToggleGroupItem key={b.id} value={b.id} className="px-1">{t(b.labelKey)}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </Field>

      <Field label={t("language")}>{() => <LanguageToggle onChange={onLocaleChange} />}</Field>
    </div>
  );
}

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocaleChange?: (l: Locale) => void;
  /* Account actions (log out) go under the appearance controls. */
  children?: ReactNode;
}

export function SettingsSheet({ open, onOpenChange, onLocaleChange, children }: SettingsSheetProps) {
  const { t } = useI18n();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-heading text-2xl">{t("settings.title")}</DrawerTitle>
            <DrawerDescription className="sr-only">{t("settings.appearance")}</DrawerDescription>
          </DrawerHeader>
          <ThemeControls onLocaleChange={onLocaleChange} />
          {children && <div className="mt-6 flex flex-col gap-3 border-t pt-5">{children}</div>}
          <Button variant="outline" className="mt-5 w-full" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
