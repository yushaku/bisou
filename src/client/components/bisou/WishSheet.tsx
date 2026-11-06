import { useOnline } from "@/lib/useOnline";
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import type { Wish, WishPriority } from "../../../shared/types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { focusCreateButton } from "@/lib/useTabNavigation";
import { parseVnd, wishErrorKey, wishSaveBlock } from "@/lib/wishes";
import { MoneyInput } from "./MoneyInput";
import { PhotoPicker } from "./PhotoPicker";
import { useUploadQueue } from "./useUploadQueue";

export function WishSheet({ wish, onClose, onSaved, onSignedOut, fromMenu }: {
  fromMenu?: boolean;
  wish: Wish | null;
  onClose: () => void;
  onSaved: (wish: Wish) => void;
  onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const ids = useId();
  const [title, setTitle] = useState(wish?.title ?? "");
  const [price, setPrice] = useState(formatNumber(wish?.price ?? 0, locale));
  const [link, setLink] = useState(wish?.link ?? "");
  const [priority, setPriority] = useState<WishPriority>(wish?.priority ?? 2);
  const [dirty, setDirty] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useUploadQueue(wish?.photoId ? [wish.photoId] : []);
  const input = { title, price: parseVnd(price) || null, link: link.trim() || null, priority, photoId: queue.items[0]?.photoId ?? null };
  const block = preparing ? "compose.waitPhotos" : wishSaveBlock(input, queue.items);
  const change = () => { setDirty(true); setError(null); };
  const close = () => { if (!saving) { if (dirty) setDiscard(true); else onClose(); } };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!online || block || saving) return;
    setSaving(true);
    const res = wish ? await api.updateWish(wish.id, input) : await api.createWish(input);
    setSaving(false);
    if (res.ok) { queue.saved(); onSaved(res.data.wish); onClose(); }
    else if (res.status === 401) onSignedOut();
    else setError(t(wishErrorKey(res.error?.error)));
  }

  return <>
    <Drawer open onOpenChange={(open) => { if (!open) close(); }} dismissible={!dirty && !saving}>
      <DrawerContent onCloseAutoFocus={(event) => {
        if (fromMenu) { event.preventDefault(); focusCreateButton(); }
      }} aria-describedby={undefined} onEscapeKeyDown={(e) => { e.preventDefault(); close(); }} onPointerDownOutside={(e) => { e.preventDefault(); close(); }}>
        <form onSubmit={(e) => void save(e)} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="flex-row items-center gap-2 px-5 pt-2 pb-3 text-left">
            <DrawerTitle className="flex-1 font-heading text-2xl">{t(wish ? "wish.edit" : "wishes.add")}</DrawerTitle>
            <Button type="button" variant="ghost" size="icon" disabled={saving} aria-label={t("common.close")} onClick={close}><X aria-hidden="true" /></Button>
          </DrawerHeader>
          <fieldset disabled={saving} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
            <Label htmlFor={`${ids}-title`}>{t("wish.title")}</Label>
            <Input id={`${ids}-title`} autoFocus value={title} onChange={(e) => { setTitle(e.target.value); change(); }} aria-invalid={block === "wish.titleInvalid"} />
            <Label htmlFor={`${ids}-price`}>{t("wish.price")}</Label>
            <MoneyInput id={`${ids}-price`} value={price} onValueChange={(value) => { setPrice(value); change(); }} aria-invalid={block === "wish.priceInvalid"} />
            <Label htmlFor={`${ids}-link`}>{t("wish.link")}</Label>
            <Input id={`${ids}-link`} inputMode="url" value={link} onChange={(e) => { setLink(e.target.value); change(); }} aria-invalid={block === "wish.linkInvalid"} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-semibold">{t("wish.priority")}</legend>
              {([1, 2, 3] as const).map((n) => <label key={n} className="flex min-h-11 items-center gap-3 rounded-control border px-3">
                <input type="radio" name={`${ids}-priority`} checked={priority === n} onChange={() => { setPriority(n); change(); }} className="accent-primary" />
                {t(n === 1 ? "wish.priority1" : n === 2 ? "wish.priority2" : "wish.priority3")}
              </label>)}
            </fieldset>
            <PhotoPicker queue={queue} onPreparingChange={setPreparing} max={1} saving={saving} onChange={change} />
          </fieldset>
          <div className="flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-5">
            <p role="alert" className="text-sm text-destructive empty:hidden">{error ?? (dirty && block ? t(block) : null)}</p>
            {!online && <p role="status" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
            <Button type="submit" size="lg" loading={saving} disabled={!online || !!block}>{t("wish.save")}</Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
    <Dialog open={discard} onOpenChange={setDiscard}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("compose.discardTitle")}</DialogTitle><DialogDescription>{t("compose.discardBody")}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="destructive" onClick={onClose}>{t("compose.discard")}</Button><Button autoFocus onClick={() => setDiscard(false)}>{t("compose.keep")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
