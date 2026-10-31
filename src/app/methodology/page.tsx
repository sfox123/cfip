export const metadata = { title: "Methodology | Climate Finance Intelligence" };

const GAP_ROWS = [
  ["Risk per hazard", "R(p,h) = ∛(H × E × V)", "INFORM-style geometric mean of hazard, exposure and vulnerability (each 0–1). Components not yet loaded are left out of the mean."],
  ["Overall climate risk", "R(p) = Σ w(h) · R(p,h) / Σ w", "Weighted mean over flood, drought, landslide and water scarcity (equal weights by default, set in scripts/build-lka-gap.mjs)."],
  ["Risk share", "rs(p) = R(p) / Σ R", "Province share of national climate risk."],
  ["Finance", "F(p) = Adaptation + Cross-cutting", "CSG investment. Mitigation is shown but excluded: it does not reduce local hazard risk."],
  ["Finance share", "fs(p) = F(p) / Σ F", "Share of adaptation-relevant investment. Using shares largely cancels the multi-province over-count."],
  ["Finance gap index", "gap(p) = rs(p) − fs(p)", "> 0 = underfunded relative to risk (percentage points)."],
  ["Scaled finance (est.)", "F_adj(p,c) = F(p,c) × National(c) / Σ F(·,c)", "Per category, scales the over-counted province totals back to the de-duplicated national total. Labelled “estimated”."],
  ["Expected allocation", "E(p) = rs(p) × (National Adapt + Cross)", "The “fair share” if money followed risk (pool = 7.28 B USD)."],
  ["Estimated gap (USD)", "E(p) − F_adj(p)", "A relative (equity) gap, not a full needs estimate. Sums to zero across provinces."],
  ["Funding per risk unit", "F_adj(p) / R(p)", "Lower = less money per unit of risk."],
  ["Hazard coverage ratio", "(P(p,h)/Σ P(h)) / (R(p,h)/Σ R(h))", "P = number of CSG projects targeting hazard h. Below 1× = hazard under-targeted in that province."],
  ["Quadrant", "rs vs 1/n, fs vs 1/n", "High/low risk and high/low finance relative to an equal share (1/9 for provinces)."],
];

const HAZARD_ROWS = [
  ["Flood", "Mean annual maximum 5-day rainfall + mean number of days ≥ 30 mm (province-mean CHIRPS daily, 1991–2025)", "Population (WorldPop 2026)"],
  ["Drought", "Coefficient of variation of annual rainfall + frequency of 3-month totals below 60% of their climatology", "Crop area (IFPRI SPAM 2020)"],
  ["Landslide", "Mean terrain slope × mean annual maximum 3-day rainfall (both scaled; slope gates the score, so flat provinces stay near 0). Slope from SRTM 90 m elevation (OpenTopoData API), sampled on a ~2 km grid", "Population (WorldPop 2026)"],
  ["Water scarcity", "Inverse mean annual rainfall (aridity) + mean longest annual dry spell (consecutive days < 2.5 mm)", "Crop area (IFPRI SPAM 2020)"],
  ["Vulnerability", "Not yet loaded. Add a 0–1 score per province (e.g. DCS HIES poverty headcount) in the vulnerability_score column", "—"],
];

const DROUGHT_ROWS = [
  ["Hazard (H)", "0–1", "Drought frequency and severity (e.g. SPI / IDSI history from SADMS & ZADMS)."],
  ["Exposure (E)", "0–1", "Rainfed cropland, rural population and agricultural assets exposed."],
  ["Vulnerability (V)", "0–1", "Poverty, irrigation access, livelihood diversity, coping capacity."],
  ["Drought Risk Index (DRI)", "0–1", "∛(H × E × V) — geometric mean, as in INFORM and the global DFAT matrix."],
  ["Risk-adjusted need", "USD M", "DRI × baseline × resilience cost factor (k), scaled by hazard."],
  ["Drought finance gap", "USD M", "Need − allocated. Negative values are shown as a surplus."],
];

