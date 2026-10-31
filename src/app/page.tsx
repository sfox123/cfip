import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Map as MapIcon, Sprout } from "lucide-react";
import gapJson from "../../public/data/lka_gap.json";
import summary from "@/data/summary.json";
import { money } from "@/lib/finance";
import { pct, pp, usd, type GapData } from "@/lib/hazardFinance";
import PipelineDiagram from "@/components/PipelineDiagram";

const gap = gapJson as unknown as GapData;

const ROADMAP = [
  { t: "Vulnerability layer", d: "Add a province poverty / deprivation score (e.g. DCS HIES) so risk becomes the full ∛(hazard × exposure × vulnerability)." },
  { t: "District level for Sri Lanka", d: "Load a project-level export from the CSG team to split budgets across districts and remove the double counting." },
  { t: "Real matrix for India · Zambia", d: "Replace the drought pilot's placeholder risk and allocation values with the district matrix and programme data." },
  { t: "Seasonal lens", d: "Overlay the ENSO seasonal outlook so finance gaps can be read against the coming season's hazard." },
];

export default function Home() {
  const ranked = [...gap.provinces].sort((a, b) => b.gap.index - a.gap.index);
  const lead = ranked[0];
  const priority = ranked.filter((p) => p.gap.quadrant === "high-risk-low-finance");
  const pilots = [summary.IND, summary.ZMB];

  return (
    <main className="w-full pb-16">
      {/* hero */}
      <section className="relative overflow-hidden bg-forest text-white">
        <svg className="absolute inset-x-0 bottom-0 h-40 w-full text-water/25" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden>
          <path d="M0 96c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v64H0z" fill="currentColor" />
          <path d="M0 120c120-24 240-24 360 0s240 24 360 0 240-24 360 0 240 24 360 0v40H0z" fill="currentColor" opacity=".6" />
        </svg>
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 py-14 md:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/75">
              <Sprout size={13} className="text-water" /> IWMI · CGIAR Climate Action
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight md:text-[3.4rem]">
              Where climate risk
              <br />
              meets the <span className="text-water">money</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              Climate Finance Intelligence puts hazard risk and climate finance on the same map, province by province, so it is clear where risk
              is high but adaptation investment is low.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/hazard-finance" className="inline-flex items-center gap-2 rounded-xl bg-water px-4 py-2.5 text-sm font-semibold text-forest hover:bg-white">
                Explore the Sri Lanka finance gap <ArrowRight size={16} />
              </Link>
              <Link href="/finance-gap" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm text-white hover:bg-white/10">
                Drought explorer: India · Zambia
              </Link>
            </div>
          </div>

          <div className="self-end rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
            <div className="text-[12px] uppercase tracking-wider text-white/60">Sri Lanka · live CSG data</div>
            <div className="mt-3 grid grid-cols-2 gap-5">
              <Stat value={usd(gap.national.pool_usd)} label="adaptation + cross-cutting finance" />
              <Stat value={String(gap.national.projects)} label="climate projects tracked" />
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="text-[12px] text-white/60">Largest gap relative to risk</div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold">{lead.name}</span>
                <span className="text-2xl font-semibold text-[#ff8a72] num">{pp(lead.gap.index)}</span>
              </div>
              <div className="mt-1 text-[13px] text-white/70 num">
                {pct(lead.risk.share)} of national risk, {pct(lead.finance.share)} of finance
              </div>
            </div>
            {priority.length > 1 && (
              <div className="mt-4 text-[13px] text-white/70">
                High risk, low finance: <span className="text-white">{priority.map((p) => p.name).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        {/* pipeline */}
        <section className="mt-14">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">How the gap is calculated</h2>
            <p className="mt-2 text-ink-2">
              Two lanes of public data, one for risk and one for money, meet in a single comparison. Each step is labelled with where its data
              comes from and whether it is live, computed by this platform or still pending.
            </p>
          </div>
          <div className="mt-6">
            <PipelineDiagram data={gap} />
          </div>
        </section>

        {/* tracks */}
        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <Link href="/hazard-finance" className="group rounded-2xl border border-brand/30 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(11,90,75,0.10)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sri Lanka</h3>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">Live data · 9 provinces</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-coral num">{pp(lead.gap.index)}</div>
            <div className="text-[13px] text-ink-2">largest finance gap index ({lead.name})</div>
            <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-2">
              Flood, drought, landslide and water-scarcity risk against CSG adaptation finance.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[13px] font-medium text-brand">
              Open explorer <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </div>
          </Link>
          {pilots.map((c) => (
            <Link key={c.iso} href="/finance-gap" className="group rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(11,90,75,0.08)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{c.country}</h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Illustrative · {c.districts} districts</span>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-ink-2 num">{money(c.gap)}</div>
              <div className="text-[13px] text-ink-2">modelled drought finance gap (placeholder)</div>
              <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-2">
                District drought risk → need → allocations. Values are placeholders until the district matrix is loaded.
              </p>
              <div className="mt-3 flex items-center gap-1 text-[13px] font-medium text-brand">
                Open drought explorer <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>

        {/* modules */}
        <section className="mt-12 grid gap-4 md:grid-cols-3">
          <Module href="/hazard-finance" icon={<MapIcon size={20} />} title="Hazard × Finance" text="Province map of risk, finance shares, gap index and hazard coverage, with a quadrant chart and ranking." />
          <Module href="/knowledge" icon={<BookOpen size={20} />} title="Knowledge Bank" text="IWMI tools, HungerMap, PRISM and other sources, with your own links added alongside." />
          <Module href="/methodology" icon={<Calculator size={20} />} title="Methodology & data" text="Sources, formulas, the CSG double-counting caveat and how to load new data." />
        </section>

        {/* roadmap */}
        <section className="mt-12 rounded-3xl border border-line bg-white p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Next steps</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-4">
            {ROADMAP.map((r, i) => (
              <div key={r.t}>
                <div className="text-[12px] font-semibold text-water">0{i + 1}</div>
                <div className="mt-1 font-semibold">{r.t}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight num">{value}</div>
      <div className="mt-0.5 text-[12.5px] leading-snug text-white/65">{label}</div>
    </div>
  );
}

function Module({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-white p-5 transition hover:border-brand/40">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</div>
      <div className="mt-4 flex items-center gap-1.5 font-semibold">
        {title} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{text}</p>
    </Link>
  );
}
