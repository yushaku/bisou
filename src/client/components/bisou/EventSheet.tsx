import { useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { toDayString } from "../../../shared/days";
import { EVENT_ICONS, validateEvent, type EventIcon } from "../../../shared/events";
import type { Couple, CoupleEvent, CoupleEventInput } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n, type MessageKey } from "@/i18n";
import { formatDay, parseDay } from "@/lib/format";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { EVENT_ICON_COMPONENTS } from "./EventRow";

export function EventSheet({ event, onClose, onCouple, onSignedOut }: {
  event: CoupleEvent | null;
  onClose: () => void;
  onCouple: (couple: Couple | null) => void;
  onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const ids = useId();
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [repeat, setRepeat] = useState<CoupleEventInput["repeat"]>(event?.repeat ?? "once");
  const [icon, setIcon] = useState<EventIcon>(event?.icon ?? "heart");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [opener] = useState(() => document.activeElement);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const today = new Date();
  const todayDay = toDayString(today);
  const parsed = validateEvent({ title, date, repeat, icon }, todayDay, event ?? undefined);
  const errorKey = (code?: string): MessageKey => code === "event_title_invalid" ? "events.titleInvalid"
    : code === "event_date_invalid" ? repeat === "once" ? "events.dateInvalid" : "events.yearlyDateInvalid"
    : code === "too_many_events" ? "events.tooMany" : "error.generic";
  const block = "error" in parsed ? errorKey(parsed.error) : null;
  const change = () => { setDirty(true); setError(null); };
  const close = () => { if (!saving) { if (dirty && error !== "events.gone") setDiscard(true); else onClose(); } };

  async function save(e: FormEvent) {
    e.preventDefault();
    if ("error" in parsed || saving) return;
    setSaving(true);
    const res = event ? await api.updateEvent(event.id, parsed.input) : await api.createEvent(parsed.input);
    setSaving(false);
    if (res.ok) { onCouple(res.data.couple); toast.success(t("events.saved")); onClose(); }
    else if (res.status === 401) onSignedOut();
    else if (res.error?.error === "not_found") {
      setError("events.gone");
      const refreshed = await api.couple();
      if (refreshed.ok) onCouple(refreshed.data.couple);
    } else setError(res.status === 0 ? "error.network" : errorKey(res.error?.error));
  }

  async function remove() {
    if (!event || saving) return;
    setSaving(true);
    const res = await api.deleteEvent(event.id);
    if (res.ok || (!res.ok && res.error?.error === "not_found")) {
      const refreshed = res.ok ? res : await api.couple();
      if (refreshed.ok) onCouple(refreshed.data.couple);
      toast.success(t("events.deleted"));
      onClose();
    } else if (res.status === 401) onSignedOut();
    else { setDeleting(false); setError(res.status === 0 ? "error.network" : errorKey(res.error?.error)); }
    setSaving(false);
  }

  return <>
    <Drawer open onOpenChange={(open) => { if (!open) close(); }} dismissible={!dirty && !saving}>
      <DrawerContent aria-describedby={undefined} onCloseAutoFocus={(e) => {
        e.preventDefault();
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
        else focusCreateButton();
      }}
        onEscapeKeyDown={(e) => { e.preventDefault(); close(); }} onPointerDownOutside={(e) => { e.preventDefault(); close(); }}>
        <form onSubmit={(e) => void save(e)} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="flex-row items-center gap-2 px-5 pt-2 pb-3 text-left">
            <DrawerTitle className="flex-1 font-heading text-2xl">{t(event ? "events.edit" : "events.add")}</DrawerTitle>
            <Button type="button" variant="ghost" size="icon" disabled={saving} aria-label={t("common.close")} onClick={close}><X aria-hidden="true" /></Button>
          </DrawerHeader>
          <fieldset disabled={saving || error === "events.gone"} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
            <Label htmlFor={`${ids}-title`}>{t("events.name")}</Label>
            <Input id={`${ids}-title`} autoFocus={!event} value={title} onChange={(e) => { setTitle(e.target.value); change(); }} aria-invalid={dirty && block === "events.titleInvalid"} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-semibold">{t("events.repeat")}</legend>
              {(["once", "yearly"] as const).map((value) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-control border px-3">
                <input type="radio" name={`${ids}-repeat`} checked={repeat === value} className="accent-primary" onChange={() => {
                  setRepeat(value);
                  if (value === "once" && date < todayDay) setDate("");
                  change();
                }} />{t(`events.${value}`)}
              </label>)}
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-semibold">{t("events.date")}</legend>
              <Calendar mode="single" captionLayout="dropdown" selected={date ? parseDay(date) : undefined}
                onSelect={(d) => { setDate(d ? toDayString(d) : ""); change(); }} defaultMonth={event ? parseDay(event.date) : today}
                startMonth={repeat === "once" ? event && event.date < todayDay ? parseDay(event.date) : today : new Date(1900, 0, 1)} endMonth={new Date(today.getFullYear() + 30, 11, 31)}
                disabled={repeat === "once" ? { before: parseDay(todayDay) } : undefined} className="edge mx-auto rounded-lg" />
              <p className="mt-3 min-h-6 text-center font-semibold" aria-live="polite">{date ? formatDay(date, locale) : ""}</p>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-semibold">{t("events.icon")}</legend>
              <ToggleGroup type="single" value={icon} onValueChange={(value) => { if (value) { setIcon(value as EventIcon); change(); } }} aria-label={t("events.icon")} className="grid w-full grid-cols-4">
                {EVENT_ICONS.map((value) => { const Icon = EVENT_ICON_COMPONENTS[value]; return <ToggleGroupItem key={value} value={value} className="min-h-11" aria-label={t(`events.icons.${value}`)}><Icon aria-hidden="true" /></ToggleGroupItem>; })}
              </ToggleGroup>
            </fieldset>
          </fieldset>
          <div className="flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-[max(--spacing(5),env(safe-area-inset-bottom))]">
            <p role="alert" className="text-sm text-destructive empty:hidden">{error ? t(error) : dirty && block ? t(block) : null}</p>
            <Button type="submit" size="lg" loading={saving} disabled={!!block || error === "events.gone"}>{t("events.save")}</Button>
            {event && <Button type="button" variant="outline" className="text-destructive" disabled={saving || error === "events.gone"} onClick={() => setDeleting(true)}>{t("events.delete")}</Button>}
          </div>
        </form>
      </DrawerContent>
    </Drawer>
    <Dialog open={deleting} onOpenChange={(open) => { if (!saving) setDeleting(open); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("events.deleteTitle", { title: event?.title ?? "" })}</DialogTitle><DialogDescription>{t("events.deleteBody")}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="destructive" loading={saving} onClick={() => void remove()}>{t("events.deleteConfirm")}</Button><Button autoFocus disabled={saving} onClick={() => setDeleting(false)}>{t("events.keep")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={discard} onOpenChange={setDiscard}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("compose.discardTitle")}</DialogTitle><DialogDescription>{t("compose.discardBody")}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="destructive" onClick={onClose}>{t("compose.discard")}</Button><Button autoFocus onClick={() => setDiscard(false)}>{t("compose.keep")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
