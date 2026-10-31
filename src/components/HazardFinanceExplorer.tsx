"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, Popup as MLPopup, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, Download, Info, Layers, X } from "lucide-react";
import {
  HAZARDS,
  HAZARD_LABEL,
  LAYERS,
  QUADRANT,
  pct,
  pp,
  ratio,
  usd,
  type GapData,
  type HazardOrOverall,
  type LayerKey,
  type Province,
} from "@/lib/hazardFinance";
import ProvincePanel from "./ProvincePanel";
import QuadrantChart from "./QuadrantChart";

const BASE_STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors · Boundaries: geoBoundaries · Finance: IWMI CSG",
    },
  },
  layers: [
    { id: "bg", type: "background" as const, paint: { "background-color": "#f3f1ec" } },
    { id: "basemap", type: "raster" as const, source: "basemap", paint: { "raster-opacity": 0.85 } },
  ],
};

const RISK_RAMP = ["#efedfb", "#d2cbf3", "#ab9fe6", "#8270d6", "#5a47b5", "#33257a"];
const MONEY_RAMP = ["#e3f5f3", "#b5e3dd", "#7fcdc3", "#47b2a6", "#1f9e93", "#13706a"];
const MIT_RAMP = ["#f3f1ec", "#e3ddd0", "#cbbfa6", "#ad9c78", "#8a7752", "#5e4f33"];
// diverging: blue (over-funded / over-targeted) – neutral – coral (underfunded / under-targeted)
const DIVERGING = ["#2c5d9e", "#7ea3cf", "#e8e6e1", "#f29a7f", "#c94a3a"];

type Scale = { expr: ExpressionSpecification; stops: string[]; min: string; mid?: string; max: string; title: string };

function scaleFor(layer: LayerKey, hazard: HazardOrOverall, provinces: Province[]): Scale {
  const seq = (prop: string, ramp: string[], values: number[], fmt: (v: number) => string, title: string): Scale => {
    const max = Math.max(...values, 1e-9);
    const expr = ["interpolate", ["linear"], ["get", prop], ...ramp.flatMap((c, i) => [(max * i) / (ramp.length - 1), c])] as unknown as ExpressionSpecification;
    return { expr, stops: ramp, min: fmt(0), max: fmt(max), title };
  };
  if (layer === "risk") {
    const h = hazard;
    return seq(`risk_${h}`, RISK_RAMP, provinces.map((p) => p.risk[h]), (v) => v.toFixed(2), `${HAZARD_LABEL[h]}${h === "overall" ? "" : " risk"} (0–1)`);
  }
  if (layer === "finance") return seq("finance_share", MONEY_RAMP, provinces.map((p) => p.finance.share), (v) => pct(v, 0), "Adaptation + cross-cutting share");
  if (layer === "mitigation") return seq("mitigation_share", MIT_RAMP, provinces.map((p) => p.finance.mitigation_share), (v) => pct(v, 0), "Mitigation share (not in gap)");
  if (layer === "gap") {
    const m = Math.max(...provinces.map((p) => Math.abs(p.gap.index)), 1e-9);
    const expr = ["interpolate", ["linear"], ["get", "gap_index"], -m, DIVERGING[0], -m / 2, DIVERGING[1], 0, DIVERGING[2], m / 2, DIVERGING[3], m, DIVERGING[4]] as unknown as ExpressionSpecification;
    return { expr, stops: DIVERGING, min: `${pp(-m)} over`, mid: "parity", max: `${pp(m)} under`, title: "Finance gap index" };
  }
  // coverage ratio on a log2 scale, 0.25× … 4×; -1 = no data
  const h = hazard === "overall" ? "drought" : hazard;
  const expr = [
    "case",
    ["<", ["get", `cov_${h}`], 0],
    "#d9d6cf",
    ["interpolate", ["linear"], ["log2", ["max", ["get", `cov_${h}`], 0.01]], -2, DIVERGING[4], -1, DIVERGING[3], 0, DIVERGING[2], 1, DIVERGING[1], 2, DIVERGING[0]],
  ] as unknown as ExpressionSpecification;
  return { expr, stops: [...DIVERGING].reverse(), min: "≤0.25× under", mid: "1×", max: "≥4× over", title: `${HAZARD_LABEL[h]} coverage ratio` };
}

function valueFor(layer: LayerKey, hazard: HazardOrOverall, p: Province) {
  if (layer === "risk") return p.risk[hazard].toFixed(2);
  if (layer === "finance") return pct(p.finance.share);
  if (layer === "mitigation") return pct(p.finance.mitigation_share);
  if (layer === "gap") return pp(p.gap.index);
  return ratio(p.gap.coverage[hazard === "overall" ? "drought" : hazard]);
}

