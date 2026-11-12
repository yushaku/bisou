import { Mascot } from "./Mascot";
import type { MascotSituation } from "@/lib/mascots";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  situation?: MascotSituation;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

export function EmptyState({ title, description, situation = "empty", action, className }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-4 rounded-xl border-2 border-dashed border-input px-5 py-6",
        className,
      )}
    >
      <Mascot situation={situation} />
      <p className="text-lg text-pretty">
        {title}
      </p>
      {description && <p className="-mt-2 text-base text-pretty text-muted-foreground">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>
          {ActionIcon && <ActionIcon aria-hidden="true" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
