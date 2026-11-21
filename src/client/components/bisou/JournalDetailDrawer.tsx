import { formatDay } from "@/lib/format";
import { useI18n } from "@/i18n";
import { Ellipsis, X } from "lucide-react";
import { useCallback, useRef, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import type { Person } from "./CoupleAvatars";
import type { Entry } from "./EntryCard";
import { JournalComments } from "./JournalComments";
import { JournalDetailSheet } from "./JournalDetailSheet";

export function JournalDetailDrawer({
  entry,
  userId,
  people,
  jumpToThread = false,
  onClose,
  onReturnFocus,
  onOpenPhoto,
  onOpenOptions,
  onSignedOut,
  children,
}: {
  entry: Entry | null;
  userId: string;
  people: ReadonlyMap<string, Person>;
  jumpToThread?: boolean;
  onClose: () => void;
  onReturnFocus?: () => void;
  onOpenPhoto: (index: number) => void;
  onOpenOptions?: () => void;
  onSignedOut: () => void;
  children?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const title = useRef<HTMLHeadingElement>(null);

  const trackSheet = useCallback((sheet: HTMLDivElement | null) => {
    const viewport = window.visualViewport;
    if (!sheet || !viewport) return;

    let width = viewport.width;
    let restingHeight = viewport.height;
    let keyboard = false;

    const update = () => {
      if (viewport.scale !== 1) return;
      const focused = sheet.contains(document.activeElement) && document.activeElement instanceof HTMLTextAreaElement;
      if (Math.abs(width - viewport.width) > 1) {
        width = viewport.width;
        restingHeight = Math.max(viewport.height, document.documentElement.clientHeight);
        keyboard = false;
      }
      if (!focused && !keyboard) restingHeight = viewport.height;
      const layoutHeight = document.documentElement.clientHeight;
      const visibleBottom = viewport.offsetTop + viewport.height;
      const inset = Math.max(0, layoutHeight - visibleBottom);
      // Keep the dock in place until the keyboard's closing resize finishes.
      keyboard = (focused || keyboard) && Math.max(restingHeight - viewport.height, inset) > 100;
      if (keyboard) {
        sheet.style.setProperty("--journal-sheet-height", `calc(${viewport.height}px - env(safe-area-inset-top))`);
        sheet.style.setProperty("--journal-sheet-bottom", `${inset}px`);
        sheet.style.setProperty("--journal-sheet-safe-area", "0px");
        sheet.dataset.keyboard = "open";
      } else {
        reset(sheet);
      }
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    sheet.addEventListener("focusin", update);
    sheet.addEventListener("focusout", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      sheet.removeEventListener("focusin", update);
      sheet.removeEventListener("focusout", update);
      reset(sheet);
    };
  }, []);

  return (
    <Drawer open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        ref={trackSheet}
        className="group/journal-detail"
        style={{
          maxHeight: "var(--journal-sheet-height, min(80dvh, calc(100dvh - env(safe-area-inset-top))))",
          bottom: "var(--journal-sheet-bottom, 0px)",
          paddingBottom: "var(--journal-sheet-safe-area, env(safe-area-inset-bottom))",
        }}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          title.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={
          onReturnFocus &&
          ((event) => {
            event.preventDefault();
            onReturnFocus();
          })
        }
      >
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="flex shrink-0 flex-row items-center gap-2 px-5 py-2 text-left">
            <DrawerTitle ref={title} tabIndex={-1} className="min-w-0 flex-1 font-heading text-xl outline-none">
              {entry ? formatDay(entry.date, locale) : ""}
            </DrawerTitle>
            {onOpenOptions && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("entry.options", { name: entry?.author.name ?? "", time: entry?.time ?? "" })}
                onClick={onOpenOptions}
              >
                <Ellipsis aria-hidden="true" />
              </Button>
            )}
            <Button size="icon" variant="ghost" aria-label={t("common.close")} onClick={onClose}>
              <X aria-hidden="true" />
            </Button>
          </DrawerHeader>
          {entry && (
            <JournalComments
              key={entry.id}
              entryId={entry.id}
              userId={userId}
              people={people}
              jumpToThread={jumpToThread}
              onSignedOut={onSignedOut}
            >
              <JournalDetailSheet entry={entry} onOpenPhoto={onOpenPhoto} />
            </JournalComments>
          )}
        </div>
        {children}
      </DrawerContent>
    </Drawer>
  );
}

function reset(sheet: HTMLElement) {
  sheet.style.removeProperty("--journal-sheet-height");
  sheet.style.removeProperty("--journal-sheet-bottom");
  sheet.style.removeProperty("--journal-sheet-safe-area");
  delete sheet.dataset.keyboard;
}
