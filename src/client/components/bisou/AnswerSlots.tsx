import { Heart, Sprout } from "lucide-react";
import type { GardenCardState } from "../../../shared/garden";
import { useI18n } from "../../i18n";

export function AnswerSlots({ card, revealed, myName, partnerName }: { card: GardenCardState; revealed: boolean; myName: string; partnerName: string }) {
  const { t } = useI18n();
  return <div className="grid grid-cols-2 gap-3">
    {[{ text: card.mine, choice: card.mineChoice, deleted: card.mineDeleted, edited: card.mineEdited, name: myName },
      { text: card.partner, choice: card.partnerChoice, deleted: card.partnerDeleted, edited: card.partnerEdited, name: partnerName }].map((slot, index) => (
      <div key={index} className="min-w-0">
        <p className="mb-2 text-center text-sm font-semibold break-words">{revealed ? slot.name : t(index === 0 ? "garden.me" : "garden.partner")}</p>
        {revealed ? <div className="garden-lined min-h-40 rounded-xl edge bg-card p-3">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{slot.deleted ? t("garden.deleted") : slot.choice ? t(`garden.${slot.choice}`) : slot.text}</p>
          {slot.edited && !slot.deleted && <p className="mt-2 text-xs text-muted-foreground">{t("garden.edited")}</p>}
        </div> : index === 0 ? <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl edge bg-accent p-3 elevate-sm">
          <Heart className="size-8 text-primary" aria-hidden="true" /><span className="text-sm">{t("garden.faceDown")}</span>
        </div> : <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input p-3 text-center text-sm text-muted-foreground">
          <Sprout className="size-6" aria-hidden="true" />{t("garden.waiting")}
        </div>}
      </div>
    ))}
  </div>;
}
