import { useEffect, useId, useState } from "react";
import { Heart, LockKeyhole, PencilLine, Star } from "lucide-react";
import { cardById, DECKS, type ResponseChoice, type GardenCardState, type GardenState } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { cardPhase, gardenQuestion, flipKey, gardenSeen, rememberGarden } from "../../lib/garden";
import { formatDay } from "../../lib/format";
import { useOnline } from "../../lib/useOnline";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { GardenScene } from "./GardenScene";
import { AnswerSlots } from "./AnswerSlots";

/* The stitched line that turns the card into a folded note between two people. */
function StitchDivider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("flex items-center gap-2.5 text-primary/50", className)}>
    <span className="h-px flex-1 border-t border-dashed border-current" />
    <Heart className="size-3" />
    <span className="h-px flex-1 border-t border-dashed border-current" />
  </div>;
}

export function GardenCard({ card, myName, partnerName, memoryScope, onChanged, onSignedOut, onFlip, variant = "deck" }: {
  card: GardenCardState; myName: string; partnerName: string; memoryScope: string;
  onChanged: () => void; onSignedOut: () => void; onFlip?: () => void;
  /* "today" is the soft paper card on Home; the Garden deck keeps the shared card. */
  variant?: "deck" | "today";
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const id = useId();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<ResponseChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memoryKey = flipKey(memoryScope, card);
  const [revealedKey, setRevealedKey] = useState(() => gardenSeen(memoryKey) ? memoryKey : null);
  const [animating, setAnimating] = useState(false);
  const revealed = revealedKey === memoryKey || gardenSeen(memoryKey);
  useEffect(() => {
    const sync = () => { if (gardenSeen(memoryKey)) setRevealedKey(memoryKey); };
    window.addEventListener("storage", sync);
    window.addEventListener("bisou:garden-seen", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("bisou:garden-seen", sync); };
  }, [memoryKey]);
  const [watering, setWatering] = useState<GardenState | null>(null);
  const [confirm, setConfirm] = useState(false);
  const phase = cardPhase(card);
  const definition = cardById(card.cardId);
  const hasMine = card.mine !== null || card.mineChoice != null;
  const deck = DECKS.find((d) => d.id === cardById(card.cardId)?.deckId);
  const today = variant === "today";

  async function save(remove = false) {
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    const result = await (remove ? api.deleteGardenAnswer(card.cardId) : (hasMine || card.mineDeleted) ? api.editGardenAnswer(card.cardId, choice ? { choice } : { text }) : api.answerGarden(card.cardId, choice ? { choice } : { text }));
    setBusy(false);
    if (!result.ok) {
      if (result.status === 401) return onSignedOut();
      setError(t(result.error?.error === "answer_too_long" ? "garden.tooLong" : result.error?.error === "invalid_answer" ? "garden.invalidAnswer" : "error.generic"));
      return;
    }
    setWriting(false);
    setConfirm(false);
    onChanged();
  }
  async function toggleStar() {
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    const result = await (card.starred ? api.unstarGarden(card.cardId) : api.starGarden(card.cardId));
    setBusy(false);
    if (!result.ok) {
      if (result.status === 401) return onSignedOut();
      setError(t("error.generic"));
      return;
    }
    onChanged();
  }
  async function flip() {
    if (gardenSeen(memoryKey)) return;
    rememberGarden(memoryKey);
    setRevealedKey(memoryKey);
    setAnimating(true);
    if (onFlip) { onFlip(); return; }
    if (definition?.kind === "decision") return;
    const result = await api.garden();
    if (!result.ok && result.status === 401) { onSignedOut(); return; }
    if (result.ok && result.data.today?.cardId === card.cardId && card.flippedDay === result.data.day) setWatering(result.data);
  }
  function write() { setText(card.mine ?? ""); setChoice(card.mineChoice ?? null); setWriting(true); setError(null); }

  return <article aria-labelledby={`${id}-question`} className={today ? "flex flex-col gap-2.5" : "flex flex-col gap-3"}>
    {!today && <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Heart className="size-4 text-primary" aria-hidden="true" />{deck?.name[locale] ?? t("garden.title")}{definition && <span>· {t(`level.${definition.levelId}`)}</span>}</p>}
    <Card className={today ? "gap-0 p-1.5" : "gap-0 p-2"}>
      <div className={today ? "today-frame rounded-[calc(var(--radius-xl)-0.2rem)] border border-dashed border-primary/40 px-4 pt-5 pb-4" : "rounded-lg border border-dashed border-primary/40 p-4"}>
        {today && <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground">
          <Heart className="size-3.5 text-primary" aria-hidden="true" />
          {deck?.name[locale] ?? t("garden.title")}
          {definition && <span aria-hidden="true">·</span>}
          {definition && <span>{t(`level.${definition.levelId}`)}</span>}
        </p>}
        <h2 id={`${id}-question`} className={cn(
          "font-heading",
          today
            ? ["mx-auto mt-4 text-balance text-center leading-[1.35]", writing ? "text-xl" : "text-[1.6rem]"]
            : phase === "open" && !writing ? "py-8 text-center text-2xl" : "mb-4 text-xl"
        )}>{gardenQuestion(card.cardId, locale, t)}</h2>
        {today && <StitchDivider className="my-4" />}
        {writing ? <form className={today ? "flex flex-col gap-4" : "flex flex-col gap-3"} onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {definition?.kind === "decision" && <>
            <fieldset className={cn("flex flex-col gap-2", today && "rounded-lg border border-dashed border-border bg-muted/20 p-3")}><legend className={cn("mb-2 text-sm font-semibold", today && "px-1 text-xs uppercase tracking-[0.14em] text-muted-foreground")}>{t("garden.responseType")}</legend>
              <ToggleGroup type="single" variant="outline" className="w-full flex-wrap justify-start" value={choice ?? "text"} disabled={busy}
                onValueChange={(value) => { if (value) setChoice(value === "text" ? null : value as ResponseChoice); }}>
                {(["text", "no_details", "later_not_applicable"] as const).map((value) => <ToggleGroupItem key={value} value={value} className="min-h-11 rounded-full px-3 text-sm">
                  {t(value === "text" ? "garden.textResponse" : `garden.${value}`)}
                </ToggleGroupItem>)}
              </ToggleGroup>
            </fieldset>
          </>}
          {choice === null && <><label htmlFor={`${id}-answer`} className={today ? "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" : "text-sm font-semibold"}>{t("garden.myAnswer")}</label>
          <Textarea id={`${id}-answer`} autoFocus value={text} onChange={(e) => { setText(e.target.value); setChoice(null); }} disabled={busy} className={cn("garden-lined text-base leading-8", today ? "min-h-44 rounded-[calc(var(--radius)*1.1)] bg-card/80 p-4" : "min-h-48")} /></>}
          {definition?.kind !== "decision" && <p className="flex gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />{t(phase === "flipped" ? "garden.editHint" : "garden.privateHint")}</p>}
          <Button type="submit" size={today ? "lg" : "default"} className={today ? "w-full" : undefined} loading={busy} disabled={!online || (choice === null && !text.trim())}>{t(definition?.kind === "decision" || !hasMine ? "garden.placeDown" : "garden.save")}</Button>
          <Button variant="ghost" type="button" disabled={busy} onClick={() => setWriting(false)}>{t("garden.cancel")}</Button>
        </form> : phase === "open" ? (today ? <div className="flex flex-col gap-3">
          {card.partnerAnswered && <p role="status" className="rounded-xl bg-accent p-3 text-center text-sm font-semibold">{t("garden.partnerAnswered", { partner: partnerName })}</p>}
          <Button size="lg" className="w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button>
          {definition?.kind !== "decision" && <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{t("garden.privateHint")}</span></p>}
        </div> : <Button className="w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button>) : <>
          <div className={animating ? "garden-card-flip" : undefined} onAnimationEnd={() => setAnimating(false)}><AnswerSlots card={card} revealed={revealed && phase === "flipped"} myName={myName} partnerName={partnerName} variant={variant} /></div>
          {phase === "flipped" && !revealed && <Button size={today ? "lg" : "default"} className="mt-4 w-full" onClick={() => void flip()}>{today && <Heart aria-hidden="true" />}{t("garden.flip")}</Button>}
          {revealed && card.flippedDay && <div className={cn("mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-muted-foreground", today ? "text-xs" : "text-sm")}>
            <Heart className={today ? "size-3.5 text-primary/70" : "hidden"} aria-hidden="true" /><time dateTime={card.flippedDay}>{formatDay(card.flippedDay, locale)}</time>
            {definition?.kind === "ordinary" && phase === "flipped" && <Button variant="ghost" size="sm" aria-pressed={card.starred} loading={busy} disabled={!online} onClick={() => void toggleStar()}>
              <Star aria-hidden="true" className={card.starred ? "fill-current text-primary" : undefined} />{t(card.starred ? "garden.unstar" : "garden.star")}
            </Button>}
          </div>}
          {phase === "waiting" && <p role="status" className={cn("mt-3 text-center text-muted-foreground", today ? "mx-auto max-w-[34ch] text-xs leading-relaxed" : "text-sm")}>{t("garden.waiting", { partner: partnerName })}</p>}
        </>}
        {!writing && card.mineDeleted && <Button className="mt-4 w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button>}
        {today && !writing && hasMine && <div className="mt-4 flex items-center justify-center gap-1 border-t border-dashed border-border/70 pt-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={write}><PencilLine aria-hidden="true" />{t("garden.edit")}</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={!online || busy} onClick={() => phase === "flipped" ? setConfirm(true) : void save(true)}>{t("garden.delete")}</Button>
        </div>}
      </div>
    </Card>
    {!today && !writing && hasMine && <div className="flex flex-wrap justify-center gap-2">
      <Button variant="ghost" onClick={write}>{t("garden.edit")}</Button>
      <Button variant="ghost" disabled={!online || busy} onClick={() => phase === "flipped" ? setConfirm(true) : void save(true)}>{t("garden.delete")}</Button>
    </div>}
    {!online && <p className="text-center text-sm text-muted-foreground">{t("offline.save")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {watering && <GardenScene open onClose={() => setWatering(null)} plants={watering.plants} deckName={deck?.name[locale] ?? ""} />}
    <Dialog open={confirm} onOpenChange={(open) => !busy && setConfirm(open)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("garden.deleteTitle")}</DialogTitle><DialogDescription>{t("garden.deleteHint")}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <DialogFooter><Button variant="destructive" loading={busy} disabled={!online} onClick={() => void save(true)}>{t("garden.delete")}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>{t("garden.cancel")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </article>;
}
