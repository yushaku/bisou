import type { ReactNode } from "react";

export function ComposeBody({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 [&>*]:shrink-0">{children}</div>;
}

export function ComposeFooter({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-2 border-t bg-popover px-5 pt-3 pb-5">{children}</div>;
}
