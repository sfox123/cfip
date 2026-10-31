"use client";

import { ArrowUpRight, X } from "lucide-react";
import { INSTRUMENT_COLOURS, RELATED_TOOLS, money, type CountryData, type DistrictProps } from "@/lib/finance";

export default function DistrictPanel({
  district: d,
  data,
  rank,
  total,
  onClose,
}: {
  district: DistrictProps;
  data: CountryData;
  rank: number;
  total: number;
  onClose: () => void;
}) {
  const progs = d.allocations
    .map((a) => ({ ...a, prog: data.programmes.find((p) => p.id === a.id) }))
    .filter((x) => x.prog)
    .sort((a, b) => b.amount - a.amount);

  const byInstrument = Object.entries(
    progs.reduce<Record<string, number>>((acc, p) => {
      acc[p.prog!.instrument] = (acc[p.prog!.instrument] || 0) + p.amount;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const coverage = Math.max(0, Math.min(100, d.coverage));
  const surplus = d.gap < 0;
  const priority = d.dri >= 0.6 && d.gapPct >= 50 ? "High" : d.dri >= 0.45 && d.gapPct >= 30 ? "Medium" : "Lower";

  return (
    <aside className="rise scroll-thin w-[400px] shrink-0 overflow-y-auto border-l border-line bg-white">
      <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] text-ink-3">
              {d.state} · {data.country}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{d.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-paper" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
          <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2 num">
            Gap rank {rank} of {total}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              priority === "High" ? "bg-coral-soft text-coral" : priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-aqua-soft text-aqua"
            }`}
          >
            {priority} investment priority
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5">
        {/* finance */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Finance position</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Kpi label="Risk-adjusted need" value={money(d.need)} />
            <Kpi label="Allocated" value={money(d.allocated)} tone="aqua" />
            <Kpi label={surplus ? "Surplus" : "Gap"} value={money(Math.abs(d.gap))} tone={surplus ? "aqua" : "coral"} />
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-coral-soft">
            <div className="h-full rounded-full bg-aqua transition-all duration-700" style={{ width: `${coverage}%` }} />
          </div>
          <div className="mt-1.5 text-[12px] text-ink-2 num">
            {d.coverage.toFixed(0)}% of modelled need is covered{surplus ? " — allocations exceed modelled need" : ""}.
          </div>
        </section>

        {/* risk */}
        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Drought risk</h3>
            <div className="text-sm">
              DRI <b className="text-brand num">{d.dri.toFixed(2)}</b>
            </div>
          </div>
          <div className="mt-3 grid gap-2.5">
            <Bar label="Hazard" v={d.hazard} />
            <Bar label="Exposure" v={d.exposure} />
            <Bar label="Vulnerability" v={d.vulnerability} />
          </div>
          <div className="mt-2 text-[12px] text-ink-3 num">Agricultural baseline: {money(d.baseline)}</div>
        </section>

        {/* programmes */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Programmes in this district</h3>
          {byInstrument.length > 0 && (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                {byInstrument.map(([k, v]) => (
                  <div key={k} title={`${k}: ${money(v)}`} style={{ width: `${(v / d.allocated) * 100}%`, background: INSTRUMENT_COLOURS[k] ?? "#999" }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {byInstrument.map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: INSTRUMENT_COLOURS[k] ?? "#999" }} />
                    {k} <span className="text-ink-3 num">{((v / d.allocated) * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </>
          )}
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {progs.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: INSTRUMENT_COLOURS[p.prog!.instrument] ?? "#999" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-snug">{p.prog!.name}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {p.prog!.funder} · {p.prog!.theme}
                    {p.year ? ` · ${p.year}` : ""}
                  </div>
                </div>
                <div className="text-[13px] font-medium num">{money(p.amount)}</div>
              </li>
            ))}
            {progs.length === 0 && <li className="px-3 py-4 text-sm text-ink-3">No programme allocations recorded.</li>}
          </ul>
          {data.demo.allocations && (
            <p className="mt-2 text-[11.5px] text-amber-700">Programme names are real; district coverage and amounts are illustrative.</p>
          )}
        </section>

        {/* tools */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Go deeper</h3>
          <div className="mt-3 grid gap-2">
            {(RELATED_TOOLS[data.iso] ?? []).map((t) => (
              <a
                key={t.name}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-xl border border-line px-3 py-2 transition hover:border-brand/50 hover:bg-brand-soft/40"
              >
                <div>
                  <div className="text-[13px] font-medium">{t.name}</div>
                  <div className="text-[11.5px] text-ink-3">{t.what}</div>
                </div>
                <ArrowUpRight size={15} className="text-ink-3 group-hover:text-brand" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "aqua" | "coral" }) {
  return (
    <div className="rounded-xl border border-line px-2.5 py-2">
      <div className="text-[10.5px] leading-tight text-ink-3">{label}</div>
      <div className={`mt-0.5 text-[15px] font-semibold num ${tone === "aqua" ? "text-aqua" : tone === "coral" ? "text-coral" : ""}`}>{value}</div>
    </div>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[12.5px] text-ink-2">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-brand-2 transition-all duration-700" style={{ width: `${v * 100}%` }} />
      </div>
      <div className="w-9 text-right text-[12px] num">{v.toFixed(2)}</div>
    </div>
  );
}
