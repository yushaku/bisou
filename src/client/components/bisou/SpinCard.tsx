import { Dices, Gift, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { formatNumber, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WishPriority, type Wish } from "./WishCard";

export type SpinState = { step: "idle" } | { step: "spinning" } | { step: "result"; wish: Wish } | { step: "empty" };

interface SpinCardProps {
  partnerName: string;
  /* shortcut: demo wishes are local; production must draw on the server to keep the partner's jar private. */
  wishes: Wish[];
  initialBudget?: number;
  /* Lets /design show a state without clicking. */
  initialState?: SpinState;
  onClaim?: (wish: Wish) => void;
  className?: string;
}

const SPIN_MS = 900;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SpinCard({ partnerName, wishes, initialBudget, initialState, onClaim, className }: SpinCardProps) {
  const { t, locale } = useI18n();
  const budgetId = useId();
  const hintId = useId();
  const [budget, setBudget] = useState(initialBudget ?? 0);
  const [state, setState] = useState<SpinState>(initialState ?? { step: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function spin(e?: FormEvent) {
    e?.preventDefault();
    if (budget <= 0 || state.step === "spinning") return;
    const fits = wishes.filter((w) => w.price <= budget);
    setState({ step: "spinning" });
    timer.current = setTimeout(
      () => {
        const wish = fits[Math.floor(Math.random() * fits.length)];
        setState(wish ? { step: "result", wish } : { step: "empty" });
      },
      reducedMotion() ? 0 : SPIN_MS,
    );
  }

  const spinning = state.step === "spinning";

  return (
    <Card className={cn("gap-4 px-5 py-5", className)}>
      <div>
        <h2 className="font-heading text-2xl">{t("spin.title")}</h2>
        <p id={hintId} className="mt-1 text-base text-muted-foreground">
          {t("spin.hint", { name: partnerName })}
        </p>
      </div>

      <form onSubmit={spin} className="flex flex-col gap-2">
        <Label htmlFor={budgetId}>{t("spin.budget")}</Label>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Input
              id={budgetId}
              inputMode="numeric"
              autoComplete="off"
              disabled={spinning}
              aria-describedby={hintId}
              value={budget > 0 ? formatNumber(budget, locale) : ""}
              placeholder={formatNumber(500000, locale)}
              onChange={(e) => setBudget(Number(e.target.value.replace(/\D/g, "").slice(0, 12)) || 0)}
              className="pr-9 text-lg tabular-nums"
            />
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground">
              ₫
            </span>
          </div>
          <Button type="submit" className="grow" loading={spinning} disabled={budget <= 0}>
            {!spinning && <Dices aria-hidden="true" />}
            {spinning ? t("spin.spinning") : t("spin.spin")}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {state.step === "result" && (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-90 duration-(--duration) ease-(--ease) motion-reduce:animate-none">
            <p className="text-sm font-semibold text-muted-foreground">{t("spin.result")}</p>
            <div className="edge flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="photo-frame shrink-0 [--photo-pad-bottom:var(--photo-pad)]" data-tilt="right">
                <div data-slot="photo" className="relative size-16 overflow-hidden bg-card">
                  {state.wish.photo ? (
                    <img src={state.wish.photo.src} alt={state.wish.photo.alt} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <Gift className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-snug">{state.wish.title}</h3>
                <p className="font-heading text-lg tabular-nums">{formatVnd(state.wish.price, locale)}</p>
                <WishPriority priority={state.wish.priority} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 [&>button]:flex-1">
              <Button disabled={!onClaim} onClick={() => onClaim?.(state.wish)}>
                <Gift aria-hidden="true" />
                {t("spin.claim")}
              </Button>
              <Button variant="outline" onClick={() => spin()}>
                <RotateCcw aria-hidden="true" />
                {t("spin.again")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("spin.secret", { name: partnerName })}</p>
          </div>
        )}
        {state.step === "empty" && <p className="rounded-lg bg-muted p-3 text-base">{t("spin.empty")}</p>}
      </div>
    </Card>
  );
}
