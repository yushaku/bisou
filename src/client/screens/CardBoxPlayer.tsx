import { useCallback, useEffect, useRef, useState } from "react";
import type { Couple } from "../../shared/types";
import { api } from "../api";
import { BottomBar } from "../components/bisou/AppShell";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { CardBoxCard } from "../components/bisou/CardBoxCard";
import { Button } from "../components/ui/button";
import { useI18n } from "../i18n";
import { cardBoxEndMessage, cardBoxLoadMessage, readCache, writeCache, nextCard, previousCard, readSeen, writeSeen, type Play } from "../lib/cardBox";
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
  const navigation = useTabNavigation();
  const refresh = useCallback(async () => {
    const res = await api.box(boxId);
    if (!active.current) return;
    if (res.ok) {
      writeCache(scope, `box:${boxId}`, res.data);
      setDetail(res.data); setError(null);
      setPlay(play => res.data.cards.some(card => card.id === play.stack[play.index]) ? play : { stack: [], index: -1, startedOver: false });
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
  const draw = () => { if (!detail) return; const next = nextCard(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen); };
  useEffect(() => {
    if (detail && play.index < 0 && detail.cards.length) {
      const next = nextCard(detail, play, seen); setPlay(next.play); setSeen(next.seen); writeSeen(scope, boxId, next.seen);
    }
  }, [detail, play, seen, scope, boxId]);
  const message = cardBoxLoadMessage(!!detail, online, error);
  const card = detail?.cards.find(card => card.id === play.stack[play.index]);
  return <div className="flex min-h-dvh flex-col"><SubPageHeader title={detail?.box.name[locale] ?? t("cardBox.title")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
      {detail && !detail.box.open && <p className="text-sm text-muted-foreground">{t("cardBox.preview")}</p>}
      {message && <div role="status"><p>{t(`cardBox.${message}`)}</p><Button variant="ghost" onClick={() => void refresh()}>{t("cardBox.retry")}</Button></div>}
      <div aria-live="polite" aria-atomic="true">{card ? <div className="flex flex-col gap-4"><CardBoxCard card={card} />{play.startedOver && <p>{t(cardBoxEndMessage(detail!.box.open))}</p>}</div> : !message && <p>{t(detail ? "cardBox.notFound" : "cardBox.opening")}</p>}</div>
      {card && <div className="mt-auto grid grid-cols-2 gap-3"><Button variant="secondary" disabled={play.index <= 0} onClick={() => setPlay(previousCard(play))}>{t("cardBox.previous")}</Button><Button onClick={draw}>{t("cardBox.next")}</Button></div>}
    </main><BottomBar active="home" {...navigation} />
  </div>;
}
