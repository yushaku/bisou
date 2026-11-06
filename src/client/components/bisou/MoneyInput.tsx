import { useRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { formatMoneyInput } from "@/lib/format";

/* Money field in whole VND: shows grouped digits, starts at 0, and keeps the caret after the same digit while regrouping. */
export function MoneyInput({ value, onValueChange, onFocus, ...props }: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { locale } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onFocus={(e) => { if (value === "0") e.currentTarget.select(); onFocus?.(e); }}
      onChange={(e) => {
        const el = e.currentTarget;
        const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").replace(/^0+/, "").length;
        const next = formatMoneyInput(el.value, locale);
        onValueChange(next);
        requestAnimationFrame(() => {
          const input = ref.current;
          if (!input || document.activeElement !== input) return;
          let pos = 0;
          for (let seen = 0; pos < next.length && seen < digitsBefore; pos++) if (/\d/.test(next[pos]!)) seen++;
          const at = digitsBefore ? pos : next.length;
          input.setSelectionRange(at, at);
        });
      }}
    />
  );
}
