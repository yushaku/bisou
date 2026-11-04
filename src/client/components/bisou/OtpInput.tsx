import type { Ref } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  id: string;
  value: string;
  /* Receives the raw text; the caller keeps the digits (paste of "123 456" or "Code: 123456" works). */
  onChange: (raw: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
  "aria-describedby"?: string;
}

/*
 * Six boxes drawn over one real input. One input keeps iOS one-time-code autofill, paste,
 * select-all and screen readers working; the boxes are only the picture of its value.
 */
export function OtpInput({ id, value, onChange, length = 6, disabled, invalid, ref, ...aria }: OtpInputProps) {
  const chars = value.slice(0, length).split("");
  const caret = Math.min(chars.length, length - 1);

  return (
    <div className="group/otp relative" data-disabled={disabled || undefined}>
      <div aria-hidden="true" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            data-active={i === caret || undefined}
            className={cn(
              "edge-control flex h-14 items-center justify-center rounded-control bg-(--field-bg) font-heading text-3xl tabular-nums transition-[box-shadow,border-color] duration-(--duration)",
              "group-focus-within/otp:data-active:border-ring group-focus-within/otp:data-active:ring-3 group-focus-within/otp:data-active:ring-ring/40",
              invalid && "border-destructive",
              disabled && "opacity-50",
            )}
          >
            {chars[i] ?? ""}
          </span>
        ))}
      </div>
      <input
        id={id}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length * 2}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={aria["aria-describedby"]}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
