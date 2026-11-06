import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /* h2 when the top bar already holds the screen's h1. */
  as?: "h1" | "h2";
}

export function PageHeader({ title, description, action, className, as: Heading = "h1" }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end gap-3 pt-2 pb-4", className)}>
      <div className="min-w-0 flex-1">
        <Heading className="font-heading text-3xl leading-tight">{title}</Heading>
        {description && <p className="mt-1 text-base text-pretty text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
