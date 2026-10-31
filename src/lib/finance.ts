export type Allocation = { id: string; amount: number; year: string };

export type DistrictProps = {
  id: string;
  name: string;
  state: string;
  hazard: number;
  exposure: number;
  vulnerability: number;
  dri: number;
  baseline: number;
  need: number;
  allocated: number;
  gap: number;
  gapPct: number;
  coverage: number;
  allocations: Allocation[];
};

export type Programme = {
  id: string;
  name: string;
  funder: string;
  instrument: string;
  theme: string;
};

export type CountryData = {
  iso: string;
  country: string;
  demo: { metrics: boolean; allocations: boolean };
  units: string;
  generated: string;
  programmes: Programme[];
  geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry, DistrictProps>;
};

export const COUNTRIES = [
  { iso: "IND", name: "India", admin1: "State", admin2: "District" },
  { iso: "ZMB", name: "Zambia", admin1: "Province", admin2: "District" },
  { iso: "LKA", name: "Sri Lanka", admin1: "Province", admin2: "District" },
] as const;

export type MetricKey = "gap" | "gapPct" | "dri" | "need" | "allocated" | "hazard" | "exposure" | "vulnerability";

export const METRICS: { key: MetricKey; label: string; short: string; desc: string; kind: "money" | "pct" | "index" }[] = [
  { key: "gap", label: "Drought finance gap", short: "Gap", desc: "Risk-adjusted need minus allocated finance. Negative = more allocated than modelled need.", kind: "money" },
  { key: "gapPct", label: "Gap as % of need", short: "Gap %", desc: "Share of the risk-adjusted need that is not yet financed.", kind: "pct" },
  { key: "dri", label: "Drought Risk Index", short: "DRI", desc: "Geometric mean of hazard, exposure and vulnerability (0–1).", kind: "index" },
  { key: "need", label: "Risk-adjusted need", short: "Need", desc: "DRI × exposed agricultural baseline × resilience cost factor.", kind: "money" },
  { key: "allocated", label: "Allocated finance", short: "Allocated", desc: "Sum of programme allocations recorded for the district.", kind: "money" },
  { key: "hazard", label: "Hazard", short: "Hazard", desc: "Drought hazard (frequency / severity) score, 0–1.", kind: "index" },
  { key: "exposure", label: "Exposure", short: "Exposure", desc: "Rainfed cropland, population and assets exposed, 0–1.", kind: "index" },
  { key: "vulnerability", label: "Vulnerability", short: "Vuln.", desc: "Socio-economic sensitivity and lack of coping capacity, 0–1.", kind: "index" },
];

export const RAMPS = {
  gap: ["#fde7df", "#f9c2ae", "#f29a7f", "#e8664f", "#c94a3a", "#8f2b27"],
  surplus: ["#1f9e93", "#9fd8d1"],
  risk: ["#efedfb", "#d2cbf3", "#ab9fe6", "#8270d6", "#5a47b5", "#33257a"],
  money: ["#e3f5f3", "#b5e3dd", "#7fcdc3", "#47b2a6", "#1f9e93", "#13706a"],
};

export type Legend = { color: string; label: string }[];

function quantiles(values: number[], n: number) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return [];
  const out: number[] = [];
  for (let i = 1; i < n; i++) out.push(v[Math.floor((i / n) * (v.length - 1))]);
  return Array.from(new Set(out));
}

