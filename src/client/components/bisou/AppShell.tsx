import { BookHeart, Gift, House, Plus, Settings, Sprout, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { CreateDestination } from "@/lib/navigation";
import { SettingsRow } from "./SettingsGroup";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";

export const TABS = ["home", "journal", "wishes", "garden"] as const;
export type TabId = (typeof TABS)[number];

const TAB_META: Record<TabId, { icon: LucideIcon; label: MessageKey }> = {
  home: { icon: House, label: "nav.home" },
  journal: { icon: BookHeart, label: "nav.journal" },
  wishes: { icon: Gift, label: "nav.wishes" },
  garden: { icon: Sprout, label: "nav.garden" },
};

interface AppShellProps {
  /* Shown in the top bar; the page's own h1 lives in PageHeader. */
  title?: string;
  onOpenSettings?: () => void;
  /* Top bar control at the right edge, such as a back link. */
  action?: ReactNode;
  /* Omit on onboarding and pairing. */
  tabs?: BottomBarProps;
  children: ReactNode;
  className?: string;
}

/*
 * Phone layout: a top bar under the status bar, scrolling content, and a bottom tab bar
 * in thumb reach above the home indicator. Both bars are sticky, so the shell works in
 * the page scroll and inside the /design phone frames alike.
 */
export function AppShell({ title, onOpenSettings, action, tabs, children, className }: AppShellProps) {
  const { t } = useI18n();
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)] [view-transition-name:tab-header]">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-4">
          <BrandMark className="size-6 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-heading text-2xl">{title ?? t("appName")}</span>
          {action}
          {onOpenSettings && (
            <Button variant="ghost" size="icon" aria-label={t("settings.open")} onClick={onOpenSettings}>
              <Settings />
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-2 pb-4 [view-transition-name:tab-page]">{children}</main>

      {tabs && <BottomBar {...tabs} />}
    </div>
  );
}

interface BottomBarProps {
  active?: TabId;
  onSelect: (tab: TabId) => void;
  onCreate: (destination: CreateDestination) => void;
}

export function BottomBar({ active, onSelect, onCreate }: BottomBarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Open the editor after the menu closes, unless the user has left this screen.
  const pending = useRef<CreateDestination | null>(null);
  useEffect(() => () => { pending.current = null; }, []);
  return (
    <Drawer open={open} onOpenChange={setOpen} onAnimationEnd={(isOpen) => {
      if (!isOpen && pending.current) {
        const destination = pending.current;
        pending.current = null;
        onCreate(destination);
      }
    }}>
      <nav aria-label={t("nav.label")} className="sticky bottom-0 z-30 rounded-t-xl border-t-(length:--edge-width) border-(--edge-color) bg-card elevate pb-[env(safe-area-inset-bottom)] [view-transition-name:tab-bar]">
        <ul className="mx-auto grid w-full max-w-md grid-cols-5">
          {TABS.map((id, index) => {
            const { icon: Icon, label } = TAB_META[id];
            const selected = active === id;
            const garden = id === "garden";
            return (
              <Fragment key={id}>
                {index === 2 && <li className="flex items-center justify-center">
                  <DrawerTrigger asChild>
                    <Button size="icon" className="size-14 -translate-y-3 rounded-full ring-4 ring-card elevate" aria-label={t("nav.create")}>
                      <Plus className="size-6" aria-hidden="true" />
                    </Button>
                  </DrawerTrigger>
                </li>}
                <li>
                  <button type="button" aria-current={selected ? "page" : undefined}
                    aria-disabled={garden || undefined} tabIndex={garden ? -1 : undefined}
                    onClick={() => garden ? toast.info(t("nav.gardenHint")) : onSelect(id)}
                    className={cn("press flex h-16 w-full items-center justify-center text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset", selected ? "text-foreground" : "text-muted-foreground")}>
                    <span className="relative flex min-w-0 flex-col items-center gap-0.5 px-1 py-0.5">
                      {selected && <span aria-hidden="true" className="absolute inset-0 rounded-control bg-accent elevate-sm [view-transition-name:tab-pill]" />}
                      <span className={cn("relative flex flex-col items-center gap-0.5", selected && "text-accent-foreground")} style={{ viewTransitionName: `tab-label-${id}` }}>
                        <Icon className="size-5" aria-hidden="true" />
                        {t(label)}
                        {garden && <span className="text-xs font-normal">{t("nav.soon")}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      </nav>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-heading text-2xl">{t("nav.create")}</DrawerTitle>
            <DrawerDescription className="sr-only">{t("nav.createHint")}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-hidden rounded-xl edge bg-card divide-y divide-border">
            <DrawerClose asChild>
              <SettingsRow icon={BookHeart} label={t("journal.new")} onClick={() => { pending.current = "journal"; }} />
            </DrawerClose>
            <DrawerClose asChild>
              <SettingsRow icon={Gift} label={t("wishes.add")} onClick={() => { pending.current = "wishes"; }} />
            </DrawerClose>
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>{t("common.close")}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
