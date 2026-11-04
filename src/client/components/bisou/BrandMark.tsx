import { cn } from "@/lib/utils";

/* The Bisou heart. Decorative: the app name next to it carries the meaning. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("text-primary", className)} fill="currentColor">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.1 4.6 2.6.9-1.5 2.5-2.6 4.6-2.6 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
