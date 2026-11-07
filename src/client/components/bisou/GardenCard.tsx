import { useId, useState } from "react";
import { Heart, LockKeyhole, PencilLine } from "lucide-react";
import { cardById, DECKS, type GardenCardState } from "../../../shared/garden";
import { api } from "../../api";
import { useI18n } from "../../i18n";
import { cardPhase, gardenQuestion } from "../../lib/garden";
import { formatDay } from "../../lib/format";
import { useOnline } from "../../lib/useOnline";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AnswerSlots } from "./AnswerSlots";

export function GardenCard({ card, myName, partnerName, onChanged, onSignedOut, onFlip }: {
  card: GardenCardState; myName: string; partnerName: string;
  onChanged: () => void; onSignedOut: () => void; onFlip?: () => void;
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const id = useId();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const phase = cardPhase(card);
  const deck = DECKS.find((d) => d.id === cardById(card.cardId)?.deckId);

  async function save(remove = false) {
    if (busy || !online) return;
    setBusy(true);
    setError(null);
    const result = await (remove ? api.deleteGardenAnswer(card.cardId) : card.mine !== null ? api.editGardenAnswer(card.cardId, text) : api.answerGarden(card.cardId, text));
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
  function write() { setText(card.mine ?? ""); setWriting(true); setError(null); }

  return <article aria-labelledby={`${id}-question`} className="flex flex-col gap-3">
    <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Heart className="size-4 text-primary" aria-hidden="true" />{deck?.name[locale] ?? t("garden.title")}</p>
    <Card className="gap-0 p-2">
      <div className="rounded-lg border border-dashed border-primary/40 p-4">
        <h2 id={`${id}-question`} className={`${phase === "open" && !writing ? "py-8 text-center text-2xl" : "mb-4 text-xl"} font-heading`}>{gardenQuestion(card.cardId, locale, t)}</h2>
        {writing ? <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label htmlFor={`${id}-answer`} className="text-sm font-semibold">{t("garden.myAnswer")}</label>
          <Textarea id={`${id}-answer`} autoFocus value={text} onChange={(e) => setText(e.target.value)} disabled={busy} className="garden-lined min-h-48 text-base leading-8" />
          <p className="flex gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />{t(phase === "flipped" ? "garden.editHint" : "garden.privateHint")}</p>
          <Button type="submit" loading={busy} disabled={!online || !text.trim()}>{t(card.mine === null ? "garden.placeDown" : "garden.save")}</Button>
          <Button variant="ghost" type="button" disabled={busy} onClick={() => setWriting(false)}>{t("garden.cancel")}</Button>
        </form> : phase === "open" ? <Button className="w-full" onClick={write}><PencilLine aria-hidden="true" />{t("garden.write")}</Button> : <>
          <AnswerSlots card={card} revealed={revealed && phase === "flipped"} myName={myName} partnerName={partnerName} />
          {phase === "flipped" && !revealed && <Button className="mt-4 w-full" onClick={() => { setRevealed(true); onFlip?.(); }}>{t("garden.flip")}</Button>}
          {revealed && card.flippedDay && <p className="mt-3 text-center text-sm text-muted-foreground"><time dateTime={card.flippedDay}>{formatDay(card.flippedDay, locale)}</time></p>}
          {phase === "waiting" && <p role="status" className="mt-3 text-center text-sm text-muted-foreground">{t("garden.waitingHint")}</p>}
        </>}
      </div>
    </Card>
    {!writing && card.mine !== null && <div className="flex flex-wrap justify-center gap-2">
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
