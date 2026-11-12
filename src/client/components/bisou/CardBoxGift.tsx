import type { CardBoxSummary } from "../../../shared/cardBox";
import { useI18n } from "../../i18n";
import { formatBoxPrice } from "../../lib/cardBox";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

export function CardBoxGift({ box, online, dialogOpen, pending, failed, onDialogChange, onConfirm, onPrevious }: {
  box: CardBoxSummary; online: boolean; dialogOpen: boolean; pending: boolean; failed: boolean;
  onDialogChange: (open: boolean) => void; onConfirm: () => void; onPrevious: () => void;
}) {
  const { t, locale } = useI18n();
  return <section className="flex flex-col gap-4">
    <img src={box.cover} alt="" width={800} height={1024} className="mx-auto h-64 w-auto max-w-full rounded-xl object-cover" />
    <h2 className="font-heading text-xl">{box.name[locale]}</h2>
    {box.price !== null && <p className="tabular-nums">{formatBoxPrice(box.price, locale)}</p>}
    {!online && <p role="status">{t("cardBox.needsConnection")}</p>}
    <Button disabled={!online} onClick={() => onDialogChange(true)}>{t("cardBox.buy")}</Button>
    <Button variant="ghost" onClick={onPrevious}>{t("cardBox.previous")}</Button>
    <Dialog open={dialogOpen} onOpenChange={onDialogChange}>
      {dialogOpen && <DialogContent showCloseButton={false}>
        <DialogTitle className="sr-only">{box.name[locale]}</DialogTitle>
        <DialogDescription className="text-base text-foreground">{t("cardBox.gift")}</DialogDescription>
        {failed && <p role="alert">{t("cardBox.unlockError")}</p>}
        {!online && <p role="status">{t("cardBox.needsConnection")}</p>}
        <Button disabled={!online} loading={pending} onClick={onConfirm}>{t("cardBox.getGift")}</Button>
      </DialogContent>}
    </Dialog>
  </section>;
}
