import { useMascot, type MascotSituation } from "@/lib/mascots";
import { cn } from "@/lib/utils";

export function Mascot({ situation, className }: { situation: MascotSituation; className?: string }) {
  const mascot = useMascot();
  return <img src={mascot.images[situation]} alt="" width={480} height={480} loading="lazy" decoding="async" className={cn("size-28 shrink-0 object-contain", className)} />;
}
