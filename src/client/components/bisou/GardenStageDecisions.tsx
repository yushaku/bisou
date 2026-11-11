import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cardById, CARDS, DECKS, LEVEL_IDS, levelRank, type GardenCardState, type RelationshipLevel } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { decisionStatus, type DecisionStatus as Status } from "../../lib/garden";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Skeleton } from "../ui/skeleton";
import { GardenCard } from "./GardenCard";

const ORDER: Record<Status, number> = { turn: 0, open: 1, waiting: 2, done: 3 };
const COLLAPSED = 3;

/* Optional talks before the next stage, answered in place so the Garden never jumps to a plant. */
export function GardenStageDecisions({ stageId, myName, partnerName, memoryScope, onChanged, onSignedOut }: {
  stageId: RelationshipLevel; myName: string; partnerName: string; memoryScope: string;
  onChanged: () => void; onSignedOut: () => void;
}) {
  const { t, locale } = useI18n();
  const next = LEVEL_IDS[levelRank(stageId) + 1];
  const hasQuestions = !!next && CARDS.some((card) => card.kind === "decision" && card.levelId === stageId);
  const [cards, setCards] = useState<GardenCardState[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!hasQuestions) return;
    const result = await api.gardenStageDecisions(stageId);
    if (result.ok) { setCards(result.data.cards); setFailed(false); }
    else if (result.status === 401) onSignedOut();
    else setFailed(true);
  }, [hasQuestions, stageId, onSignedOut]);
  useEffect(() => { void load(); }, [load]);
  if (!hasQuestions) return null;

  const sorted = [...(cards ?? [])].sort((a, b) => ORDER[decisionStatus(a)] - ORDER[decisionStatus(b)]);
  const remaining = sorted.filter((card) => decisionStatus(card) !== "done").length;
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED);
  const active = sorted.find((card) => card.cardId === openId) ?? null;
  const label: Record<Status, string> = {
    turn: t("garden.yourTurnShort"), open: t("garden.notStarted"),
    waiting: t("garden.waiting", { partner: partnerName }), done: t("garden.complete"),
  };

  return <section className="flex flex-col gap-3" aria-labelledby="garden-decisions-title">
    <h2 id="garden-decisions-title" className="font-heading text-xl">{t("garden.stageQuestions", { stage: t(`level.${next}`) })}</h2>
    {!cards && !failed && <Skeleton className="h-40" aria-label={t("loading")} />}
    {failed && <div role="alert" className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted-foreground">{t("garden.loadError")}</p>
      <Button variant="outline" onClick={() => void load()}>{t("journal.retry")}</Button>
    </div>}
    {cards && <>
      <p className="text-sm font-semibold">{remaining ? t("garden.remaining", { n: remaining }) : t("garden.allDiscussed")}</p>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl edge bg-card">
        {shown.map((card) => {
          const status = decisionStatus(card);
          const definition = cardById(card.cardId);
          const deck = DECKS.find((d) => d.id === definition?.deckId);
          return <li key={card.cardId}>
            <button type="button" onClick={() => setOpenId(card.cardId)}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring">
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {deck && <span className="text-xs text-muted-foreground">{deck.name[locale]}</span>}
                <span className={cn("line-clamp-2 text-[15px] leading-snug", status === "done" && "text-muted-foreground")}>{definition?.text[locale]}</span>
                <Badge variant={status === "turn" ? "default" : "secondary"}>
                  {status === "done" && <Check aria-hidden="true" />}{label[status]}
                </Badge>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>;
        })}
      </ul>
      {sorted.length > COLLAPSED && <Button variant="ghost" className="self-center" onClick={() => setExpanded(!expanded)}>
        {expanded ? t("garden.showFewer") : t("garden.showAllDecisions", { n: sorted.length })}
      </Button>}
    </>}

    <Drawer open={!!active} onOpenChange={(open) => { if (!open) setOpenId(null); }}>
      <DrawerContent aria-describedby={undefined}>
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pb-6">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t("garden.stageQuestions", { stage: next ? t(`level.${next}`) : "" })}</DrawerTitle>
          </DrawerHeader>
          {active && <GardenCard card={active} myName={myName} partnerName={partnerName} memoryScope={memoryScope}
            onChanged={() => { onChanged(); void load(); }} onSignedOut={onSignedOut} />}
        </div>
      </DrawerContent>
    </Drawer>
  </section>;
}
