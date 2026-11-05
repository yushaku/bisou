import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

/* One short line and the next step, in the frame the content will fill. No illustration. */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-4 rounded-xl border-2 border-dashed border-input px-5 py-6",
        className,
      )}
    >
      <p className="flex items-center gap-3 text-lg text-pretty">
        {Icon && <Icon className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />}
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
