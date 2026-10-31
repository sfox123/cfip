"use client";

import { ArrowUpRight, X } from "lucide-react";
import { RELATED_TOOLS } from "@/lib/finance";
import { HAZARDS, HAZARD_LABEL, QUADRANT, pct, pp, ratio, usd, type GapData, type Province } from "@/lib/hazardFinance";

export default function ProvincePanel({ p, data, rank, onClose }: { p: Province; data: GapData; rank: number; onClose: () => void }) {
  const maxBar = Math.max(p.gap.expected_usd, p.finance.adj_usd, 1);
  const under = p.gap.gap_usd > 0;
  const finRows = [
    { k: "Adaptation", raw: p.finance.adaptation, adj: p.finance.adj_adaptation, inGap: true },
    { k: "Cross-cutting", raw: p.finance.crosscutting, adj: p.finance.adj_crosscutting, inGap: true },
    { k: "Mitigation", raw: p.finance.mitigation, adj: p.finance.adj_mitigation, inGap: false },
  ];

  return (
    <aside className="rise scroll-thin w-full shrink-0 border-t border-line bg-white lg:w-100 lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] text-ink-3">
              {data.unit === "province" ? "Province" : "District"} · {data.country}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{p.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-paper" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
          <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2 num">
            Gap rank {rank} of {data.provinces.length}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${QUADRANT[p.gap.quadrant].tone}`}>{QUADRANT[p.gap.quadrant].label}</span>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5">
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Risk share" value={pct(p.risk.share)} />
          <Kpi label="Finance share" value={pct(p.finance.share)} />
          <Kpi label="Gap index" value={pp(p.gap.index)} tone={p.gap.index > 0 ? "text-coral" : "text-[#2c5d9e]"} />
        </div>

        <section>
          <h3 className="text-[13px] font-semibold">Expected vs actual (estimated)</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">Expected = risk share × national adaptation + cross-cutting pool ({usd(data.national.pool_usd)}).</p>
          <div className="mt-3 grid gap-2 text-[12.5px] num">
            <Bar label="Expected if money followed risk" value={p.gap.expected_usd} max={maxBar} color="#8270d6" />
            <Bar label="Actual (scaled estimate)" value={p.finance.adj_usd} max={maxBar} color="#1f9e93" />
          </div>
          <div className={`mt-2 text-[13px] font-medium num ${under ? "text-coral" : "text-[#2c5d9e]"}`}>
            {under ? "Underfunded by" : "Above risk share by"} {usd(Math.abs(p.gap.gap_usd))}
            <span className="ml-1 font-normal text-ink-3">relative gap, not a needs estimate</span>
          </div>
          <div className="mt-1 text-[12px] text-ink-2 num">{usd(p.gap.usd_per_risk)} per unit of overall risk</div>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold">Finance by category</h3>
          <table className="mt-2 w-full text-[12.5px] num">
            <thead className="text-[11px] text-ink-3">
              <tr>
                <th className="py-1 text-left font-medium">Category</th>
                <th className="py-1 text-right font-medium">CSG raw</th>
                <th className="py-1 text-right font-medium">Scaled est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {finRows.map((r) => (
                <tr key={r.k} className={r.inGap ? "" : "text-ink-3"}>
                  <td className="py-1.5">
                    {r.k}
                    {!r.inGap && <span className="ml-1 text-[10.5px]">(not in gap)</span>}
                  </td>
                  <td className="py-1.5 text-right">{usd(r.raw)}</td>
                  <td className="py-1.5 text-right">{usd(r.adj)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
            Raw values count multi-province projects in full in every province. Scaled = raw × national total ÷ sum over provinces, per category.
          </p>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold">Risk and project targeting by hazard</h3>
          <table className="mt-2 w-full text-[12.5px] num">
            <thead className="text-[11px] text-ink-3">
              <tr>
                <th className="py-1 text-left font-medium">Hazard</th>
                <th className="py-1 text-right font-medium" title="Hazard score (0–1)">H</th>
                <th className="py-1 text-right font-medium" title="Exposure score (0–1)">E</th>
                <th className="py-1 text-right font-medium" title="Vulnerability score (0–1)">V</th>
                <th className="py-1 text-right font-medium">Risk</th>
                <th className="py-1 text-right font-medium">Projects</th>
                <th className="py-1 text-right font-medium" title="Project share ÷ risk share">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {HAZARDS.map((h) => {
                const c = p.gap.coverage[h];
                return (
                  <tr key={h}>
                    <td className="py-1.5">{HAZARD_LABEL[h]}</td>
                    <td className="py-1.5 text-right">{p.hazard[h].hazard.toFixed(2)}</td>
                    <td className="py-1.5 text-right">{p.hazard[h].exposure.toFixed(2)}</td>
                    <td className="py-1.5 text-right text-ink-3">{p.hazard[h].vulnerability?.toFixed(2) ?? "—"}</td>
                    <td className="py-1.5 text-right font-medium">{p.risk[h].toFixed(2)}</td>
                    <td className="py-1.5 text-right">{p.projects_by_hazard[h]}</td>
                    <td className={`py-1.5 text-right ${c != null && c < 1 ? "font-medium text-coral" : ""}`}>{ratio(c)}</td>
                  </tr>
                );
              })}
              <tr className="font-medium">
                <td className="py-1.5">Overall</td>
                <td colSpan={3} />
                <td className="py-1.5 text-right">{p.risk.overall.toFixed(2)}</td>
                <td className="py-1.5 text-right text-ink-3" colSpan={2}>
                  {p.projects_by_hazard.heatwave ? `+${p.projects_by_hazard.heatwave} heatwave` : ""}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-3">Coverage below 1× = the hazard is under-targeted by CSG projects relative to its risk here.</p>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold">Related IWMI tools</h3>
          <ul className="mt-2 grid gap-1.5">
            {RELATED_TOOLS.LKA.map((t) => (
              <li key={t.name}>
                <a href={t.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2 rounded-lg border border-line px-3 py-2 hover:border-brand/40">
                  <div className="flex-1">
                    <div className="text-[13px] font-medium group-hover:text-brand">{t.name}</div>
                    <div className="text-[11.5px] text-ink-3">{t.what}</div>
                  </div>
                  <ArrowUpRight size={14} className="mt-0.5 text-ink-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function Kpi({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className={`text-[17px] font-semibold tracking-tight num ${tone}`}>{value}</div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-ink-2">
        <span>{label}</span>
        <span className="font-medium text-ink">{usd(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-paper">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}
