import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Couple } from "../../shared/types";
import { api } from "../api";
import { BottomBar } from "../components/bisou/AppShell";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { TabMemory } from "../lib/tabMemory";
import { CardBoxGift } from "../components/bisou/CardBoxGift";
import { CardBoxDeck } from "../components/bisou/CardBoxDeck";
import { Button } from "../components/ui/button";
import { useI18n } from "../i18n";
import { cardBoxEndMessage, cardBoxLoadMessage, readCache, writeCache, nextCard, randomCard, previousCard, readSeen, writeSeen, type Play } from "../lib/cardBox";
import { useOnline } from "../lib/useOnline";
import { useTabNavigation } from "../lib/useTabNavigation";
import type { SessionProps } from "./SignedInShell";
export function CardBoxPlayer({ boxId, couple, user, onSignedOut }: SessionProps & { boxId: string; couple: Couple }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const active = useRef(true);
  const scope = `${couple.id}:${user.id}`;
  const [detail, setDetail] = useState(() => readCache(scope, `box:${boxId}`));
  const [play, setPlay] = useState<Play>({ stack: [], index: -1, startedOver: false });
  const [seen, setSeen] = useState(() => readSeen(scope, boxId));
  const [error, setError] = useState<"notFound" | "loadError" | null>(null);
  const memory = useContext(TabMemory);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [unlockPending, setUnlockPending] = useState(false);
  const unlocking = useRef(false);
  const navigation = useTabNavigation();
  const refresh = useCallback(async () => {
    const res = await api.box(boxId);
    if (!active.current) return;
    if (res.ok) {
      writeCache(scope, `box:${boxId}`, res.data);
      setDetail(res.data); setError(null);
      setPlay(play => res.data.cards.some(card => card.id === play.stack[play.index]) ? { ...play, startedOver: play.startedOver && !res.data.box.open } : { stack: [], index: -1, startedOver: false });
    }
    else if (res.status === 401) onSignedOut();
    else setError(res.status === 404 ? "notFound" : "loadError");
  }, [boxId, onSignedOut, scope]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible); window.addEventListener("online", visible);
    return () => { active.current = false; document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", visible); };
  }, [refresh]);
  const draw = (random = false) => { if (!detail) return; const next = (random ? randomCard : nextCard)(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen); };
  useEffect(() => {
    if (detail && play.index < 0 && !play.startedOver && detail.cards.length) {
      const next = nextCard(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen);
    }
  }, [detail, play, seen, scope, boxId]);
  const unlock = async () => {
    if (!online || unlocking.current) return;
    unlocking.current = true; setUnlockPending(true); setUnlockFailed(false);
    const res = await api.unlockBox(boxId);
    unlocking.current = false;
    if (!active.current) return;
    setUnlockPending(false);
    if (!res.ok) {
      if (res.status === 401) onSignedOut();
      else setUnlockFailed(true);
      return;
    }
    writeCache(scope, `box:${boxId}`, res.data);
    const boxes = (memory?.boxes ?? readCache(scope, "list"))?.map(box => box.id === boxId ? res.data.box : box);
    if (boxes) { writeCache(scope, "list", boxes); if (memory) memory.boxes = boxes; }
    setDetail(res.data); setDialogOpen(false);
    const next = nextCard(res.data, play, seen);
    setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen);
  };
  const buying = detail && !detail.box.open && play.startedOver;
  const message = cardBoxLoadMessage(!!detail, online, error);
  const card = detail?.cards.find(card => card.id === play.stack[play.index]);
  return <div className="flex min-h-dvh flex-col overflow-x-clip"><SubPageHeader title={detail?.box.name[locale] ?? t("cardBox.title")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
      {detail && !detail.box.open && !buying && <p className="text-sm text-muted-foreground">{t("cardBox.preview")}</p>}
      {message && <div role="status"><p>{t(`cardBox.${message}`)}</p><Button variant="ghost" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
      {buying ? <CardBoxGift box={detail.box} online={online} dialogOpen={dialogOpen} pending={unlockPending} failed={unlockFailed} onDialogChange={setDialogOpen} onConfirm={() => void unlock()} onPrevious={() => {
        if (play.index >= 0) setPlay({ ...play, startedOver: false });
        else { const next = { stack: seen.filter(id => detail.cards.some(card => card.id === id)), index: 0, startedOver: false }; next.index = next.stack.length - 1; setPlay(next); }
      }} /> : card ? <>
        <CardBoxDeck card={card} boxId={boxId} boxName={detail!.box.name[locale]} adult={detail!.box.adult} previous={detail!.cards.find(card => card.id === play.stack[play.index - 1])} onNext={() => draw()} onRandom={() => draw(true)} onPrevious={() => setPlay(previousCard(play))} />
        {play.startedOver && <p role="status">{t(cardBoxEndMessage(detail!.box.open))}</p>}
      </> : !message && <p>{t(detail ? "cardBox.notFound" : "cardBox.opening")}</p>}
    </main><BottomBar active="home" {...navigation} />
  </div>;
}
