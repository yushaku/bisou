import { BookHeart, Gift, House, Settings, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";

export const TABS = ["home", "journal", "wishes", "us"] as const;
export type TabId = (typeof TABS)[number];

const TAB_META: Record<TabId, { icon: LucideIcon; label: MessageKey }> = {
  home: { icon: House, label: "nav.home" },
  journal: { icon: BookHeart, label: "nav.journal" },
  wishes: { icon: Gift, label: "nav.wishes" },
  us: { icon: UsersRound, label: "nav.us" },
};

interface AppShellProps {
  /* Shown in the top bar; the page's own h1 lives in PageHeader. */
  title?: string;
  onOpenSettings?: () => void;
  /* Top bar control at the right edge, such as a back link. */
  action?: ReactNode;
  /* Omit to hide the bottom tab bar. `items` lists the tabs that exist yet (default: all). */
  tabs?: { active: TabId; onSelect: (tab: TabId) => void; items?: readonly TabId[] };
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

      {tabs && (
        <nav
          aria-label={t("nav.label")}
          className="sticky bottom-0 z-30 rounded-t-xl border-t-(length:--edge-width) border-(--edge-color) bg-card elevate pb-[env(safe-area-inset-bottom)] [view-transition-name:tab-bar]"
        >
          <ul
            className="mx-auto grid w-full max-w-md"
            style={{ gridTemplateColumns: `repeat(${(tabs.items ?? TABS).length}, minmax(0, 1fr))` }}
          >
            {(tabs.items ?? TABS).map((id) => {
              const { icon: Icon, label } = TAB_META[id];
              const active = tabs.active === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => tabs.onSelect(id)}
                    className={cn(
                      "press flex h-16 w-full items-center justify-center text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {/* The active pill holds both icon and label; it slides between tabs (tab-pill). */}
                    <span className="relative flex min-w-16 flex-col items-center gap-0.5 px-4 py-1.5">
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-control bg-accent elevate-sm [view-transition-name:tab-pill]"
                        />
                      )}
                      <span
                        className={cn(
                          "relative flex flex-col items-center gap-0.5",
                          active && "text-accent-foreground",
                        )}
                        style={{ viewTransitionName: `tab-label-${id}` }}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        {t(label)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
