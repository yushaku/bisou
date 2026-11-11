import { useOnline } from "@/lib/useOnline";
import { BookHeart, Gift, House, Loader2Icon, Mailbox, Plus, Settings, Sprout, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { CreateDestination } from "@/lib/navigation";
import { SettingsRow } from "./SettingsGroup";
import { useI18n, type MessageKey } from "@/i18n";
import { focusCreateButton } from "@/lib/useTabNavigation";
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
  /* The screen's name, shown in the top bar as its h1; without it the bar shows the app name. */
  title?: string;
  onOpenSettings?: () => void;
  /* Top bar control at the right edge, such as a back link. */
  action?: ReactNode;
  /* Omit on onboarding and pairing. */
  tabs?: BottomBarProps;
  onRefresh?: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

/*
 * Phone layout: a top bar under the status bar, scrolling content, and a bottom tab bar
 * in thumb reach above the home indicator. Both bars are sticky, so the shell works in
 * the page scroll and inside the /design phone frames alike.
 */
export function AppShell({ title, onOpenSettings, action, tabs, onRefresh, children, className }: AppShellProps) {
  const { t } = useI18n();
  const online = useOnline();
  const mainRef = useRef<HTMLElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [settling, setSettling] = useState(false);
  const canRefresh = Boolean(tabs && onRefresh);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || !canRefresh || !onRefresh) return;
    setPull(0);
    setRefreshing(false);
    setSettling(false);
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let busy = false;
    let disposed = false;
    const root = document.documentElement;
    const overscroll = root.style.overscrollBehaviorY;
    // The page scrolls, so suppress native refresh on the root rather than main.
    root.style.overscrollBehaviorY = "none";
    const cancel = () => {
      start = null;
      distance = 0;
      setSettling(false);
      if (!busy) setPull(0);
    };
    const begin = (event: TouchEvent) => {
      if (busy || window.scrollY > 0 || event.touches.length !== 1) return;
      if (event.target instanceof Element) {
        if (event.target.closest("button, a, input, textarea, select, [contenteditable], [role=slider]")) return;
        for (let target: Element | null = event.target; target && target !== main; target = target.parentElement) {
          if (target.scrollHeight > target.clientHeight && /auto|scroll/.test(getComputedStyle(target).overflowY)) return;
        }
      }
      const touch = event.touches[0]!;
      start = { x: touch.clientX, y: touch.clientY };
    };
    const move = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) { cancel(); return; }
      const touch = event.touches[0]!;
      const dy = touch.clientY - start.y;
      if (dy <= 0 || Math.abs(touch.clientX - start.x) > dy || !event.cancelable) { cancel(); return; }
      event.preventDefault();
      distance = dy;
      setSettling(false);
      setPull(Math.min(dy / 2, 96));
    };
    const end = (event: TouchEvent) => {
      const ready = event.touches.length === 0 && start !== null && distance >= 80;
      cancel();
      if (!ready || busy) return;
      busy = true;
      setRefreshing(true);
      setPull(48);
      const minimum = new Promise<void>((resolve) => setTimeout(resolve, 300));
      void (async () => {
        try { await onRefresh(); }
        catch { if (!disposed) toast.error(t("error.generic")); }
        finally {
          await minimum;
          busy = false;
          if (!disposed) { setRefreshing(false); setSettling(true); setPull(0); }
        }
      })();
    };
    const scroll = () => { if (window.scrollY > 0) cancel(); };
    main.addEventListener("touchstart", begin, { passive: true });
    main.addEventListener("touchmove", move, { passive: false });
    main.addEventListener("touchend", end);
    main.addEventListener("touchcancel", cancel);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      disposed = true;
      root.style.overscrollBehaviorY = overscroll;
      main.removeEventListener("touchstart", begin);
      main.removeEventListener("touchmove", move);
      main.removeEventListener("touchend", end);
      main.removeEventListener("touchcancel", cancel);
      window.removeEventListener("scroll", scroll);
    };
  }, [canRefresh, onRefresh, t]);

  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)] [view-transition-name:tab-header]">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-4">
          <BrandMark className="size-6 shrink-0" />
          {title
            ? <h1 className="min-w-0 flex-1 truncate font-heading text-2xl">{title}</h1>
            : <span className="min-w-0 flex-1 truncate font-heading text-2xl">{t("appName")}</span>}
          {action}
          {onOpenSettings && (
            <Button id="settings-button" variant="ghost" size="icon" aria-label={t("settings.open")} onClick={onOpenSettings}>
              <Settings />
            </Button>
          )}
        </div>
        <p role="status" className="bg-warning px-4 py-3 text-center text-sm text-warning-foreground empty:py-0">{!online ? t("offline.bar") : ""}</p>
      </header>

      <main ref={mainRef} tabIndex={-1} className="outline-none mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-2 pb-4 [view-transition-name:tab-page]">
        {canRefresh && <div className={cn("flex shrink-0 items-center justify-center overflow-hidden text-muted-foreground motion-reduce:transition-none", settling && "transition-[height] duration-200")} style={{ height: pull }}>
          {pull > 0 && <span role="status" aria-busy={refreshing}>
            <Loader2Icon aria-hidden="true" className={cn("size-5", refreshing && "animate-spin motion-reduce:animate-none")} />
            <span className="sr-only">{t("loading")}</span>
          </span>}
        </div>}
        {children}
      </main>

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
  // Tabs with one create action skip the menu.
  const direct: CreateDestination | null = active === "home" ? "event" : active === "wishes" ? active : null;
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
      <nav aria-label={t("nav.label")} className="liquid-glass sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-3 mt-2 rounded-[1.75rem] [view-transition-name:tab-bar]">
        <ul className="mx-auto grid w-full max-w-md grid-cols-5">
          {TABS.map((id, index) => {
            const { icon: Icon, label } = TAB_META[id];
            const selected = active === id;
            return (
              <Fragment key={id}>
                {index === 2 && <li className="flex items-center justify-center">
                  <Button data-create-button size="icon" className="size-14 -translate-y-3 rounded-full ring-4 ring-[color-mix(in_oklab,var(--card)_55%,transparent)] elevate"
                    aria-label={direct ? t(direct === "event" ? "events.add" : "wishes.add") : t("nav.create")}
                    onClick={() => direct ? onCreate(direct) : setOpen(true)}>
                    <Plus className="size-6" aria-hidden="true" />
                  </Button>
                </li>}
                <li>
                  <button type="button" aria-current={selected ? "page" : undefined}
                    onClick={() => onSelect(id)}
                    className={cn("press flex h-16 w-full items-stretch p-1.5 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset", selected ? "text-foreground" : "text-muted-foreground")}>
                    <span className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
                      {selected && <span aria-hidden="true" className="absolute inset-0 rounded-control bg-accent elevate-sm [view-transition-name:tab-pill]" />}
                      <span className={cn("relative flex flex-col items-center gap-0.5", selected && "text-accent-foreground")} style={{ viewTransitionName: `tab-label-${id}` }}>
                        <Icon className="size-5" aria-hidden="true" />
                        {t(label)}
                      </span>
                    </span>
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      </nav>
      <DrawerContent onCloseAutoFocus={(event) => { event.preventDefault(); focusCreateButton(); }}>
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-heading text-2xl">{t("nav.create")}</DrawerTitle>
            <DrawerDescription className="sr-only">{t(active === "journal" ? "nav.journalCreateHint" : "nav.createHint")}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-hidden rounded-xl edge bg-card divide-y divide-border">
            <DrawerClose asChild>
              <SettingsRow icon={BookHeart} label={t(active === "journal" ? "nav.writeJournal" : "journal.new")} onClick={() => { pending.current = "journal"; }} />
            </DrawerClose>
            <DrawerClose asChild>
              <SettingsRow icon={active === "journal" ? Mailbox : Gift} label={t(active === "journal" ? "nav.writeNote" : "wishes.add")} onClick={() => { pending.current = active === "journal" ? "notes" : "wishes"; }} />
            </DrawerClose>
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>{t("common.close")}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
