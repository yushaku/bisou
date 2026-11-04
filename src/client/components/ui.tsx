import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Screen({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">{children}</main>;
}

export function Heart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.1 4.6 2.6.9-1.5 2.5-2.6 4.6-2.6 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent transition-opacity disabled:opacity-50 " +
        className
      }
    />
  );
}

export function TextButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={"text-sm font-medium text-mauve underline-offset-4 hover:underline disabled:text-overlay1 disabled:no-underline " + className}
    />
  );
}
