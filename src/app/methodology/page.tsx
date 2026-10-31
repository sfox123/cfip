export const metadata = { title: "Methodology | Climate Finance Intelligence" };

const ROWS = [
  ["Hazard (H)", "0–1", "Drought frequency and severity (e.g. SPI / IDSI history from SADMS & ZADMS)."],
  ["Exposure (E)", "0–1", "Rainfed cropland, rural population and agricultural assets exposed."],
  ["Vulnerability (V)", "0–1", "Poverty, irrigation access, livelihood diversity, coping capacity."],
  ["Drought Risk Index (DRI)", "0–1", "∛(H × E × V) — geometric mean, as in INFORM and the global DFAT matrix."],
  ["Baseline", "USD M", "Agricultural output / asset value of the district."],
  ["Risk-adjusted need", "USD M", "DRI × baseline × resilience cost factor (k), scaled by hazard."],
  ["Allocated finance", "USD M", "Sum of programme allocations recorded for the district and year."],
  ["Drought finance gap", "USD M", "Need − allocated. Negative values are shown as a surplus."],
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[920px] px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology & data</h1>
      <p className="mt-3 text-ink-2 leading-relaxed">
        The platform takes the country-level logic of the Drought Finance Accelerator Tool (DFAT) — Drought Risk Index, risk-adjusted need,
        allocated finance and the drought finance gap — and applies it to districts, so finance can be compared with risk where programmes
        are actually delivered.
      </p>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13.5px] leading-relaxed text-amber-900">
        <b>Current status:</b> district boundaries (geoBoundaries ADM2) and programme names are real. Hazard, exposure, vulnerability,
        baselines and allocations are <b>illustrative placeholders</b> shaped by broad regional drought patterns, so the interface can be
        reviewed before the district matrix is ready. Do not cite the numbers.
      </div>

      <h2 className="mt-10 text-xl font-semibold">Indicators</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-paper text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5">Indicator</th>
              <th className="px-4 py-2.5">Unit</th>
              <th className="px-4 py-2.5">Definition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROWS.map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-4 py-2.5 font-medium">{a}</td>
                <td className="px-4 py-2.5 text-ink-3">{b}</td>
                <td className="px-4 py-2.5 text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Loading real data</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-2 leading-relaxed">
        <li>
          Fill <code className="rounded bg-white px-1">data-raw/templates/&lt;iso&gt;_metrics.csv</code> (one row per district:
          hazard, exposure, vulnerability, baseline_usd_m) and save it as <code className="rounded bg-white px-1">data-raw/&lt;iso&gt;_metrics.csv</code>.
        </li>
        <li>
          Fill <code className="rounded bg-white px-1">data-raw/templates/&lt;iso&gt;_projects.csv</code> (district_id, programme_id,
          amount_usd_m, year) from the CSG project tracker, budget documents or donor data, and save it as{" "}
          <code className="rounded bg-white px-1">data-raw/&lt;iso&gt;_projects.csv</code>. Add new programmes to{" "}
          <code className="rounded bg-white px-1">data-raw/programmes.json</code>.
        </li>
        <li>
          Run <code className="rounded bg-white px-1">npm run data</code>. The illustrative-data banners disappear automatically once both
          files are present for a country.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Sources</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
        <li>Boundaries: geoBoundaries gbOpen ADM1/ADM2 (India 735 districts, Zambia 116, Sri Lanka 25), simplified.</li>
        <li>Index design: INFORM Risk methodology; IWMI global drought finance gap matrix (DFAT).</li>
        <li>Programmes: national schemes and donor projects (PMFBY, PMKSY, MGNREGS, Atal Bhujal, PoCRA, CASP, SCRALA, TRALARD, CRIWMP, CSIAP…).</li>
        <li>Basemap: Esri World Light Gray Canvas (© Esri, HERE, Garmin, © OpenStreetMap contributors).</li>
      </ul>
    </main>
  );
}
