import { ChevronRight, type LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-4 text-sm font-semibold text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl edge bg-card text-card-foreground">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  leading,
  label,
  description,
  value,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  /* A leading glyph, or any custom node such as an avatar. */
  icon?: LucideIcon;
  leading?: ReactNode;
  label: string;
  /* A quieter second line under the label. */
  description?: string;
  value?: string;
}) {
  const content = (
    <>
      {leading ?? (Icon && <Icon className="size-5 shrink-0" aria-hidden="true" />)}
      <span className="flex min-w-0 flex-col">
        <span className="wrap-break-word">{label}</span>
        {description && <span className="text-sm break-all text-muted-foreground">{description}</span>}
      </span>
      {value && (
        <span className="ml-auto min-w-0 text-right text-sm wrap-break-word text-muted-foreground">{value}</span>
      )}
      {props.onClick && (
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground", !value && "ml-auto")} aria-hidden="true" />
      )}
    </>
  );
  const rowClass = cn("flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-base", className);
  return props.onClick ? (
    <button
      type="button"
      className={cn(
        rowClass,
        "press outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
      )}
      {...props}
    >
      {content}
    </button>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}
