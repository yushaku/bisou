import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface Photo {
  src: string;
  alt: string;
  /* Larger renditions for high density screens; the grid sets sizes per tile. */
  srcSet?: string;
}

/*
 * Layouts for 1 to 4 photos, every tile square (R18); more than 4 shows the first 4 with a
 * "+n" on the last. Three photos: one large square beside two stacked squares, so the right
 * column is (100% - two gaps) / 3 and the left square is exactly two tiles plus a gap tall.
 */
const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-[1fr_calc((100%_-_var(--spacing)*6)/3)]",
  4: "grid-cols-2",
};

/* Rendered tile widths inside a card of the max-w-md column; a 3x phone picks full only for big tiles. */
const SIZES = {
  one: "(min-width: 28rem) 24rem, calc(100vw - 4rem)",
  lead: "(min-width: 28rem) 16rem, calc(66vw - 2.5rem)",
  half: "(min-width: 28rem) 12rem, calc(50vw - 2.5rem)",
};

export function PhotoGrid({ photos, className }: { photos: Photo[]; className?: string }) {
  const { t } = useI18n();
  if (photos.length === 0) return null;
  const shown = photos.slice(0, 4);
  const extra = photos.length - shown.length;

  return (
    <ul className={cn("grid gap-3", GRID[shown.length], className)}>
      {shown.map((photo, i) => {
        const lead = shown.length === 3 && i === 0;
        // data-tilt: prints sit a little askew in the journal and sticker styles; soft sets the tilt to 0.
        return (
          <li
            key={photo.src + i}
            className={cn("photo-frame", lead && "row-span-2")}
            data-tilt={i % 2 === 0 ? "left" : "right"}
            data-tape={i === 0 ? "" : undefined}
          >
            <div data-slot="photo" className="relative aspect-square overflow-hidden bg-muted">
              <img
                src={photo.src}
                srcSet={photo.srcSet}
                sizes={photo.srcSet ? (shown.length === 1 ? SIZES.one : lead ? SIZES.lead : SIZES.half) : undefined}
                alt={photo.alt}
                width={1}
                height={1}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              {extra > 0 && i === shown.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 font-heading text-2xl text-background">
                  <span aria-hidden="true">+{extra}</span>
                  <span className="sr-only">{t("entry.morePhotos", { count: extra })}</span>
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
