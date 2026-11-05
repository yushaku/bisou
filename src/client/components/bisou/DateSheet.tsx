import { useEffect, useState } from "react";
import { toDayString } from "../../../shared/days";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/i18n";
import { formatDay, parseDay } from "@/lib/format";

interface DateSheetProps {
  title: string;
  hint: string;
  saveLabel: string;
  firstMonth: Date;
  emptyMonth?: Date;
  onRemove?: () => Promise<string | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* Current value, "YYYY-MM-DD", or null when not set yet. */
  value: string | null;
  /* Resolves to an error message, or null on success (the sheet then closes). */
  onSave: (day: string) => Promise<string | null>;
}

/* Bottom sheet with a month calendar; days after the device's today cannot be picked. */
export function DateSheet({ open, onOpenChange, value, onSave, title, hint, saveLabel, firstMonth, emptyMonth, onRemove }: DateSheetProps) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Date | undefined>(value ? parseDay(value) : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();

  useEffect(() => {
    if (open) {
      setSelected(value ? parseDay(value) : undefined);
      setError(null);
    }
  }, [open, value]);

  async function save(remove = false) {
    if (!remove && !selected) return;
    setBusy(true);
    setError(null);
    const message = remove ? await onRemove!() : await onSave(toDayString(selected!));
    setBusy(false);
    if (message) setError(message);
    else onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-md flex-col overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-heading text-2xl">{title}</DrawerTitle>
            <DrawerDescription className="text-base">{hint}</DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              setError(null);
            }}
            defaultMonth={selected ?? emptyMonth ?? today}
            startMonth={firstMonth}
            endMonth={today}
            disabled={{ after: today }}
            className="edge mx-auto rounded-lg"
          />
          <p className="mt-3 min-h-6 text-center text-base font-semibold" aria-live="polite">
            {selected ? formatDay(selected, locale) : ""}
          </p>
          {error && (
            <p role="alert" className="mt-1 text-center text-base text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="mt-3" loading={busy} disabled={!selected || busy} onClick={() => void save()}>
            {saveLabel}
          </Button>
          {value && onRemove && <Button variant="outline" className="mt-3 text-destructive" disabled={busy} onClick={() => void save(true)}>
            {t("birthday.remove")}
          </Button>}
          <Button variant="outline" className="mt-3" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
