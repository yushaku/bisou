import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface Photo {
  src: string;
  alt: string;
}

/* Layouts for 1 to 4 photos; more than 4 shows the first 4 with a "+n" on the last. */
const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 grid-rows-2",
  4: "grid-cols-2",
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
            <div data-slot="photo" className={cn("relative overflow-hidden bg-muted", shown.length === 1 ? "aspect-[4/3]" : lead ? "h-full min-h-40" : "aspect-square")}>
              <img
                src={photo.src}
                alt={photo.alt}
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