const code = "rounded bg-white px-1 text-[0.92em]";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[920px] px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology & data</h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        The Sri Lanka explorer combines a multi-hazard risk layer with real climate-finance data from the IWMI Climate-Smart Governance (CSG)
        Project Tracker, and shows where risk is high but adaptation investment is low.
      </p>

      <h2 className="mt-10 text-xl font-semibold">1. Climate finance: CSG Project Tracker</h2>
      <p className="mt-3 leading-relaxed text-ink-2">
        Province investment by category (adaptation, mitigation, cross-cutting) and project counts by targeted hazard come from the public
        charts of the{" "}
        <a className="text-brand hover:underline" href="https://csg.iwmi.org/project_tracker.html" target="_blank" rel="noreferrer">
          CSG Project Tracker
        </a>{" "}
        (Sri Lanka). Nationally: 131 projects, 10.26 B USD (adaptation 4.27 B, mitigation 2.98 B, cross-cutting 3.01 B).
      </p>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13.5px] leading-relaxed text-amber-900">
        <b>Double counting.</b> The province values add up to 19.46 B USD against a 10.26 B national total, because a project covering
        several provinces is counted in full in every province (adaptation ≈ 2.2× over-count, mitigation ≈ 2.5×; cross-cutting is slightly
        under, because some projects are national-only). Province USD is therefore never shown as money spent in that province: the gap uses{" "}
        <b>shares</b>, and USD values are <b>scaled estimates</b>.
      </div>

      <h2 className="mt-10 text-xl font-semibold">2. Hazard and risk layer</h2>
      <p className="mt-3 leading-relaxed text-ink-2">
        Built by <code className={code}>npm run data:hazard</code> from public services: CHIRPS daily rainfall, WorldPop population and SPAM
        crop area via the{" "}
        <a className="text-brand hover:underline" href="https://enso.iwmi.org" target="_blank" rel="noreferrer">
          IWMI ENSO Outlook API
        </a>
        , and terrain from SRTM elevation (OpenTopoData). Each indicator is scaled as value ÷ national maximum, so ratios between provinces are kept and
        the most-affected province scores 1. Raw values are in <code className={code}>data-raw/hazard/lka_province_indicators.csv</code>.
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-paper text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5">Hazard</th>
              <th className="px-4 py-2.5">Hazard score (H)</th>
              <th className="px-4 py-2.5">Exposure (E)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {HAZARD_ROWS.map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-4 py-2.5 font-medium">{a}</td>
                <td className="px-4 py-2.5 text-ink-2">{b}</td>
                <td className="px-4 py-2.5 text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        Limits: CHIRPS is averaged over each province, which smooths local extremes; these are rainfall-based hazard proxies, not flood
        extent or landslide inventories. Replace or refine them (e.g. JRC surface-water flood frequency, NBRO landslide zonation, DMC records)
        by editing <code className={code}>data-raw/hazard/lka_province_hazard.csv</code> and documenting the source column. If that file is
        missing, the build uses demo values and the explorer shows a “Demo hazard data” banner.
      </p>

      <h2 className="mt-10 text-xl font-semibold">3. Gap metrics</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead className="bg-paper text-[12px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2.5">Metric</th>
              <th className="px-4 py-2.5">Formula</th>
              <th className="px-4 py-2.5">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {GAP_ROWS.map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-4 py-2.5 font-medium">{a}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-ink-2">{b}</td>
                <td className="px-4 py-2.5 text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        The USD gap is a relative (equity) gap. An absolute, need-based gap needs loss and cost data (e.g. average annual loss) and is a later
        step.
      </p>

      <h2 className="mt-10 text-xl font-semibold">4. Updating the data</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink-2">
        <li>
          <b>Refresh CSG province figures:</b> on the Project Tracker page (Sri Lanka) read the sunburst and Sankey charts from the browser
          console (see the plan in the repo) and overwrite <code className={code}>data-raw/csg/*.csv</code> and{" "}
          <code className={code}>lka_national.json</code>.
        </li>
        <li>
          <b>Refresh hazard data:</b> <code className={code}>npm run data:hazard -- --refresh</code>. Vulnerability scores typed into the
          hazard CSV are kept.
        </li>
        <li>
          <b>District level:</b> project-level data is not public (the tracker API needs a CSG login). Ask the IWMI CSG team for an export with
          one row per project:{" "}
          <code className={code}>project_id, name, category, budget_usd, start_year, end_year, status, funder, provinces, districts, hazards</code>{" "}
          (lists separated by <code className={code}>;</code>). Save it as <code className={code}>data-raw/csg/lka_projects_export.csv</code>{" "}
          and add <code className={code}>data-raw/hazard/lka_district_hazard.csv</code> (same columns with <code className={code}>district</code>).
          Budgets are split equally across each project&apos;s districts, which removes the double counting.
        </li>
        <li>
          Run <code className={code}>npm run data</code>. The build stops with an error if a name does not match the boundaries or if the
          shares do not sum to 1.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Drought pilot (India · Zambia)</h2>
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13.5px] leading-relaxed text-amber-900">
        The India and Zambia drought explorer still uses <b>illustrative placeholders</b> for hazard, exposure, vulnerability, baselines and
        allocations. Do not cite those numbers. Load <code className={code}>data-raw/&lt;iso&gt;_metrics.csv</code> and{" "}
        <code className={code}>&lt;iso&gt;_projects.csv</code> (templates in <code className={code}>data-raw/templates/</code>) and run{" "}
        <code className={code}>npm run data:drought</code>.
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <tbody className="divide-y divide-line">
            {DROUGHT_ROWS.map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-4 py-2.5 font-medium">{a}</td>
                <td className="px-4 py-2.5 text-ink-3">{b}</td>
                <td className="px-4 py-2.5 text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Sources</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
        <li>Finance: IWMI Climate-Smart Governance (CSG) Project Tracker, csg.iwmi.org.</li>
        <li>Rainfall: UCSB-CHG CHIRPS daily, via the IWMI ENSO Outlook API (enso.iwmi.org).</li>
        <li>Population: WorldPop 2026 (R2025A); crop area: IFPRI SPAM 2020 v2r2; both via the ENSO Outlook API.</li>
        <li>Terrain: NASA SRTM 90 m via the OpenTopoData API.</li>
        <li>Boundaries: geoBoundaries gbOpen ADM1/ADM2 (CC BY 4.0), simplified.</li>
        <li>Index design: INFORM Risk methodology; IWMI global drought finance gap matrix (DFAT).</li>
        <li>Basemap: Esri World Light Gray Canvas (© Esri, HERE, Garmin, © OpenStreetMap contributors).</li>
      </ul>
    </main>
  );
}
