import { useEffect, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { useDesignT } from "./messages";

const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "border", "input", "ring",
  "success", "success-foreground", "warning", "warning-foreground", "info", "info-foreground",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
] as const;

/* Text pairs that must reach 4.5:1 (the ring and field edges need 3:1). */
const PAIRS: [string, string, number][] = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["foreground", "muted", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["destructive", "card", 4.5],
  ["success-foreground", "success", 4.5],
  ["warning-foreground", "warning", 4.5],
  ["info-foreground", "info", 4.5],
  ["ring", "card", 3],
  ["input", "card", 3],
];

/* Resolve any CSS colour (hex, color-mix) to sRGB through a 1px canvas. */
function rgbOf(token: string, ctx: CanvasRenderingContext2D): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function useContrast(): { pair: string; ratio: number; need: number }[] {
  const { theme, prefs } = useTheme();
  const [rows, setRows] = useState<{ pair: string; ratio: number; need: number }[]>([]);
  useEffect(() => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    // Wait a frame: the provider applies data-theme in its own effect, after this one.
    const id = requestAnimationFrame(() =>
      setRows(
        PAIRS.map(([fg, bg, need]) => {
          const a = luminance(rgbOf(fg, ctx));
          const b = luminance(rgbOf(bg, ctx));
          return { pair: `${fg} / ${bg}`, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), need };
        }),
      ),
    );
    return () => cancelAnimationFrame(id);
  }, [theme, prefs.style]);
  return rows;
}

export function TokensSection() {
  const d = useDesignT();
  const rows = useContrast();
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="mb-3 font-heading text-xl">{d("colors")}</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_TOKENS.map((name) => (
            <li key={name} className="flex items-center gap-3">
              <span className="edge size-11 shrink-0 rounded-md border-border" style={{ backgroundColor: `var(--${name})` }} />
              <span className="min-w-0 text-sm break-words">{name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-xl">{d("contrast")}</h3>
        <table className="w-full max-w-xl text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 font-normal">{d("pair")}</th>
              <th className="py-2 text-right font-normal">{d("ratio")}</th>
              <th className="py-2 text-right font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pair} className="border-t">
                <td className="py-2">{r.pair}</td>
                <td className="py-2 text-right tabular-nums">{r.ratio.toFixed(2)}</td>
                <td className="py-2 text-right">{r.ratio >= r.need ? d("pass") : <strong className="text-destructive">{d("fail")}</strong>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-xl">{d("type")}</h3>
        <div className="flex flex-col gap-3">
          <p className="font-heading text-7xl leading-none tabular-nums">1.360</p>
          <p className="font-heading text-4xl leading-tight">Ngày đầu tiên mình gặp nhau</p>
          <p className="font-heading text-3xl leading-tight">Ngày đầu tiên mình gặp nhau</p>
          <p className="font-heading text-2xl">Hũ điều ước của Quốc Bảo</p>
          <p className="font-heading text-xl">Thứ Hai, 2 tháng 11</p>
          <p className="text-lg">Sáng chủ nhật đi bộ quanh Hồ Gươm, gió đầu đông lạnh mà vui.</p>
          <p className="text-base">Bảo mua hai cốc cà phê trứng ở phố Hàng Gai, hai đứa ngồi ghế nhựa nhìn người qua lại.</p>
          <p className="text-sm text-muted-foreground">Ảnh 1 trên 3 · 450.000 ₫ · Đặng Thị Huyền Trâm</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-xl">{d("radius")}</h3>
        <ul className="flex flex-wrap gap-4">
          {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-control"].map((r) => (
            <li key={r} className="flex flex-col items-center gap-2">
              <span className={`edge size-16 bg-card ${r}`} />
              <span className="text-sm">{r.replace("rounded-", "")}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-xl">{d("spacing")}</h3>
        <ul className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
            <li key={n} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-right tabular-nums">{n}</span>
              <span className="h-3 rounded-sm bg-primary" style={{ width: `calc(var(--spacing) * ${n})` }} />
              <span className="text-muted-foreground tabular-nums">{n * 4}px</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
