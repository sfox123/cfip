export const HAZARDS = ["flood", "drought", "landslide", "water_scarcity"] as const;
export type Hazard = (typeof HAZARDS)[number];
export type HazardOrOverall = Hazard | "overall";

export const HAZARD_LABEL: Record<HazardOrOverall, string> = {
  flood: "Flood",
  drought: "Drought",
  landslide: "Landslide",
  water_scarcity: "Water scarcity",
  overall: "Overall risk",
};

export type Quadrant = "high-risk-low-finance" | "high-risk-high-finance" | "low-risk-low-finance" | "low-risk-high-finance";

export const QUADRANT: Record<Quadrant, { label: string; tone: string }> = {
  "high-risk-low-finance": { label: "High risk · low finance", tone: "bg-coral-soft text-coral" },
  "high-risk-high-finance": { label: "High risk · high finance", tone: "bg-brand-soft text-brand" },
  "low-risk-low-finance": { label: "Low risk · low finance", tone: "bg-paper text-ink-2" },
  "low-risk-high-finance": { label: "Low risk · high finance", tone: "bg-aqua-soft text-aqua" },
};

export type Province = {
  id: string;
  name: string;
  finance: {
    adaptation: number;
    mitigation: number;
    crosscutting: number;
    adj_adaptation: number;
    adj_mitigation: number;
    adj_crosscutting: number;
    adj_usd: number;
    share: number;
    mitigation_share: number;
  };
  projects_by_hazard: Record<Hazard | "heatwave", number>;
  hazard: Record<Hazard, { hazard: number; exposure: number; vulnerability: number | null }>;
  risk: Record<Hazard, number> & { overall: number; share: number };
  gap: {
    index: number;
    expected_usd: number;
    gap_usd: number;
    usd_per_risk: number;
    quadrant: Quadrant;
    coverage: Record<Hazard, number | null>;
  };
};

export type GapData = {
  iso: string;
  country: string;
  unit: "province" | "district";
  generated: string;
  demo: { hazard: boolean; finance: boolean };
  pending: string[];
  sources: { finance: string; finance_retrieved: string; hazard: Partial<Record<Hazard, string>> };
  national: {
    total_usd: number;
    adaptation_usd: number;
    mitigation_usd: number;
    crosscutting_usd: number;
    projects: number;
    pool_usd: number;
    raw_province_sum_usd: number | null;
  };
  hazards: Hazard[];
  provinces: Province[];
  geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, number | string>>;
};

export type LayerKey = "risk" | "finance" | "mitigation" | "gap" | "coverage";

export const LAYERS: { key: LayerKey; group: string; label: string; desc: string }[] = [
  { key: "risk", group: "Hazard", label: "Climate risk", desc: "∛(hazard × exposure × vulnerability) for the selected hazard, or the mean over all four. Vulnerability is left out until it is loaded." },
  { key: "finance", group: "Finance", label: "Adaptation + cross-cutting share", desc: "Each province's share of CSG adaptation and cross-cutting investment." },
  { key: "mitigation", group: "Finance", label: "Mitigation share (info only)", desc: "Share of CSG mitigation investment. Not used in the gap: mitigation does not reduce local hazard risk." },
  { key: "gap", group: "Gap", label: "Finance gap index", desc: "Risk share − finance share. Red = underfunded relative to risk; teal = more finance than its risk share." },
  { key: "coverage", group: "Gap", label: "Hazard coverage ratio", desc: "Share of CSG projects targeting the hazard ÷ share of that hazard's risk. Below 1× = under-targeted." },
];

export function usd(v: number) {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${a.toFixed(0)}`;
}
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)} pp`;
export const ratio = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}×`);
