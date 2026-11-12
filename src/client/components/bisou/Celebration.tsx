import confetti from "canvas-confetti";
import { Mascot } from "./Mascot";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

const TOKENS = ["--primary", "--secondary", "--warning", "--success", "--info"];

/* Confetti in the active theme's colours; nothing moves when the user prefers reduced motion. */
export function fireConfetti() {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const style = getComputedStyle(document.documentElement);
  const colors = TOKENS.map((name) => style.getPropertyValue(name).trim()).filter((c) => c.startsWith("#"));
  const base = { colors, disableForReducedMotion: true, ticks: 220, zIndex: 60 } as const;
  void confetti({ ...base, particleCount: 90, spread: 70, origin: { y: 0.65 } });
  void confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.75 } });
  void confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } });
}

interface CelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  body?: string;
}

export function Celebration({ open, onOpenChange, title, body }: CelebrationProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (open) fireConfetti();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <Mascot situation="celebrate" />
          <DialogTitle className="font-heading text-2xl leading-tight">{title ?? t("celebration.title")}</DialogTitle>
          <DialogDescription className="text-base text-balance">{body ?? t("celebration.body")}</DialogDescription>
        </DialogHeader>
        <Button onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
      </DialogContent>
    </Dialog>
  );
}
