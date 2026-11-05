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
  /* Omit to hide the bottom tab bar (screens without destinations yet). */
  tabs?: { active: TabId; onSelect: (tab: TabId) => void };
  children: ReactNode;
  className?: string;
}

/*
 * Phone layout: a top bar under the status bar, scrolling content, and a bottom tab bar
 * in thumb reach above the home indicator. Both bars are sticky, so the shell works in
 * the page scroll and inside the /design phone frames alike.
 */
export function AppShell({ title, onOpenSettings, tabs, children, className }: AppShellProps) {
  const { t } = useI18n();
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-4">
          <BrandMark className="size-6 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-heading text-2xl">{title ?? t("appName")}</span>
          {onOpenSettings && (
            <Button variant="ghost" size="icon" aria-label={t("settings.open")} onClick={onOpenSettings}>
              <Settings />
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-2 pb-4">{children}</main>

      {tabs && (
        <nav
          aria-label={t("nav.label")}
          className="sticky bottom-0 z-30 rounded-t-xl border-t-(length:--edge-width) border-(--edge-color) bg-card elevate pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto grid w-full max-w-md grid-cols-4">
            {TABS.map((id) => {
              const { icon: Icon, label } = TAB_META[id];
              const active = tabs.active === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => tabs.onSelect(id)}
                    className={cn(
                      "press flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-14 items-center justify-center rounded-control",
                        active && "bg-accent text-accent-foreground elevate-sm",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {t(label)}
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
