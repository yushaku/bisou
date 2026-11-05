import { ArrowLeft, Heart, KeyRound, Share2, Sparkles, TimerOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { normalizePairCode, PAIR_CODE_LENGTH } from "../../shared/pairCode";
import type { ApiError, Couple } from "../../shared/types";
import { api } from "../api";
import couple from "../assets/couple.webp";
import { OtpInput } from "../components/bisou/OtpInput";
import { PageHeader } from "../components/bisou/PageHeader";
import { PairCodeDisplay } from "../components/bisou/PairCodeDisplay";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useI18n, type Translate } from "../i18n";
import { clearJoinCode, joinLink, pendingJoinCode } from "../lib/joinLink";
import { SignedInShell, type SessionProps } from "./SignedInShell";

const POLL_MS = 5000;

type View = "choose" | "waiting" | "enter";

interface PairingProps extends SessionProps {
  /* null, or the caller's couple while still alone. */
  couple: Couple | null;
  onCouple: (couple: Couple | null) => void;
}

function joinError(t: Translate, status: number, error: ApiError | null): string {
  if (status === 0) return t("error.network");
  switch (error?.error) {
    case "pair_code_invalid":
    case "pair_code_expired":
    case "own_pair_code":
    case "already_paired":
    case "couple_full":
      return t(`error.${error.error}`);
    case "rate_limited":
      return t("error.join_rate_limited", { minutes: Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60)) });
    default:
      return t("error.generic");
  }
}

export function Pairing({ couple: current, onCouple, ...session }: PairingProps) {
  const [view, setView] = useState<View>(() => (pendingJoinCode() ? "enter" : current ? "waiting" : "choose"));
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  // Defensive: with no couple there is nothing to wait for.
  const shown: View = view === "waiting" && !current ? "choose" : view;

  async function create() {
    setBusy(true);
    const res = await api.createCouple();
    setBusy(false);
    if (res.ok) {
      onCouple(res.data.couple);
      setView("waiting");
    } else if (res.error?.error === "already_in_couple") {
      // Created from another tab: show that code.
      const again = await api.couple();
      if (again.ok) onCouple(again.data.couple);
      setView("waiting");
    } else toast.error(res.status === 0 ? t("error.network") : t("error.generic"));
  }

  return (
    <SignedInShell {...session}>
      {shown === "choose" && (
        <ChooseView busy={busy} onCreate={() => void create()} onEnter={() => setView("enter")} />
      )}
      {shown === "waiting" && current && (
        <WaitingView couple={current} onCouple={onCouple} onEnter={() => setView("enter")} />
      )}
      {shown === "enter" && <EnterView onCouple={onCouple} onBack={() => setView(current ? "waiting" : "choose")} />}
    </SignedInShell>
  );
}

