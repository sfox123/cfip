"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, Popup as MLPopup, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, Download, Info, Layers, X } from "lucide-react";
import {
  COUNTRIES,
  METRICS,
  colourScale,
  formatMetric,
  money,
  type CountryData,
  type DistrictProps,
  type MetricKey,
} from "@/lib/finance";
import DistrictPanel from "./DistrictPanel";

type Bounds = [number, number, number, number];

function bboxOf(features: GeoJSON.Feature[]): Bounds {
  let [x0, y0, x1, y1] = [180, 90, -180, -90];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  features.forEach((f) => walk((f.geometry as GeoJSON.Polygon).coordinates));
  return [x0, y0, x1, y1];
}

const BASE_STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors · Boundaries: geoBoundaries",
    },
  },
  layers: [
    { id: "bg", type: "background" as const, paint: { "background-color": "#f3f1ec" } },
    { id: "basemap", type: "raster" as const, source: "basemap", paint: { "raster-opacity": 0.85 } },
  ],
};

export default function FinanceGapExplorer() {
  const [iso, setIso] = useState<string>("IND");
  const [metric, setMetric] = useState<MetricKey>("gap");
  const [admin1, setAdmin1] = useState<string>("All");
  const [cache, setCache] = useState<Record<string, CountryData>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<MLPopup | null>(null);
  const hoverId = useRef<string | null>(null);

  const data = cache[iso];
  const country = COUNTRIES.find((c) => c.iso === iso)!;
  const features = useMemo(() => data?.geojson.features.map((f) => f.properties) ?? [], [data]);
  const admin1List = useMemo(() => Array.from(new Set(features.map((f) => f.state))).filter((s) => s !== "—").sort(), [features]);
  const scoped = useMemo(() => (admin1 === "All" ? features : features.filter((f) => f.state === admin1)), [features, admin1]);
  const selected = useMemo(() => features.find((f) => f.id === selectedId) ?? null, [features, selectedId]);
  const scale = useMemo(() => colourScale(metric, features), [metric, features]);

  const totals = useMemo(() => {
    const need = scoped.reduce((s, f) => s + f.need, 0);
    const allocated = scoped.reduce((s, f) => s + f.allocated, 0);
    return { need, allocated, gap: need - allocated, coverage: need ? (allocated / need) * 100 : 0, n: scoped.length };
  }, [scoped]);

  const ranking = useMemo(() => [...scoped].sort((a, b) => b.gap - a.gap).slice(0, 12), [scoped]);

  // ---- load country data ----
  useEffect(() => {
    if (cache[iso]) return;
    let live = true;
    Promise.all([
      fetch(`/data/${iso.toLowerCase()}.json`).then((r) => r.json()),
      fetch(`/data/${iso.toLowerCase()}_adm1.json`).then((r) => r.json()),
    ]).then(([d, a1]) => {
      if (!live) return;
      (d as CountryData & { adm1?: unknown }).adm1 = a1;
      setCache((c) => ({ ...c, [iso]: d }));
    });
    return () => {
      live = false;
    };
  }, [iso, cache]);

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
        center: [79, 22],
        zoom: 3.6,
        attributionControl: { compact: true },
        dragRotate: false,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      popupRef.current = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "260px" });
      map.on("load", () => {
        map.addSource("districts", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
        map.addSource("admin1", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "d-fill",
          type: "fill",
          source: "districts",
          paint: {
            "fill-color": "#ddd",
            "fill-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0.18, 0.9],
          },
        });
        map.addLayer({
          id: "d-line",
          type: "line",
          source: "districts",
          paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.2, 7, 1] },
        });
        map.addLayer({
          id: "a1-line",
          type: "line",
          source: "admin1",
          paint: { "line-color": "#1d1b2e", "line-opacity": 0.45, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 7, 1.6] },
        });
        map.addLayer({
          id: "d-hover",
          type: "line",
          source: "districts",
          paint: {
            "line-color": "#1d1b2e",
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.6, 0],
          },
        });
        map.addLayer({
          id: "d-selected",
          type: "line",
          source: "districts",
          filter: ["==", ["get", "id"], ""],
          paint: { "line-color": "#4a3aa7", "line-width": 3 },
        });
        setMapReady(true);
      });

      map.on("mousemove", "d-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = String(f.id);
        if (hoverId.current && hoverId.current !== id) map.setFeatureState({ source: "districts", id: hoverId.current }, { hover: false });
        hoverId.current = id;
        map.setFeatureState({ source: "districts", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as unknown as DistrictProps;
        const m = (map as MLMap & { __metric?: MetricKey }).__metric ?? "gap";
        popupRef.current
          ?.setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:13px;font-weight:600">${p.name}</div><div style="font-size:11px;color:#8a87a0">${p.state}</div>` +
              `<div style="margin-top:4px;font-size:12px">${METRICS.find((x) => x.key === m)!.short}: <b>${formatMetric(m, Number(p[m]))}</b></div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", "d-fill", () => {
        if (hoverId.current) map.setFeatureState({ source: "districts", id: hoverId.current }, { hover: false });
        hoverId.current = null;
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
      map.on("click", "d-fill", (e) => {
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

  // ---- push data to map on country change ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;
    (map.getSource("districts") as GeoJSONSource).setData(data.geojson);
    (map.getSource("admin1") as GeoJSONSource).setData((data as CountryData & { adm1: GeoJSON.FeatureCollection }).adm1);
    map.fitBounds(bboxOf(data.geojson.features), { padding: 40, duration: 900 });
  }, [data, mapReady]);

  // ---- metric colours ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.setPaintProperty("d-fill", "fill-color", scale.expr as any);
    (map as MLMap & { __metric?: MetricKey }).__metric = metric;
  }, [scale, metric, mapReady, data]);

  // ---- admin1 focus ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;
    for (const f of data.geojson.features) {
      map.setFeatureState({ source: "districts", id: f.properties.id }, { dim: admin1 !== "All" && f.properties.state !== admin1 });
    }
    const target = admin1 === "All" ? data.geojson.features : data.geojson.features.filter((f) => f.properties.state === admin1);
    if (target.length) map.fitBounds(bboxOf(target), { padding: 60, duration: 800 });
  }, [admin1, data, mapReady]);

  // ---- selection highlight ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setFilter("d-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId, mapReady]);

  const focusDistrict = useCallback(
    (id: string) => {
      setSelectedId(id);
      const f = data?.geojson.features.find((x) => x.properties.id === id);
      // wait a frame so the detail panel has opened and the map has resized
      if (f) setTimeout(() => mapRef.current?.fitBounds(bboxOf([f]), { padding: 180, maxZoom: 6.5, duration: 800 }), 60);
    },
    [data],
  );

  function switchCountry(next: string) {
    setIso(next);
    setAdmin1("All");
    setSelectedId(null);
  }

  function downloadCsv() {
    const cols: (keyof DistrictProps)[] = ["id", "name", "state", "hazard", "exposure", "vulnerability", "dri", "baseline", "need", "allocated", "gap", "gapPct"];
    const rows = [cols.join(","), ...scoped.map((f) => cols.map((c) => (typeof f[c] === "string" && String(f[c]).includes(",") ? `"${f[c]}"` : f[c])).join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `${iso.toLowerCase()}_${admin1 === "All" ? "all" : admin1.replace(/\s+/g, "_")}_finance_gap.csv`;
    a.click();
  }

  const isDemo = data && (data.demo.metrics || data.demo.allocations);
  const metricDef = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[620px]">
      {/* ---------------- left rail ---------------- */}
      <aside className="scroll-thin flex w-[330px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-white p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Country</div>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-paper p-1">
            {COUNTRIES.map((c) => (
              <button
                key={c.iso}
                onClick={() => switchCountry(c.iso)}
                className={`rounded-lg py-1.5 text-sm transition ${iso === c.iso ? "bg-white font-semibold text-brand shadow-sm" : "text-ink-2 hover:text-ink"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <Layers size={13} /> Map layer
          </div>
          <div className="mt-2 grid gap-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition ${
                  metric === m.key ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-paper"
                } ${["hazard", "exposure", "vulnerability"].includes(m.key) ? "pl-6 text-[13px]" : ""}`}
              >
                {m.label}
                {metric === m.key && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{metricDef.desc}</p>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{country.admin1}</div>
          <select
            value={admin1}
            onChange={(e) => setAdmin1(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="All">All {country.admin1.toLowerCase()}s</option>
            {admin1List.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-line bg-paper/60 p-4">
          <div className="text-[12px] text-ink-3">
            {admin1 === "All" ? country.name : admin1} · {totals.n} districts
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-coral num">{money(totals.gap)}</div>
          <div className="text-[12px] text-ink-2">drought finance gap</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-coral-soft">
            <div className="h-full rounded-full bg-aqua" style={{ width: `${Math.min(100, totals.coverage)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] num">
            <span className="text-aqua">{money(totals.allocated)} allocated</span>
            <span className="text-ink-3">of {money(totals.need)} need</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Largest gaps</div>
            <button onClick={downloadCsv} className="flex items-center gap-1 text-[12px] text-brand hover:underline">
              <Download size={13} /> CSV
            </button>
          </div>
          <ol className="mt-2 grid gap-0.5">
            {ranking.map((f, i) => (
              <li key={f.id}>
                <button
                  onClick={() => focusDistrict(f.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-paper ${
                    selectedId === f.id ? "bg-brand-soft" : ""
                  }`}
                >
                  <span className="w-5 text-[11px] text-ink-3 num">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {f.name}
                    <span className="ml-1 text-[11px] text-ink-3">{admin1 === "All" ? f.state : ""}</span>
                  </span>
                  <span className="text-[13px] font-medium text-coral num">{money(f.gap)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* ---------------- map ---------------- */}
      <section className="relative flex-1">
        <div className="absolute inset-0">
          <div ref={mapEl} style={{ width: "100%", height: "100%" }} />
        </div>
        {!data && (
          <div className="absolute inset-0 grid place-items-center bg-paper/60 text-sm text-ink-3">Loading {country.name} districts…</div>
        )}

        {isDemo && showInfo && (
          <div className="absolute left-4 top-4 z-10 flex max-w-md items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/95 px-3.5 py-2.5 text-[12.5px] leading-snug text-amber-900 shadow-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <b>Illustrative data.</b> Boundaries and programme names are real; risk scores and allocations are placeholders until the
              district matrix and project data are loaded (see Methodology).
            </div>
            <button onClick={() => setShowInfo(false)} className="text-amber-700 hover:text-amber-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* legend */}
        {data && (
          <div className="absolute bottom-6 left-4 z-10 rounded-xl border border-line bg-white/95 p-3 shadow-sm">
            <div className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold">
              {metricDef.label}
              <span title={metricDef.desc}>
                <Info size={12} className="text-ink-3" />
              </span>
            </div>
            <div className="grid gap-1">
              {scale.legend.map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-[11.5px] text-ink-2 num">
                  <span className="h-3 w-5 rounded-sm" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- detail panel ---------------- */}
      {selected && data && (
        <DistrictPanel
          key={selected.id}
          district={selected}
          data={data}
          rank={[...features].sort((a, b) => b.gap - a.gap).findIndex((f) => f.id === selected.id) + 1}
          total={features.length}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
