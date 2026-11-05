import { Dices, ExternalLink, Gift, RotateCcw } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import type { SpinWish } from "../../../shared/types";
import { api, photoUrl } from "@/api";
import pouch from "@/assets/wish-pouch.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { formatNumber, formatVnd } from "@/lib/format";
import { parseVnd } from "@/lib/wishes";
import { cn } from "@/lib/utils";

export type SpinState = { step: "idle" | "spinning" | "empty" } | { step: "result"; wish: SpinWish };

interface SpinCardProps {
  partnerName: string;
  initialBudget?: number;
  initialState?: SpinState;
  onSpin?: typeof api.spin;
  onClaim?: typeof api.claim;
  onSignedOut?: () => void;
  onViewClaims?: () => void;
  className?: string;
}

export function SpinCard({ partnerName, initialBudget, initialState, onSpin = api.spin, onClaim = api.claim, onSignedOut, onViewClaims, className }: SpinCardProps) {
  const { t, locale } = useI18n();
  const budgetId = useId();
  const [budget, setBudget] = useState(initialBudget ? formatNumber(initialBudget, locale) : "");
  const [state, setState] = useState<SpinState>(initialState ?? { step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (retryAt === null) return;
    const timer = setTimeout(() => setRetryAt(null), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);

  async function spin(e?: FormEvent) {
    e?.preventDefault();
    if (state.step === "spinning" || claiming || retryAt !== null) return;
    const amount = parseVnd(budget);
    if (amount === null || !Number.isSafeInteger(amount) || amount <= 0) { setError(t("spin.invalidBudget")); return; }
    setState({ step: "spinning" }); setError(null); setClaimed(false);
    const res = await onSpin(amount);
    if (res.ok) setState(res.data.wish ? { step: "result", wish: res.data.wish } : { step: "empty" });
    else {
      setState({ step: "idle" });
      if (res.status === 401) onSignedOut?.();
      else if (res.status === 429 && res.error?.retryAfter) setRetryAt(Date.now() + res.error.retryAfter * 1000);
      else setError(t("spin.error"));
    }
  }

  async function claim() {
    if (state.step !== "result" || claiming || claimed) return;
    setClaiming(true); setError(null);
    const res = await onClaim(state.wish.id);
    setClaiming(false);
    if (res.ok) setClaimed(true);
    else if (res.status === 401) onSignedOut?.();
    else if (res.status === 404 || res.status === 409) { setState({ step: "idle" }); setError(t("spin.unavailable")); }
    else setError(t("error.generic"));
  }

  const spinning = state.step === "spinning";
  return <Card className={cn("gap-4 px-5 py-5", className)}>
    <div><h2 className="font-heading text-2xl">{t("spin.title")}</h2><p className="mt-1 text-muted-foreground">{t("spin.hint", { name: partnerName })}</p></div>
    <form onSubmit={(e) => void spin(e)} className="flex flex-col gap-2">
      <Label htmlFor={budgetId}>{t("spin.budget")}</Label>
      <div className="flex flex-wrap gap-2">
        <Input id={budgetId} inputMode="numeric" autoComplete="off" disabled={spinning || claiming} value={budget} placeholder={formatNumber(500000, locale)} className="min-w-40 flex-1 text-lg tabular-nums"
          onChange={(e) => { setBudget(e.target.value); setError(null); }} onBlur={() => { const n = parseVnd(budget); if (n && Number.isSafeInteger(n) && n > 0) setBudget(formatNumber(n, locale)); }} />
        <Button type="submit" loading={spinning} disabled={claiming || retryAt !== null}><Dices aria-hidden="true" />{t(spinning ? "spin.spinning" : "spin.spin")}</Button>
      </div>
    </form>
    {retryAt !== null && <p role="status" className="rounded-lg bg-muted p-3">{t("spin.limit", { time: new Date(retryAt).toLocaleString(locale) })}</p>}
    <p role="alert" className="text-destructive empty:hidden">{error}</p>
    <div aria-live="polite">
      {(state.step === "idle" || spinning) && <img src={pouch} alt="" className={cn("mx-auto size-32 object-contain", spinning && "animate-pulse motion-reduce:animate-none")} />}
      {state.step === "result" && <div className="flex flex-col gap-3 animate-in fade-in duration-(--duration) motion-reduce:animate-none">
        <p className="text-sm font-semibold text-muted-foreground">{t("spin.result")}</p>
        <div className="edge flex items-center gap-3 rounded-lg bg-muted p-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-card">
            {state.wish.photoId ? <img src={photoUrl(state.wish.photoId, "thumb")} alt={state.wish.title} className="size-full object-cover" /> : <Gift className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1"><h3 className="font-semibold">{state.wish.title}</h3><p className="font-heading text-lg tabular-nums">{formatVnd(state.wish.price, locale)}</p></div>
          {state.wish.link && <Button asChild variant="ghost" size="icon"><a href={state.wish.link} target="_blank" rel="noreferrer noopener" aria-label={t("wish.openLink")}><ExternalLink aria-hidden="true" /></a></Button>}
        </div>
        {claimed ? <><p>{t("spin.claimed")}</p>{onViewClaims && <Button onClick={onViewClaims}>{t("claims.title")}</Button>}</> : <Button loading={claiming} onClick={() => void claim()}><Gift aria-hidden="true" />{t("spin.claim")}</Button>}
        <Button variant="outline" disabled={claiming || retryAt !== null} onClick={() => void spin()}><RotateCcw aria-hidden="true" />{t("spin.again")}</Button>
        <p className="text-sm text-muted-foreground">{t("spin.secret", { name: partnerName })}</p>
      </div>}
      {state.step === "empty" && <p className="rounded-lg bg-muted p-3">{t("spin.empty")}</p>}
    </div>
  </Card>;
}
