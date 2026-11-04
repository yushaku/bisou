import { ExternalLink, Heart, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/i18n";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Photo } from "./PhotoGrid";

export interface Wish {
  id: string;
  title: string;
  /* VND, whole units. */
  price: number;
  priority: 1 | 2 | 3;
  link?: string;
  photo?: Photo;
}

const PRIORITY: Record<Wish["priority"], MessageKey> = { 1: "wish.priority1", 2: "wish.priority2", 3: "wish.priority3" };

export function WishPriority({ priority }: { priority: Wish["priority"] }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="flex text-primary" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <Heart key={n} className={cn("size-3.5", n <= priority ? "fill-current" : "opacity-40")} />
        ))}
      </span>
      {t(PRIORITY[priority])}
    </span>
  );
}

export function WishCard({ wish, className }: { wish: Wish; className?: string }) {
  const { t, locale } = useI18n();
  return (
    <Card className={cn("flex-row items-center gap-3 p-3", className)}>
      <div className="photo-frame shrink-0 [--photo-pad-bottom:var(--photo-pad)] [--photo-tilt:0deg]">
        <div data-slot="photo" className="relative size-20 overflow-hidden bg-muted">
          {wish.photo ? (
            <img src={wish.photo.src} alt={wish.photo.alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageOff className="size-6" aria-hidden="true" />
              <span className="sr-only">{t("wish.noPhoto")}</span>
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold leading-snug">{wish.title}</h3>
        <p className="mt-0.5 font-heading text-lg tabular-nums">{formatVnd(wish.price, locale)}</p>
        <WishPriority priority={wish.priority} />
      </div>
      {wish.link && (
        <Button asChild variant="ghost" size="icon" className="shrink-0 self-start">
          <a href={wish.link} target="_blank" rel="noreferrer noopener" aria-label={`${t("wish.openLink")}: ${wish.title}`}>
            <ExternalLink />
          </a>
        </Button>
      )}
    </Card>
  );
}
