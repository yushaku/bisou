import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queries } from "../lib/queries";
import { ApiQueryError, useApiMutation, useServerQuery } from "../lib/serverQuery";
import type { Couple } from "../../shared/types";
import { api } from "../api";
import { BottomBar } from "../components/bisou/AppShell";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { Celebration } from "../components/bisou/Celebration";
import { Mascot } from "../components/bisou/Mascot";
import { CardBoxGift } from "../components/bisou/CardBoxGift";
import { CardBoxDeck } from "../components/bisou/CardBoxDeck";
import { Button } from "../components/ui/button";
import { useI18n } from "../i18n";
import { cardBoxEndMessage, cardBoxLoadMessage, readCache, writeCache, nextCard, randomCard, previousCard, readSeen, writeSeen, seenCardCount, type Play } from "../lib/cardBox";
import { useOnline } from "../lib/useOnline";
import { useTabNavigation } from "../lib/useTabNavigation";
import type { SessionProps } from "./SignedInShell";
export function CardBoxPlayer({ boxId, couple, user, onSignedOut }: SessionProps & { boxId: string; couple: Couple }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const active = useRef(true);
  const scope = `${couple.id}:${user.id}`;
  const client = useQueryClient();
  const unlockBox = useApiMutation(api.unlockBox, ["boxes"]);
  const cached = useMemo(() => readCache(scope, `box:${boxId}`) ?? undefined, [scope, boxId]);
  const { data: serverDetail, setData: setDetail, error: queryError, refresh } = useServerQuery({ ...queries.box(boxId),
    placeholderData: cached,
  }, onSignedOut);
  const detail = serverDetail ?? cached;
  const [play, setPlay] = useState<Play>({ stack: [], index: -1, startedOver: false });
  const [seen, setSeen] = useState(() => readSeen(scope, boxId));
  const error = queryError ? queryError instanceof ApiQueryError && queryError.status === 404 ? "notFound" : "loadError" : null;
  const [celebrating, setCelebrating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [unlockPending, setUnlockPending] = useState(false);
  const unlocking = useRef(false);
  const navigation = useTabNavigation();
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (!detail) return;
    writeCache(scope, `box:${boxId}`, detail);
    setPlay(play => detail.cards.some(card => card.id === play.stack[play.index]) ? { ...play, startedOver: play.startedOver && !detail.box.open } : { stack: [], index: -1, startedOver: false });
  }, [detail, scope, boxId]);
  const draw = (random = false) => { if (!detail) return; const next = (random ? randomCard : nextCard)(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen); };
  useEffect(() => {
    if (detail && play.index < 0 && !play.startedOver && detail.cards.length) {
      const next = nextCard(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen);
    }
  }, [detail, play, seen, scope, boxId]);
  const unlock = async () => {
    if (!online || unlocking.current) return;
    unlocking.current = true; setUnlockPending(true); setUnlockFailed(false);
    const res = await unlockBox(boxId);
    unlocking.current = false;
    if (!active.current) return;
    setUnlockPending(false);
    if (!res.ok) {
      if (res.status === 401) onSignedOut();
      else setUnlockFailed(true);
      return;
    }
    writeCache(scope, `box:${boxId}`, res.data);
    const boxes = (client.getQueryData(queries.boxes.queryKey)?.boxes ?? readCache(scope, "list"))?.map(box => box.id === boxId ? res.data.box : box);
    if (boxes) { writeCache(scope, "list", boxes); client.setQueryData(queries.boxes.queryKey, { boxes }); }
    setDetail(res.data); setDialogOpen(false); setCelebrating(true);
    const next = nextCard(res.data, play, seen);
    setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen);
  };
  const buying = detail && !detail.box.open && play.startedOver;
  const message = cardBoxLoadMessage(!!detail, online, error);
  const card = detail?.cards.find(card => card.id === play.stack[play.index]);
  return <div className="flex min-h-dvh flex-col overflow-x-clip"><SubPageHeader title={detail?.box.name[locale] ?? t("cardBox.title")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
      {detail && !buying && <p className="text-center text-sm text-muted-foreground tabular-nums">{t(detail.box.open ? "cardBox.seenCount" : "cardBox.previewCount", { seen: seenCardCount(detail, seen), total: detail.cards.length })}</p>}
      {message && <div role="status"><p>{t(`cardBox.${message}`)}</p><Button variant="ghost" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
      {buying ? <CardBoxGift box={detail.box} online={online} dialogOpen={dialogOpen} pending={unlockPending} failed={unlockFailed} onDialogChange={setDialogOpen} onConfirm={() => void unlock()} onPrevious={() => {
        if (play.index >= 0) setPlay({ ...play, startedOver: false });
        else { const next = { stack: seen.filter(id => detail.cards.some(card => card.id === id)), index: 0, startedOver: false }; next.index = next.stack.length - 1; setPlay(next); }
      }} /> : card ? <>
        <CardBoxDeck card={card} boxId={boxId} boxName={detail!.box.name[locale]} adult={detail!.box.adult} previous={detail!.cards.find(card => card.id === play.stack[play.index - 1])} onNext={() => draw()} onRandom={() => draw(true)} onPrevious={() => setPlay(previousCard(play))} />
        {play.startedOver && <p role="status">{t(cardBoxEndMessage(detail!.box.open))}</p>}
      </> : !message && <div role="status">{!detail && <Mascot situation="waiting" />}<p>{t(detail ? "cardBox.notFound" : "cardBox.opening")}</p></div>}
      <Celebration open={celebrating} onOpenChange={setCelebrating} title={t("cardBox.giftReceived")} body={detail?.box.name[locale]} />
    </main><BottomBar active="home" {...navigation} />
  </div>;
}
