import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { Button } from "@/components/ui/button";
import { useI18n, type Translate } from "@/i18n";
import { cn } from "@/lib/utils";

interface PairCodeDisplayProps {
  /* 6 characters from the no look-alike alphabet (no 0/O, 1/I/L). */
  code: string;
  expiresInMinutes?: number;
  /* Epoch ms; the expiry line counts down in whole hours, then minutes under 1 hour. */
  expiresAt?: number;
  /* Extra actions shown next to the copy button (for example Share). */
  children?: ReactNode;
  className?: string;
}

const MINUTE = 60_000;
const TICK_MS = 15_000;

function minutesLeft(expiresInMinutes: number | undefined, expiresAt: number | undefined, now: number): number | undefined {
  if (expiresAt !== undefined) return Math.max(1, Math.ceil((expiresAt - now) / MINUTE));
  return expiresInMinutes;
}

function expiryText(t: Translate, minutes: number): string {
  // Whole hours rounded down, so the line never promises more time than is left.
  const hours = Math.floor(minutes / 60);
  if (hours >= 2) return t("pair.expiresHours", { hours });
  if (hours === 1) return t("pair.expiresHour");
  return minutes === 1 ? t("pair.expiresMinute") : t("pair.expiresMinutes", { minutes });
}

export function PairCodeDisplay({ code, expiresInMinutes, expiresAt, children, className }: PairCodeDisplayProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const minutes = minutesLeft(expiresInMinutes, expiresAt, now);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Keeps the remaining time current while the code is on screen.
  useEffect(() => {
    if (expiresAt === undefined) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t("pair.copied"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("error.generic"));
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-sm font-semibold text-muted-foreground">{t("pair.title")}</p>
      <p className="sr-only">{code.split("").join(" ")}</p>
      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {code.split("").map((char, i) => (
          <span
            key={i}
            className="edge-control elevate-sm flex aspect-[4/5] items-center justify-center rounded-control bg-card font-heading text-4xl tabular-nums"
          >
            {char}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-base text-balance">{t("pair.send")}</p>
        {minutes !== undefined && (
          <p className="text-sm text-pretty text-muted-foreground">{expiryText(t, minutes)}</p>
        )}
      </div>
      {/* Buttons share the row; when the labels do not fit, each takes a full row instead of leaving a gap. */}
      <div className="flex flex-wrap gap-2 *:flex-1">
        <Button variant="outline" onClick={() => void copy()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t("pair.copied") : t("pair.copy")}
        </Button>
        {children}
      </div>
    </div>
  );
}
