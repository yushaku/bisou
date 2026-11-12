import { useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { cardById, DECKS, type GardenCardState } from "../../../shared/garden";
import type { Couple, User } from "../../../shared/types";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { gardenQuestion, starredHere } from "../../lib/garden";
import { TabMemory } from "../../lib/tabMemory";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Skeleton } from "../ui/skeleton";
import { AnswerSlots } from "./AnswerSlots";
import { EmptyState } from "./EmptyState";
import { GardenCard } from "./GardenCard";

type Props = { couple: Couple; user: User; onSignedOut: () => void };

export function StarredCard({ card, myName, partnerName, onOpen }: {
  card: GardenCardState; myName: string; partnerName: string; onOpen: () => void;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const deck = DECKS.find(deck => deck.id === cardById(card.cardId)?.deckId);
  return <Card className="relative gap-3 p-4">
    <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Heart className="size-4 text-primary" aria-hidden="true" />{deck?.name[locale]}</p>
    <h3 id={id} className="font-heading text-xl">{gardenQuestion(card.cardId, locale, t)}</h3>
    <AnswerSlots card={card} revealed clamp variant="today" myName={myName} partnerName={partnerName} />
    <button type="button" aria-labelledby={id} onClick={onOpen} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring" />
  </Card>;
}

export function StarredBlock({ couple, user, onSignedOut, full = false }: Props & { full?: boolean }) {
  const { t } = useI18n();
  const memory = useContext(TabMemory);
  const scope = `${couple.id}:${user.id}`;
  const [cards, setCards] = useState<GardenCardState[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, setSeenVersion] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    const result = await api.gardenStars();
    if (version !== request.current) return;
    if (result.ok) { setCards(result.data.cards); setFailed(false); }
    else if (result.status === 401) onSignedOut();
    else setFailed(true);
  }, [onSignedOut]);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const seen = () => setSeenVersion(version => version + 1);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    window.addEventListener("bisou:garden-seen", seen);
    window.addEventListener("storage", seen);
    return () => {
      ++request.current;
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      window.removeEventListener("bisou:garden-seen", seen);
      window.removeEventListener("storage", seen);
    };
  }, [refresh]);
  const shown = starredHere(cards ?? [], scope);
  const active = shown.find(card => card.cardId === openId);
  useEffect(() => { if (openId && !active) setOpenId(null); }, [openId, active]);
  const myName = user.displayName?.trim() || t("garden.me");
  const partnerName = couple.members.find(member => member.id !== user.id)?.displayName?.trim() || t("garden.partner");
  if (!full && !shown.length) return null;
  return <section aria-labelledby={full ? undefined : "starred-title"} className={full ? "flex flex-col gap-3" : "mt-5 flex flex-col gap-3"}>
    {!full && <div className="flex items-center justify-between gap-3"><h2 id="starred-title" className="font-heading text-xl">{t("home.starred")}</h2>
      {shown.length > 3 && <Button asChild variant="ghost" size="sm"><Link id="stars-see-all" href="/stars" state={{ from: "/" }} onClick={() => {
        if (memory) { memory.scroll.set("home", window.scrollY); memory.returnFocus = "stars-see-all"; }
      }}>{t("home.seeAll")}</Link></Button>}
    </div>}
    {failed && <div role="alert" className="flex flex-col items-start gap-2"><p>{t("garden.loadError")}</p><Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></div>}
    {full && !cards && !failed && <Skeleton className="h-72 w-full" aria-label={t("loading")} />}
    {full && cards && !failed && !shown.length && <EmptyState title={t("home.starredEmpty")} />}
    {(full ? shown : shown.slice(0, 3)).map(card => <StarredCard key={card.cardId} card={card} myName={myName} partnerName={partnerName} onOpen={() => setOpenId(card.cardId)} />)}
    <Drawer open={!!active} onOpenChange={open => { if (!open) setOpenId(null); }}>
      <DrawerContent aria-describedby={undefined}>
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
          <DrawerHeader className="sr-only"><DrawerTitle>{t("home.starred")}</DrawerTitle></DrawerHeader>
          {active && <GardenCard key={active.cardId} card={active} myName={myName} partnerName={partnerName} memoryScope={scope} onChanged={() => void refresh()} onSignedOut={onSignedOut} />}
        </div>
      </DrawerContent>
    </Drawer>
  </section>;
}