function ChooseView({ busy, onCreate, onEnter }: { busy: boolean; onCreate: () => void; onEnter: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <img src={couple} alt="" width={640} height={466} className="mx-auto mt-2 h-40 w-56 object-contain" />
      <PageHeader title={t("pairing.title")} description={t("pairing.body")} />
      <Card className="gap-4 px-5 py-5">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {t("pairing.createHint")}
          </p>
          <Button size="lg" loading={busy} onClick={onCreate}>
            {t("pairing.create")}
          </Button>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {t("pairing.or")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <KeyRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {t("pairing.enterHint")}
          </p>
          <Button size="lg" variant="outline" disabled={busy} onClick={onEnter}>
            {t("pairing.enter")}
          </Button>
        </div>
      </Card>
    </>
  );
}

/* Polls GET /api/couple every 5 s, only while the page is visible, until the partner joins. */
function usePartnerPolling(onCouple: (couple: Couple | null) => void) {
  const latest = useRef(onCouple);
  useEffect(() => {
    latest.current = onCouple;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      const res = await api.couple();
      if (res.ok) latest.current(res.data.couple);
    };
    const start = () => {
      if (timer === undefined && document.visibilityState === "visible") timer = setInterval(() => void tick(), POLL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
        start();
      } else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

function WaitingView({
  couple: current,
  onCouple,
  onEnter,
}: {
  couple: Couple;
  onCouple: (couple: Couple | null) => void;
  onEnter: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  usePartnerPolling(onCouple);

  const pending = current.pendingCode;
  const expired = !pending || pending.expiresAt <= now;

  // Flip to the expired state on time, without waiting for the next poll.
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, pending.expiresAt - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [pending]);

  // Only offered once the code has expired; the server refuses while it is still valid.
  async function newCode() {
    setBusy(true);
    const res = await api.newPairCode();
    setBusy(false);
    if (res.ok) {
      setNow(Date.now());
      onCouple(res.data.couple);
    } else if (res.error?.error === "already_paired" || res.error?.error === "code_still_valid") {
      const again = await api.couple();
      if (again.ok) {
        setNow(Date.now());
        onCouple(again.data.couple);
      }
    } else toast.error(res.status === 0 ? t("error.network") : t("error.generic"));
  }

  async function share(code: string) {
    const url = joinLink(code);
    const text = t("pairing.shareText", { code });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("appName"), text, url });
        return;
      } catch (err) {
        // The user closed the share sheet: nothing to do.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success(t("pairing.inviteCopied"));
    } catch {
      toast.error(t("error.generic"));
    }
  }

  return (
    <>
      <PageHeader title={t("pairing.codeTitle")} />
      <Card className="px-5 py-5">
        {!expired && pending ? (
          <PairCodeDisplay code={pending.code} expiresAt={pending.expiresAt}>
            <Button onClick={() => void share(pending.code)}>
              <Share2 aria-hidden="true" />
              {t("pairing.share")}
            </Button>
          </PairCodeDisplay>
        ) : (
          <div className="flex flex-col gap-4">
            <p role="status" className="flex items-center gap-3 text-lg font-semibold text-balance">
              <TimerOff className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
              {t("pairing.expired")}
            </p>
            <Button size="lg" loading={busy} onClick={() => void newCode()}>
              {t("pairing.newCode")}
            </Button>
          </div>
        )}
      </Card>

      {!expired && (
        <p role="status" className="mt-5 flex items-center gap-3 text-base text-pretty text-muted-foreground">
          <Heart className="size-5 shrink-0 animate-pulse text-primary motion-reduce:animate-none" aria-hidden="true" />
          {t("pairing.waiting")}
        </p>
      )}

      <div className="mt-auto flex flex-col pt-10">
        <Button variant="outline" size="lg" disabled={busy} onClick={onEnter}>
          <KeyRound aria-hidden="true" />
          {t("pairing.enterInstead")}
        </Button>
      </div>
    </>
  );
}

function EnterView({ onCouple, onBack }: { onCouple: (couple: Couple | null) => void; onBack: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState(() => pendingJoinCode() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onChange(raw: string) {
    // Keep letters and digits only, uppercase: pasted "abc-def" or "ABC DEF" become "ABCDEF".
    setCode(normalizePairCode(raw).replace(/[^A-Z0-9]/g, "").slice(0, PAIR_CODE_LENGTH));
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== PAIR_CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const res = await api.joinCouple(code);
    setBusy(false);
    if (res.ok) {
      clearJoinCode();
      onCouple(res.data.couple);
      return;
    }
    if (res.error?.error === "already_paired") {
      clearJoinCode();
      const again = await api.couple();
      if (again.ok) {
        onCouple(again.data.couple);
        return;
      }
    }
    setError(joinError(t, res.status, res.error));
    inputRef.current?.focus();
  }

  function back() {
    clearJoinCode();
    onBack();
  }

  return (
    <>
      <div className="-ml-3">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft aria-hidden="true" />
          {t("pairing.back")}
        </Button>
      </div>
      <PageHeader title={t("pairing.enterTitle")} description={t("pairing.enterBody")} />
      <Card className="px-5 py-5">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Label htmlFor="pair-code">{t("pair.title")}</Label>
          <OtpInput
            id="pair-code"
            kind="pairCode"
            ref={inputRef}
            value={code}
            onChange={onChange}
            disabled={busy}
            invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          {error && (
            <p id={errorId} role="alert" className="text-base text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-1" loading={busy} disabled={code.length !== PAIR_CODE_LENGTH}>
            {busy ? t("pairing.joining") : t("pairing.join")}
          </Button>
        </form>
      </Card>
    </>
  );
}
