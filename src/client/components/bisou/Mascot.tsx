import { useMascot, type MascotSituation } from "@/lib/mascots";
import { cn } from "@/lib/utils";

export function Mascot({ situation, className, priority }: { situation: MascotSituation; className?: string; priority?: boolean }) {
  const mascot = useMascot();
  return <img src={mascot.images[situation]} alt="" width={480} height={480} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" className={cn("size-28 shrink-0 object-contain", className)} />;
}
