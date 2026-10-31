"use client";

import { useState } from "react";
import { QUADRANT, pct, pp, type Province } from "@/lib/hazardFinance";

const W = 520;
const H = 420;
const M = { t: 16, r: 18, b: 46, l: 54 };
const UNDER = "#c94a3a";
const OVER = "#0e6f86";
const STEP = 0.025;

type Label = { x: number; y: number; anchor: "start" | "end" | "middle" };

/** Greedy placement: try right, left, above, below each point and keep the first spot that overlaps no earlier label or point. */
function placeLabels(pts: { id: string; cx: number; cy: number; name: string; sel: boolean }[]): Record<string, Label> {
  const boxes: [number, number, number, number][] = pts.map((p) => [p.cx - 7, p.cy - 7, p.cx + 7, p.cy + 7]);
  const hit = (b: [number, number, number, number]) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const out: Record<string, Label> = {};
  for (const p of [...pts].sort((a, b) => a.cy - b.cy)) {
    const w = p.name.length * 6.4;
    const g = p.sel ? 14 : 10; // clear the selection ring
    const options: [Label, [number, number, number, number]][] = [
      [{ x: p.cx + g, y: p.cy + 4, anchor: "start" }, [p.cx + g - 1, p.cy - 7, p.cx + g + 1 + w, p.cy + 7]],
      [{ x: p.cx - g, y: p.cy + 4, anchor: "end" }, [p.cx - g - 1 - w, p.cy - 7, p.cx - g + 1, p.cy + 7]],
      [{ x: p.cx, y: p.cy - 11, anchor: "middle" }, [p.cx - w / 2, p.cy - 22, p.cx + w / 2, p.cy - 8]],
      [{ x: p.cx, y: p.cy + 19, anchor: "middle" }, [p.cx - w / 2, p.cy + 8, p.cx + w / 2, p.cy + 22]],
    ];
    const inside = options.filter(([, b]) => b[0] >= M.l && b[2] <= W - M.r);
    const pick = inside.find(([, b]) => !hit(b)) ?? inside[0] ?? options[0];
    boxes.push(pick[1]);
    out[p.id] = pick[0];
  }
  return out;
}

export default function QuadrantChart({ provinces, selectedId, onSelect }: { provinces: Province[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState<Province | null>(null);
  const n = provinces.length || 1;
  // same domain on both axes so the parity line sits at 45°, zoomed to where the points are
  const vals = [...provinces.flatMap((p) => [p.risk.share, p.finance.share]), 1 / n];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.01) / STEP) * STEP);
  const hi = Math.ceil((Math.max(...vals) + 0.01) / STEP) * STEP;
  const x = (v: number) => M.l + ((v - lo) / (hi - lo)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  const ticks = Array.from({ length: Math.round((hi - lo) / STEP) + 1 }, (_, i) => lo + i * STEP);
  const pts = provinces.map((p) => ({ id: p.id, name: p.name, cx: x(p.risk.share), cy: y(p.finance.share), sel: p.id === selectedId }));
  const labels = placeLabels(pts);
  const fmtTick = (t: number) => `${(t * 100).toFixed(t * 100 === Math.round(t * 100) ? 0 : 1)}%`;

  return (
    <div className="relative mx-auto mt-3 max-w-[640px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Scatter of risk share against finance share by province">
        {/* grid */}
        {ticks.map((t) => (
          <g key={t} className="text-[11px]" fill="#7f8d88">
            <line x1={x(lo)} x2={x(hi)} y1={y(t)} y2={y(t)} stroke="#eeebe5" />
            <line y1={y(lo)} y2={y(hi)} x1={x(t)} x2={x(t)} stroke="#eeebe5" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end">
              {fmtTick(t)}
            </text>
            <text x={x(t)} y={H - M.b + 18} textAnchor="middle">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {/* quadrant guides at the equal-share line (1/n) */}
        <line x1={x(1 / n)} x2={x(1 / n)} y1={y(lo)} y2={y(hi)} stroke="#c9c4b8" strokeDasharray="3 4" />
        <line x1={x(lo)} x2={x(hi)} y1={y(1 / n)} y2={y(1 / n)} stroke="#c9c4b8" strokeDasharray="3 4" />
        <text x={x(hi) - 4} y={y(lo) - 8} textAnchor="end" className="text-[11px] font-semibold" fill={UNDER}>
          High risk · low finance
        </text>
        <text x={x(lo) + 6} y={y(hi) + 14} className="text-[11px]" fill="#7f8d88">
          Low risk · high finance
        </text>
        {/* parity */}
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke="#43554f" strokeWidth={1.5} strokeDasharray="6 5" />
        <text transform={`translate(${x(hi) - 6} ${y(hi) + 16}) rotate(-38)`} textAnchor="end" className="text-[11px]" fill="#43554f">
          parity
        </text>
        {/* axes */}
        <line x1={x(lo)} x2={x(hi)} y1={y(lo)} y2={y(lo)} stroke="#7f8d88" />
        <line x1={x(lo)} x2={x(lo)} y1={y(lo)} y2={y(hi)} stroke="#7f8d88" />
        <text x={(x(lo) + x(hi)) / 2} y={H - 8} textAnchor="middle" className="text-[12px]" fill="#43554f">
          Share of national climate risk
        </text>
        <text transform={`translate(14 ${(y(lo) + y(hi)) / 2}) rotate(-90)`} textAnchor="middle" className="text-[12px]" fill="#43554f">
          Share of adaptation + cross-cutting finance
        </text>

        {provinces.map((p, i) => {
          const { cx, cy } = pts[i];
          const l = labels[p.id];
          const sel = p.id === selectedId;
          return (
            <g key={p.id} className="cursor-pointer" onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(p.id)}>
              <circle cx={cx} cy={cy} r={14} fill="transparent" />
              <circle cx={cx} cy={cy} r={sel ? 7 : 5.5} fill={p.gap.index > 0 ? UNDER : OVER} stroke="#fff" strokeWidth={2} />
              {sel && <circle cx={cx} cy={cy} r={11} fill="none" stroke="#0b5a4b" strokeWidth={2} />}
              <text x={l.x} y={l.y} textAnchor={l.anchor} className={`text-[11.5px] ${sel ? "font-semibold" : ""}`} fill="#0f2420">
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-md num"
          style={{ left: `${(x(hover.risk.share) / W) * 100}%`, top: `${(y(hover.finance.share) / H) * 100}%`, transform: "translate(-50%, calc(-100% - 14px))" }}
        >
          <div className="font-semibold">{hover.name}</div>
          <div>Risk share {pct(hover.risk.share)}</div>
          <div>Finance share {pct(hover.finance.share)}</div>
          <div className={hover.gap.index > 0 ? "text-coral" : "text-over"}>Gap {pp(hover.gap.index)}</div>
          <div className="text-ink-3">{QUADRANT[hover.gap.quadrant].label}</div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: UNDER }} /> Underfunded vs risk (below parity)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: OVER }} /> Above its risk share
        </span>
        <span className="text-ink-3">Dashed cross = equal share (1/{n})</span>
      </div>
    </div>
  );
}
