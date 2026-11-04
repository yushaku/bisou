import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface PairCodeDisplayProps {
  /* 6 characters from the no look-alike alphabet (no 0/O, 1/I/L). */
  code: string;
  expiresInMinutes?: number;
  className?: string;
}

export function PairCodeDisplay({ code, expiresInMinutes, className }: PairCodeDisplayProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

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
      {expiresInMinutes !== undefined && (
        <p className="text-base text-muted-foreground">{t("pair.hint", { minutes: expiresInMinutes })}</p>
      )}
      <Button variant="outline" onClick={() => void copy()} className="self-start">
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? t("pair.copied") : t("pair.copy")}
      </Button>
    </div>
  );
}
