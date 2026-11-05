import heart from "@/assets/brand-heart.webp";
import { cn } from "@/lib/utils";

/* The Bisou heart. Decorative: the app name next to it carries the meaning. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img src={heart} alt="" aria-hidden="true" width={192} height={192} className={cn("size-6 object-contain", className)} />
  );
}
