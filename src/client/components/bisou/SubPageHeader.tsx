import { ArrowLeft } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export function SubPageHeader({ title }: { title: string }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-md items-center gap-3 px-4">
        <Button variant="ghost" size="icon" aria-label={t("common.back")} onClick={() => {
          if (history.state?.from) history.back();
          else navigate("/", { replace: true });
        }}><ArrowLeft aria-hidden="true" /></Button>
        <h1 ref={heading} tabIndex={-1} className="font-heading text-2xl outline-none">{title}</h1>
      </div>
    </header>
  );
}
