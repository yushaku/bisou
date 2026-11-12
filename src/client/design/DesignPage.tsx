import { MASCOTS } from "@/lib/mascots";
import { useEffect, useState, type ReactNode } from "react";
import { isLocale } from "../../shared/types";
import { ThemeControls } from "@/components/bisou/ThemeControls";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { BACKGROUNDS, STYLES, THEMES, type ThemePrefs } from "@/theme/themes";
import { ComponentsSection } from "./ComponentsSection";
import { useDesignT } from "./messages";
import { PrimitivesSection } from "./PrimitivesSection";
import { SampleApp, type SampleScreen } from "./SampleScreens";
import { TokensSection } from "./TokensSection";

const SCREENS: SampleScreen[] = ["home", "journal", "wishes"];

/*
 * URL parameters (used by the screenshot script, handy by hand too):
 *   ?style=journal|soft|sticker  &theme=<palette id>  &bg=linen|plain|paper|dots|hearts
 *   &lang=vi|en  &screen=home|journal|wishes (renders that sample screen alone, full size)
 */
function useUrlParams(): SampleScreen | null {
  const { setPrefs } = useTheme();
  const { setLocale } = useI18n();
  const [screen] = useState<SampleScreen | null>(() => {
    const value = new URLSearchParams(location.search).get("screen");
    return SCREENS.find((s) => s === value) ?? null;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patch: Partial<ThemePrefs> = {};
    const style = STYLES.find((s) => s.id === params.get("style"));
    if (style) patch.style = style.id;
    const theme = THEMES.find((th) => th.id === params.get("theme"));
    if (theme?.kind === "dark") Object.assign(patch, { mode: "dark", darkTheme: theme.id });
    if (theme?.kind === "light") Object.assign(patch, { mode: "light", lightTheme: theme.id });
    const bg = BACKGROUNDS.find((b) => b.id === params.get("bg"));
    if (bg) patch.background = bg.id;
    if (Object.keys(patch).length > 0) setPrefs(patch);
    const lang = params.get("lang");
    if (isLocale(lang)) setLocale(lang);
  }, [setPrefs, setLocale]);

  return screen;
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div>
        <h2 id={id} className="font-heading text-3xl">{title}</h2>
        {intro && <p className="mt-1 text-lg text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const d = useDesignT();
  const { t } = useI18n();
  const screen = useUrlParams();

  if (screen) return <SampleApp initial={screen} />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-24 sm:px-8">
      <header className="grid gap-8 lg:grid-cols-[1fr_26rem] lg:items-start">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl">{d("title")}</h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">{d("intro")}</p>
        </div>
        <Card className="px-5 py-5">
          <h2 className="sr-only">{d("controls")}</h2>
          <ThemeControls />
        </Card>
      </header>

      <Section id="screens" title={d("screens")} intro={d("screensIntro")}>
        <div className="-mx-4 flex snap-x gap-8 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          {SCREENS.map((s) => (
            <figure key={s} className="flex shrink-0 snap-start flex-col gap-3">
              <div
                id={`frame-${s}`}
                className="h-[844px] w-[390px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[2.5rem] border-2 border-input"
              >
                <SampleApp initial={s} framed />
              </div>
              <figcaption className="text-base text-muted-foreground">
                {d(s === "home" ? "screenHome" : s === "journal" ? "screenJournal" : "screenWishes")}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="mascots" title={t("mascot.title")}>
        <div className="grid gap-6 sm:grid-cols-2">
          {MASCOTS.map(mascot => <div key={mascot.id} className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">{t(mascot.name)}</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(mascot.images).map(([situation, src]) => <figure key={situation} className="flex flex-col items-center gap-2 rounded-xl edge bg-card p-3">
                <img src={src} alt="" width={480} height={480} loading="lazy" className="size-28 object-contain" />
                <figcaption className="text-sm text-muted-foreground">{t(`mascot.${situation as keyof typeof mascot.images}`)}</figcaption>
              </figure>)}
            </div>
          </div>)}
        </div>
      </Section>

      <Section id="tokens" title={d("tokens")}>
        <TokensSection />
      </Section>

      <Section id="primitives" title={d("primitives")}>
        <PrimitivesSection />
      </Section>

      <Section id="components" title={d("components")}>
        <ComponentsSection />
      </Section>

      <footer className="text-sm text-muted-foreground">{d("credits")}</footer>
    </div>
  );
}