/** Build a MapLibre `step` colour expression + legend for a metric. */
export function colourScale(metric: MetricKey, features: DistrictProps[]) {
  const vals = features.map((f) => f[metric] as number);
  const fmt = (x: number) => formatMetric(metric, x);

  if (metric === "gap" || metric === "gapPct") {
    const pos = vals.filter((x) => x > 0);
    const neg = vals.filter((x) => x < 0);
    const negMid = neg.length ? quantiles(neg, 2)[0] ?? Math.min(...neg) : -1;
    const posBreaks = metric === "gapPct" ? [20, 40, 60, 80] : quantiles(pos, 5).slice(0, 4);
    const stops: (string | number)[] = [RAMPS.surplus[0], negMid, RAMPS.surplus[1], 0, RAMPS.gap[0]];
    posBreaks.forEach((b, i) => stops.push(b, RAMPS.gap[i + 1]));
    const legend: Legend = [
      { color: RAMPS.surplus[0], label: `< ${fmt(negMid)}` },
      { color: RAMPS.surplus[1], label: "Surplus" },
      { color: RAMPS.gap[0], label: `0 – ${fmt(posBreaks[0])}` },
      ...posBreaks.map((b, i) => ({
        color: RAMPS.gap[i + 1],
        label: i === posBreaks.length - 1 ? `> ${fmt(b)}` : `${fmt(b)} – ${fmt(posBreaks[i + 1])}`,
      })),
    ];
    return { expr: ["step", ["get", metric], ...stops], legend };
  }

  const ramp = metric === "allocated" ? RAMPS.money : metric === "need" ? RAMPS.gap : RAMPS.risk;
  const breaks = quantiles(vals, ramp.length).slice(0, ramp.length - 1);
  const stops: (string | number)[] = [ramp[0]];
  breaks.forEach((b, i) => stops.push(b, ramp[i + 1]));
  const legend: Legend = ramp.slice(0, breaks.length + 1).map((c, i) => ({
    color: c,
    label: i === 0 ? `< ${fmt(breaks[0])}` : i === breaks.length ? `> ${fmt(breaks[i - 1])}` : `${fmt(breaks[i - 1])} – ${fmt(breaks[i])}`,
  }));
  return { expr: ["step", ["get", metric], ...stops], legend };
}

export function money(v: number) {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (a >= 1000) return `${s}$${(a / 1000).toFixed(a >= 10000 ? 1 : 2)}B`;
  if (a >= 100) return `${s}$${a.toFixed(0)}M`;
  if (a >= 10) return `${s}$${a.toFixed(1)}M`;
  return `${s}$${a.toFixed(2)}M`;
}

export function formatMetric(metric: MetricKey, v: number) {
  const m = METRICS.find((x) => x.key === metric)!;
  if (m.kind === "money") return money(v);
  if (m.kind === "pct") return `${v.toFixed(0)}%`;
  return v.toFixed(2);
}

/** Related live tools per country, used in the district panel. */
export const RELATED_TOOLS: Record<string, { name: string; url: string; what: string }[]> = {
  IND: [
    { name: "SADMS", url: "https://dms.iwmi.org", what: "Current drought severity & district contingency plan" },
    { name: "SukhaRakshak AI", url: "https://dms.iwmi.org/sukharakshak-ai", what: "Farm advisory for this district" },
    { name: "AgRISE", url: "https://agrise.app/", what: "Crop risk score & PMFBY insurance evidence" },
    { name: "ENSO Outlook", url: "https://enso.iwmi.org", what: "Seasonal outlook & Ready–Set–Go triggers" },
  ],
  ZMB: [
    { name: "ZADMS", url: "https://zadmsdemo.iwmi.org", what: "Current drought severity & bulletins" },
    { name: "CSG Dashboard", url: "https://csg.iwmi.org/index.html", what: "Project tracker & adaptation finance" },
    { name: "HydroSecure", url: "https://hydrosecure-demo.iwmi.org/", what: "Africa multi-hazard map" },
    { name: "ENSO Outlook", url: "https://enso.iwmi.org", what: "Seasonal outlook & Ready–Set–Go triggers" },
  ],
  LKA: [
    { name: "SADMS", url: "https://dms.iwmi.org", what: "Current drought severity" },
    { name: "CSG Dashboard", url: "https://csg.iwmi.org/index.html", what: "Project tracker & WAF index" },
    { name: "CSG AI Agent", url: "https://csg.iwmi.org/aiagent/#/home", what: "Draft a district climate risk profile" },
    { name: "ENSO Outlook", url: "https://enso.iwmi.org", what: "Seasonal outlook & Ready–Set–Go triggers" },
  ],
};

export const INSTRUMENT_COLOURS: Record<string, string> = {
  Insurance: "#4a3aa7",
  Subsidy: "#8270d6",
  Grant: "#1f9e93",
  "Public works": "#47b2a6",
  "Loan-financed programme": "#e0a12b",
  "Research & extension": "#b5a8ee",
  "Disaster response": "#e8664f",
  "Social protection": "#f29a7f",
  "Technical assistance": "#7fcdc3",
};
