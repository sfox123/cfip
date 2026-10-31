import { ArrowDown, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { usd, pp, type GapData } from "@/lib/hazardFinance";

type Status = "live" | "pending" | "derived";

const STATUS: Record<Status, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  live: { label: "Live data", cls: "bg-brand-soft text-brand", icon: CheckCircle2 },
  derived: { label: "Computed here", cls: "bg-aqua-soft text-over", icon: CheckCircle2 },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700", icon: CircleDashed },
};

function Node({ step, title, status, children, accent }: { step: string; title: string; status: Status; children: React.ReactNode; accent?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <div className={`relative h-full rounded-2xl border bg-white p-4 ${accent ?? "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{step}</div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${s.cls}`}>
          <Icon size={11} /> {s.label}
        </span>
      </div>
      <div className="mt-1.5 font-semibold leading-snug text-ink">{title}</div>
      <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

function Source({ name, via, what }: { name: string; via: string; what: string }) {
  return (
    <li className="rounded-xl border border-line bg-paper/70 px-3 py-2">
      <div className="text-[12.5px] font-medium text-ink">{name}</div>
      <div className="text-[11.5px] text-ink-3">
        {what} · <span className="text-ink-2">{via}</span>
      </div>
    </li>
  );
}

const Right = () => (
  <div className="hidden items-center justify-center text-ink-3 lg:flex">
    <ArrowRight size={18} />
  </div>
);

/** What the platform actually does for Sri Lanka: two input lanes (risk, finance) that meet in a share comparison. */
export default function PipelineDiagram({ data }: { data: GapData }) {
  const ranked = [...data.provinces].sort((a, b) => b.gap.index - a.gap.index);
  const priority = ranked.filter((p) => p.gap.quadrant === "high-risk-low-finance");
  const top = priority.length ? priority : ranked.slice(0, 2);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_28px_minmax(0,1.15fr)] lg:grid-rows-[auto_auto]">
      {/* ---- lane A: risk ---- */}
      <Node step="1a · Inputs: hazard & exposure" title="Rainfall, terrain, people, crops" status="live">
        <ul className="mt-1 grid gap-1.5">
          <Source name="CHIRPS daily rainfall, 1991–2025" via="IWMI ENSO API" what="per province" />
          <Source name="SRTM 90 m elevation" via="OpenTopoData" what="slope" />
          <Source name="WorldPop 2026 · SPAM 2020" via="IWMI ENSO API" what="population, crop area" />
        </ul>
      </Node>
      <Right />
      <Node step="2a · Risk per province" title="Hazard × exposure, 4 hazards" status="derived">
        Flood (heavy multi-day rain), drought (rainfall variability and deficits), landslide (slope × heavy rain), water scarcity (aridity,
        dry spells). Risk = √(hazard × exposure), averaged into one score, then each province&apos;s <b>share of national risk</b>.
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11.5px] text-amber-800">
          <CircleDashed size={12} /> Vulnerability (poverty) not loaded yet
        </div>
      </Node>
      <Right />
      {/* ---- lane B: finance ---- */}
      <Node step="1b · Input: climate finance" title="CSG Project Tracker" status="live">
        <ul className="mt-1 grid gap-1.5">
          <Source name={`${data.national.projects} projects · ${usd(data.national.total_usd)}`} via="csg.iwmi.org" what="national" />
          <Source name="USD by province × category" via="public tracker charts" what="adaptation, mitigation, cross-cutting" />
          <Source name="Projects by targeted hazard" via="public tracker charts" what="counts" />
        </ul>
      </Node>
      <Right />
      <Node step="2b · Finance per province" title="Adaptation + cross-cutting share" status="derived">
        Multi-province projects are counted in full in every province (province totals add to $19.5B vs {usd(data.national.total_usd)}), so
        the platform uses each province&apos;s <b>share</b> and scales USD back to national totals. Mitigation ({usd(data.national.mitigation_usd)}) is
        shown but left out, as it does not reduce local hazard risk.
      </Node>

      <Right />
      {/* ---- merge ---- */}
      <div className="lg:col-start-5 lg:row-span-2 lg:row-start-1">
        <Node step="3 · Compare shares" title="Finance gap index = risk share − finance share" status="derived" accent="border-coral/40">
          If money followed risk, each province would get its risk share of the {usd(data.national.pool_usd)} adaptation + cross-cutting pool.
          The platform reports, per province:
          <ul className="mt-2 grid gap-1 text-[12px]">
            <li>
              <b className="text-ink">Gap index</b> in percentage points (+ = underfunded)
            </li>
            <li>
              <b className="text-ink">Expected vs scaled actual</b> USD (a relative gap, not a needs estimate)
            </li>
            <li>
              <b className="text-ink">Coverage</b>: share of projects per hazard ÷ share of that hazard&apos;s risk
            </li>
            <li>
              <b className="text-ink">Quadrant</b>: high/low risk × high/low finance
            </li>
          </ul>
          <div className="mt-3 rounded-xl bg-coral-soft px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-coral">Right now</div>
            {top.map((p) => (
              <div key={p.id} className="flex justify-between text-[12.5px] text-ink num">
                <span>{p.name}</span>
                <span className="font-semibold text-coral">{pp(p.gap.index)}</span>
              </div>
            ))}
          </div>
        </Node>
      </div>

      {/* ---- output ---- */}
      <div className="flex justify-center text-ink-3 lg:col-span-5">
        <ArrowDown size={18} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:col-span-5">
        <Node step="4 · Explore" title="Map, quadrant chart, ranking" status="derived">
          Switch between risk per hazard, finance shares, gap index and coverage; export the table as CSV.
        </Node>
        <Node step="5 · Act" title="Link priorities to IWMI tools" status="live">
          Seasonal outlook and triggers (ENSO Outlook), drought monitoring (SADMS), district risk profiles (CSG AI agent).
        </Node>
        <Node step="Next · District level" title="Project-level CSG export" status="pending">
          With one row per project (budget, districts, hazards) the same pipeline runs for all 25 districts without double counting.
        </Node>
      </div>
    </div>
  );
}
