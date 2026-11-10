import { Heart, Sprout } from "lucide-react";
import type { GardenCardState } from "../../../shared/garden";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";

export function AnswerSlots({ card, revealed, myName, partnerName, variant = "deck" }: {
  card: GardenCardState; revealed: boolean; myName: string; partnerName: string;
  /* "today" turns each answer into a folded paper note on Home. */
  variant?: "deck" | "today";
}) {
  const { t } = useI18n();
  const today = variant === "today";
  const partnerReady = card.partnerAnswered || card.flippedDay !== null;
  return <div className={cn("grid grid-cols-2", today ? "gap-2.5" : "gap-3")}>
    {[{ text: card.mine, choice: card.mineChoice, deleted: card.mineDeleted, edited: card.mineEdited, name: myName },
      { text: card.partner, choice: card.partnerChoice, deleted: card.partnerDeleted, edited: card.partnerEdited, name: partnerName }].map((slot, index) => {
      const ready = index === 0 || partnerReady;
      return <div key={index} className="min-w-0">
        <p className={cn("mb-2 text-center font-semibold break-words", today ? "text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground" : "text-sm")}>{slot.name}</p>
        {revealed ? <div className={cn("rounded-xl bg-card p-3", today ? "today-note min-h-36 border border-border/70" : "garden-lined edge min-h-40")}>
          <p className={cn("whitespace-pre-wrap break-words [overflow-wrap:anywhere]", today && "text-sm leading-7")}>{slot.deleted ? t("garden.deleted") : slot.choice ? t(`garden.${slot.choice}`) : slot.text}</p>
          {slot.edited && !slot.deleted && <p className="mt-2 text-xs text-muted-foreground">{t("garden.edited")}</p>}
        </div> : ready ? <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl text-center", today ? "today-note-ready relative min-h-36 overflow-hidden border border-primary/25 bg-accent/70 p-3" : "min-h-40 gap-3 edge bg-accent p-3 elevate-sm")}>
          <span className={today ? "flex size-9 items-center justify-center rounded-full bg-card/80 shadow-sm" : undefined}><Heart className={cn("text-primary", today ? "size-4" : "size-8")} aria-hidden="true" /></span>
          <span className={today ? "text-xs font-medium" : "text-sm"}>{t("garden.faceDown")}</span>
        </div> : <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-input text-center text-muted-foreground", today ? "min-h-36 gap-2 bg-muted/30 p-3" : "min-h-40 gap-3 p-3 text-sm")}>
          <Sprout className={today ? "size-5" : "size-6"} aria-hidden="true" /><span className={today ? "text-xs" : undefined}>{t("garden.waiting", { partner: partnerName })}</span>
        </div>}
      </div>;
    })}
  </div>;
}
