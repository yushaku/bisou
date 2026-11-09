import { useId, useState } from "react";
import { Heart, LockKeyhole, PencilLine } from "lucide-react";
import { cardById, DECKS, type ResponseChoice, type GardenCardState } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { cardPhase, gardenQuestion } from "../../lib/garden";
import { formatDay } from "../../lib/format";
import { useOnline } from "../../lib/useOnline";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AnswerSlots } from "./AnswerSlots";

/* The stitched line that turns the card into a folded note between two people. */
function StitchDivider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("flex items-center gap-2.5 text-primary/50", className)}>
    <span className="h-px flex-1 border-t border-dashed border-current" />
    <Heart className="size-3" />
    <span className="h-px flex-1 border-t border-dashed border-current" />
  </div>;
}

export function GardenCard({ card, myName, partnerName, onChanged, onSignedOut, onFlip, variant = "deck" }: {
  card: GardenCardState; myName: string; partnerName: string;
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
  const [revealed, setRevealed] = useState(false);
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
    const result = await (remove ? api.deleteGardenAnswer(card.cardId) : hasMine ? api.editGardenAnswer(card.cardId, choice ? { choice } : { text }) : api.answerGarden(card.cardId, choice ? { choice } : { text }));
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
        {definition?.kind === "decision" && <p className={cn("mb-4 text-sm text-muted-foreground", today && "rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs leading-relaxed")}>{t("garden.decisionNotice")}</p>}
        {writing ? <form className={today ? "flex flex-col gap-4" : "flex flex-col gap-3"} onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {definition?.kind === "decision" && <>
            <fieldset className={cn("flex flex-col gap-2", today && "rounded-lg border border-dashed border-border bg-muted/20 p-3")}><legend className={cn("mb-2 text-sm font-semibold", today && "px-1 text-xs uppercase tracking-[0.14em] text-muted-foreground")}>{t("garden.responseType")}</legend>
              {([null, "no_details", "later_not_applicable"] as const).map((value) => <label key={value ?? "text"} className="flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name={`${id}-response`} checked={choice === value} disabled={busy} onChange={() => setChoice(value)} />{t(value ? `garden.${value}` : "garden.textResponse")}
              </label>)}
            </fieldset>
          </>}
          <label htmlFor={`${id}-answer`} className={today ? "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" : "text-sm font-semibold"}>{t("garden.myAnswer")}</label>
          <Textarea id={`${id}-answer`} autoFocus value={text} onChange={(e) => { setText(e.target.value); setChoice(null); }} disabled={busy || choice !== null} className={cn("garden-lined text-base leading-8", today ? "min-h-44 rounded-[calc(var(--radius)*1.1)] bg-card/80 p-4" : "min-h-48")} />
          <p className="flex gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />{t(phase === "flipped" ? "garden.editHint" : definition?.kind === "decision" ? "garden.decisionPrivateHint" : "garden.privateHint")}</p>
          <Button type="submit" size={today ? "lg" : "default"} className={today ? "w-full" : undefined} loading={busy} disabled={!online || (choice === null && !text.trim())}>{t(!hasMine ? "garden.placeDown" : "garden.save")}</Button>
          <Button variant="ghost" type="button" disabled={busy} onClick={() => setWriting(false)}>{t(definition?.kind === "decision" ? "entry.cancel" : "garden.cancel")}</Button>
        </form> : phase === "open" ? (today ? <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button>
          <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{t("garden.privateHint")}</span></p>
        </div> : <Button className="w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button>) : <>
          <AnswerSlots card={card} revealed={revealed && phase === "flipped"} myName={myName} partnerName={partnerName} variant={variant} />
          {phase === "flipped" && !revealed && <Button size={today ? "lg" : "default"} className="mt-4 w-full" onClick={() => { setRevealed(true); onFlip?.(); }}>{today && <Heart aria-hidden="true" />}{t("garden.flip")}</Button>}
          {revealed && card.flippedDay && <p className={cn("mt-3 flex items-center justify-center gap-1.5 text-center text-muted-foreground", today ? "text-xs" : "text-sm")}><Heart className={today ? "size-3.5 text-primary/70" : "hidden"} aria-hidden="true" /><time dateTime={card.flippedDay}>{formatDay(card.flippedDay, locale)}</time></p>}
          {phase === "waiting" && <p role="status" className={cn("mt-3 text-center text-muted-foreground", today ? "mx-auto max-w-[34ch] text-xs leading-relaxed" : "text-sm")}>{t(definition?.kind === "decision" ? "garden.decisionWaitingHint" : "garden.waitingHint")}</p>}
        </>}
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
    <Dialog open={confirm} onOpenChange={(open) => !busy && setConfirm(open)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{t("garden.deleteTitle")}</DialogTitle><DialogDescription>{t("garden.deleteHint")}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <DialogFooter><Button variant="destructive" loading={busy} disabled={!online} onClick={() => void save(true)}>{t("garden.delete")}</Button><Button autoFocus disabled={busy} onClick={() => setConfirm(false)}>{t("garden.cancel")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </article>;
}
