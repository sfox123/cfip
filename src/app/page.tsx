import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Map as MapIcon } from "lucide-react";
import summary from "@/data/summary.json";
import { money } from "@/lib/finance";

const FLOW = [
  { t: "Drought risk", d: "Hazard × exposure × vulnerability → Drought Risk Index", src: "DFAT · SADMS · ZADMS" },
  { t: "Risk-adjusted need", d: "What a full drought-resilience package would cost per district", src: "DFAT method, downscaled" },
  { t: "Finance flows", d: "Programme and project allocations mapped to districts", src: "CSG Project Tracker · budgets · donors" },
  { t: "Finance gap", d: "Need minus allocated: where money is missing", src: "This platform" },
  { t: "Action", d: "Seasonal outlook, triggers and contingency plans for priority districts", src: "ENSO Outlook · AWARE · SukhaRakshak" },
];

const ROADMAP = [
  { t: "Real district matrix", d: "Swap the illustrative risk and allocation values for the supervisor's district-level DRI and finance data (CSV drop-in)." },
  { t: "CSG project tracker link", d: "Pull country-level project data from the CSG dashboard into the district allocation layer." },
  { t: "Climate risk profile", d: "One-click AI district profile (e.g. Anuradhapura) generated from the CSG AI agent." },
  { t: "ENSO seasonal layer", d: "Overlay the current ENSO seasonal outlook so finance gaps can be read against the coming season." },
];

export default function Home() {
  const countries = [summary.IND, summary.ZMB, summary.LKA];
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 pb-16">
      {/* hero */}
      <section className="relative mt-8 overflow-hidden rounded-3xl bg-ink px-8 py-12 text-white md:px-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-coral opacity-30 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/80">
            Drought Finance Accelerator → district level
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Where drought risk meets the money.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white/75">
            Climate Finance Intelligence brings district-level drought risk, programme finance and the resulting finance gap together for
            India and Zambia (with Sri Lanka as a pilot). Click a district to see what is funded, what is missing, and which IWMI tools can
            guide action.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/finance-gap" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-soft">
              Open the Finance Gap Explorer <ArrowRight size={16} />
            </Link>
            <Link href="/knowledge" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm text-white hover:bg-white/10">
              Browse the Knowledge Bank
            </Link>
          </div>
        </div>
      </section>

      {/* country cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {countries.map((c) => (
          <Link
            key={c.iso}
            href="/finance-gap"
            className="rise group rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(74,58,167,0.08)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{c.country}</h2>
              <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-3">
                {c.districts} districts{c.iso === "LKA" ? " · pilot" : ""}
              </span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-coral num">{money(c.gap)}</div>
            <div className="text-[13px] text-ink-2">drought finance gap</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-coral-soft">
              <div className="h-full rounded-full bg-aqua" style={{ width: `${c.coverage}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[12px] num">
              <span className="text-aqua">{c.coverage}% covered</span>
              <span className="text-ink-3">need {money(c.need)}</span>
            </div>
            <div className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-2">
              Largest gap: <b>{c.worst.name}</b>, {c.worst.state} ({money(c.worst.gap)})
            </div>
          </Link>
        ))}
      </section>
      <p className="mt-2 text-[12px] text-amber-700">Figures use illustrative placeholder data until the district matrix is loaded.</p>

      {/* flow */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">How the pieces fit</h2>
        <p className="mt-1 text-ink-2">From the global DFAT view down to district decisions.</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-5">
          {FLOW.map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border border-line bg-white p-4">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">{i + 1}</div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.d}</p>
              <div className="mt-3 text-[11.5px] text-brand">{s.src}</div>
              {i < FLOW.length - 1 && (
                <ArrowRight size={16} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-paper text-ink-3 md:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* modules */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <Module href="/finance-gap" icon={<MapIcon size={20} />} title="Finance Gap Explorer" text="District choropleths of gap, need, allocation and DRI, with per-district programme breakdown." />
        <Module href="/knowledge" icon={<BookOpen size={20} />} title="Knowledge Bank" text="IWMI drought tools, HungerMap, PRISM and other sources, with your own links added alongside." />
        <Module href="/methodology" icon={<Calculator size={20} />} title="Methodology & data" text="How the index, need and gap are computed, and how to load real data with CSV files." />
      </section>

      {/* roadmap */}
      <section className="mt-12 rounded-3xl border border-line bg-white p-6 md:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Next steps</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-4">
          {ROADMAP.map((r, i) => (
            <div key={r.t}>
              <div className="text-[12px] font-semibold text-coral">0{i + 1}</div>
              <div className="mt-1 font-semibold">{r.t}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
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
