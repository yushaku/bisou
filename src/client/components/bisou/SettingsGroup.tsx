import { ChevronRight, type LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-4 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl edge bg-card text-card-foreground divide-y divide-border">{children}</div>
    </section>
  );
}

export function SettingsRow({ icon: Icon, label, value, className, ...props }: Omit<ComponentProps<"button">, "children"> & {
  icon: LucideIcon;
  label: string;
  value?: string;
}) {
  const content = <>
    <Icon className="size-5 shrink-0" aria-hidden="true" />
    <span className="shrink-0">{label}</span>
    {value && <span className="ml-auto min-w-0 break-words text-right text-sm text-muted-foreground">{value}</span>}
    {props.onClick && <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground", !value && "ml-auto")} aria-hidden="true" />}
  </>;
  const rowClass = cn("flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-base", className);
  return props.onClick
    ? <button type="button" className={cn(rowClass, "press outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring")} {...props}>{content}</button>
    : <div className={rowClass}>{content}</div>;
}