function bboxOf(features: GeoJSON.Feature[]): [number, number, number, number] {
  let [x0, y0, x1, y1] = [180, 90, -180, -90];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  features.forEach((f) => walk((f.geometry as GeoJSON.Polygon).coordinates));
  return [x0, y0, x1, y1];
}

export default function HazardFinanceExplorer() {
  const [data, setData] = useState<GapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layer, setLayer] = useState<LayerKey>("gap");
  const [hazard, setHazard] = useState<HazardOrOverall>("overall");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<MLPopup | null>(null);
  const hoverId = useRef<string | null>(null);
  const tooltipRef = useRef<(id: string) => string>(() => "");

  const provinces = useMemo(() => data?.provinces ?? [], [data]);
  const byId = useMemo(() => Object.fromEntries(provinces.map((p) => [p.id, p])), [provinces]);
  const selected = selectedId ? byId[selectedId] ?? null : null;
  const effectiveHazard: HazardOrOverall = layer === "coverage" && hazard === "overall" ? "drought" : hazard;
  const scale = useMemo(() => (provinces.length ? scaleFor(layer, effectiveHazard, provinces) : null), [layer, effectiveHazard, provinces]);
  const ranking = useMemo(() => [...provinces].sort((a, b) => b.gap.index - a.gap.index), [provinces]);
  const layerDef = LAYERS.find((l) => l.key === layer)!;

  // the map's hover handler is bound once, so it reads the current layer through a ref
  useEffect(() => {
    tooltipRef.current = (id) => {
      const p = byId[id];
      if (!p) return "";
      const label = layer === "risk" ? HAZARD_LABEL[effectiveHazard] : layerDef.label;
      return (
        `<div style="font-size:13px;font-weight:600">${p.name}</div>` +
        `<div style="margin-top:2px;font-size:12px">${label}: <b>${valueFor(layer, effectiveHazard, p)}</b></div>` +
        `<div style="font-size:11px;color:#8a87a0">${QUADRANT[p.gap.quadrant].label}</div>`
      );
    };
  }, [byId, layer, effectiveHazard, layerDef]);

  useEffect(() => {
    fetch("/data/lka_gap.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  // ---- init map once ----
  useEffect(() => {
    let disposed = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (disposed || !mapEl.current) return;
      // Turbopack can't resolve MapLibre's worker from node_modules; serve a copy from /public (see `npm run copy-worker`).
      ml.setWorkerUrl("/maplibre-gl-worker.mjs");
      const map = new ml.Map({
        container: mapEl.current,
        style: BASE_STYLE,
        center: [80.7, 7.85],
        zoom: 6.4,
        attributionControl: { compact: true },
        dragRotate: false,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      popupRef.current = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "260px" });
      map.on("load", () => {
        map.addSource("units", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
        map.addLayer({ id: "u-fill", type: "fill", source: "units", paint: { "fill-color": "#ddd", "fill-opacity": 0.88 } });
        map.addLayer({ id: "u-line", type: "line", source: "units", paint: { "line-color": "#ffffff", "line-width": 1.2 } });
        map.addLayer({
          id: "u-hover",
          type: "line",
          source: "units",
          paint: { "line-color": "#1d1b2e", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.6, 0] },
        });
        map.addLayer({ id: "u-selected", type: "line", source: "units", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#4a3aa7", "line-width": 3 } });
        setMapReady(true);
      });
      map.on("mousemove", "u-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = String(f.id);
        if (hoverId.current && hoverId.current !== id) map.setFeatureState({ source: "units", id: hoverId.current }, { hover: false });
        hoverId.current = id;
        map.setFeatureState({ source: "units", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
        popupRef.current?.setLngLat(e.lngLat).setHTML(tooltipRef.current(id)).addTo(map);
      });
      map.on("mouseleave", "u-fill", () => {
        if (hoverId.current) map.setFeatureState({ source: "units", id: hoverId.current }, { hover: false });
        hoverId.current = null;
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
      map.on("click", "u-fill", (e) => {
        const f = e.features?.[0];
        if (f) setSelectedId(String(f.id));
      });
      mapRef.current = map;
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;
    (map.getSource("units") as GeoJSONSource).setData(data.geojson);
    map.fitBounds(bboxOf(data.geojson.features), { padding: 30, duration: 0 });
  }, [data, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !scale) return;
    map.setPaintProperty("u-fill", "fill-color", scale.expr);
  }, [scale, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setFilter("u-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId, mapReady]);

  function downloadCsv() {
    const cols = [
      "id", "name", "quadrant", "risk_share", "finance_share", "gap_index", "expected_usd", "estimated_actual_usd", "estimated_gap_usd", "usd_per_risk_unit",
      ...HAZARDS.map((h) => `risk_${h}`), "risk_overall", ...HAZARDS.map((h) => `coverage_${h}`),
      "csg_adaptation_usd_raw", "csg_crosscutting_usd_raw", "csg_mitigation_usd_raw",
    ];
    const rows = ranking.map((p) => [
      p.id, p.name, p.gap.quadrant, p.risk.share, p.finance.share, p.gap.index, p.gap.expected_usd, p.finance.adj_usd, p.gap.gap_usd, p.gap.usd_per_risk,
      ...HAZARDS.map((h) => p.risk[h]), p.risk.overall, ...HAZARDS.map((h) => p.gap.coverage[h] ?? ""),
      p.finance.adaptation, p.finance.crosscutting, p.finance.mitigation,
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[cols, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = `lka_hazard_finance_gap_${data?.generated ?? ""}.csv`;
    a.click();
  }

  const underfunded = ranking.filter((p) => p.gap.quadrant === "high-risk-low-finance");

  return (
    <div className="flex flex-col">
      <div className="flex flex-col lg:h-[calc(100vh-56px)] lg:min-h-155 lg:flex-row">
        {/* ---------------- left rail ---------------- */}
        <aside className="scroll-thin flex shrink-0 flex-col gap-5 border-b border-line bg-white p-5 lg:w-82.5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Sri Lanka · by {data?.unit ?? "province"}</div>
            <h1 className="mt-1 text-lg font-semibold leading-snug tracking-tight">Hazard risk × climate finance</h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">Where climate risk is high but adaptation investment is low.</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              <Layers size={13} /> Map layer
            </div>
            <div className="mt-2 grid gap-1">
              {LAYERS.map((l, i) => (
                <div key={l.key}>
                  {(i === 0 || LAYERS[i - 1].group !== l.group) && <div className="mb-0.5 mt-1.5 text-[11px] text-ink-3">{l.group}</div>}
                  <button
                    onClick={() => setLayer(l.key)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition ${
                      layer === l.key ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-paper"
                    }`}
                  >
                    {l.label}
                    {layer === l.key && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{layerDef.desc}</p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Hazard</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(["overall", ...HAZARDS] as HazardOrOverall[]).map((h) => {
                const disabled = layer === "coverage" && h === "overall";
                return (
                  <button
                    key={h}
                    disabled={disabled}
                    onClick={() => setHazard(h)}
                    className={`rounded-full border px-3 py-1 text-[13px] transition ${
                      effectiveHazard === h ? "border-brand bg-brand text-white" : "border-line text-ink-2 hover:border-brand/50"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {HAZARD_LABEL[h]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11.5px] text-ink-3">Drives the risk and coverage layers.</p>
          </div>

          {data && (
            <div className="rounded-2xl border border-line bg-paper/60 p-4">
              <div className="text-[12px] text-ink-3">CSG adaptation + cross-cutting, national</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight num">{usd(data.national.adaptation_usd + data.national.crosscutting_usd)}</div>
              <div className="mt-1 text-[12px] text-ink-2 num">
                of {usd(data.national.total_usd)} across {data.national.projects} projects ({usd(data.national.mitigation_usd)} mitigation excluded)
              </div>
              <div className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
                <b className="text-coral">{underfunded.length}</b> of {provinces.length} provinces are high risk with low finance
                {underfunded.length > 0 && <>: {underfunded.map((p) => p.name).join(", ")}</>}.
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Gap index ranking</div>
              <button onClick={downloadCsv} className="flex items-center gap-1 text-[12px] text-brand hover:underline">
                <Download size={13} /> CSV
              </button>
            </div>
            <ol className="mt-2 grid gap-0.5">
              {ranking.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-paper ${selectedId === p.id ? "bg-brand-soft" : ""}`}
                  >
                    <span className="w-5 text-[11px] text-ink-3 num">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className={`text-[13px] font-medium num ${p.gap.index > 0 ? "text-coral" : "text-[#2c5d9e]"}`}>{pp(p.gap.index)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* ---------------- map ---------------- */}
        <section className="relative h-[62vh] min-h-105 flex-1 lg:h-auto">
          {/* MapLibre sets position: relative on its container, so size it inside an absolute wrapper */}
          <div className="absolute inset-0">
            <div ref={mapEl} style={{ width: "100%", height: "100%" }} />
          </div>
          {!data && (
            <div className="absolute inset-0 grid place-items-center bg-paper/60 text-sm text-ink-3">
              {error ? `Could not load data (${error}). Run npm run data.` : "Loading Sri Lanka…"}
            </div>
          )}

          <div className="pointer-events-none absolute left-3 right-14 top-3 z-10 flex max-w-lg flex-col gap-2">
            {data?.demo.hazard && showDemo && (
              <div className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/95 px-3.5 py-2.5 text-[12.5px] leading-snug text-amber-900 shadow-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <b>Demo hazard data.</b> Finance is real (CSG), but hazard scores are placeholders until{" "}
                  <code>data-raw/hazard/lka_province_hazard.csv</code> is loaded. Do not cite the gap.
                </div>
                <button onClick={() => setShowDemo(false)} className="text-amber-700 hover:text-amber-900" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-white/95 px-3 py-2 text-[11.5px] leading-snug text-ink-2 shadow-sm">
              <Info size={14} className="mt-0.5 shrink-0 text-ink-3" />
              <div>
                Province figures from CSG include multi-province projects in each province; shown as shares / scaled estimates.
                {data?.pending.includes("vulnerability") && " Vulnerability not yet loaded: risk = √(hazard × exposure)."}
              </div>
            </div>
          </div>

          {scale && (
            <div className="absolute bottom-6 left-3 z-10 w-56 rounded-xl border border-line bg-white/95 p-3 shadow-sm">
              <div className="mb-1.5 text-[12px] font-semibold">{scale.title}</div>
              <div className="h-2.5 rounded-sm" style={{ background: `linear-gradient(to right, ${scale.stops.join(",")})` }} />
              <div className="mt-1 flex justify-between text-[11px] text-ink-2 num">
                <span>{scale.min}</span>
                {scale.mid && <span>{scale.mid}</span>}
                <span>{scale.max}</span>
              </div>
              {layer === "coverage" && <div className="mt-1 text-[10.5px] text-ink-3">Grey = no risk or no projects</div>}
            </div>
          )}
        </section>

        {/* ---------------- detail panel ---------------- */}
        {selected && data && <ProvincePanel key={selected.id} p={selected} data={data} rank={ranking.findIndex((x) => x.id === selected.id) + 1} onClose={() => setSelectedId(null)} />}
      </div>

      {/* ---------------- quadrant + table ---------------- */}
      {data && (
        <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-5 py-8 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold tracking-tight">Risk share vs finance share</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-2">Points below the parity line get less adaptation finance than their share of climate risk.</p>
            <QuadrantChart provinces={provinces} selectedId={selectedId} onSelect={setSelectedId} />
          </section>

          <section className="min-w-0 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold tracking-tight">Ranking by finance gap index</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-2">USD values are scaled estimates (relative / equity gap, not a needs estimate).</p>
              </div>
              <button onClick={downloadCsv} className="btn-ghost shrink-0">
                <Download size={14} /> CSV
              </button>
            </div>
            <div className="scroll-thin mt-4 overflow-x-auto">
              <table className="w-full min-w-180 text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Province</th>
                    <th className="py-2 pr-3 text-right font-semibold">Risk share</th>
                    <th className="py-2 pr-3 text-right font-semibold">Finance share</th>
                    <th className="py-2 pr-3 text-right font-semibold">Gap index</th>
                    <th className="py-2 pr-3 text-right font-semibold">Expected</th>
                    <th className="py-2 pr-3 text-right font-semibold">Est. actual</th>
                    <th className="py-2 pr-3 text-right font-semibold">Est. gap</th>
                    <th className="py-2 font-semibold">Quadrant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line num">
                  {ranking.map((p) => (
                    <tr key={p.id} onClick={() => setSelectedId(p.id)} className={`cursor-pointer hover:bg-paper ${selectedId === p.id ? "bg-brand-soft/60" : ""}`}>
                      <td className="py-2 pr-3 font-medium">{p.name}</td>
                      <td className="py-2 pr-3 text-right">{pct(p.risk.share)}</td>
                      <td className="py-2 pr-3 text-right">{pct(p.finance.share)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${p.gap.index > 0 ? "text-coral" : "text-[#2c5d9e]"}`}>{pp(p.gap.index)}</td>
                      <td className="py-2 pr-3 text-right">{usd(p.gap.expected_usd)}</td>
                      <td className="py-2 pr-3 text-right">{usd(p.finance.adj_usd)}</td>
                      <td className="py-2 pr-3 text-right">{usd(p.gap.gap_usd)}</td>
                      <td className="py-2">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${QUADRANT[p.gap.quadrant].tone}`}>{QUADRANT[p.gap.quadrant].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11.5px] text-ink-3">
              Finance: IWMI Climate-Smart Governance (CSG) Project Tracker, csg.iwmi.org (retrieved {data.sources.finance_retrieved}). Built {data.generated}.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
