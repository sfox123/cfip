// Builds data-raw/hazard/lka_province_hazard.csv from public sources.
//
//   node scripts/fetch-lka-hazard.mjs            (uses cached downloads in data-raw/hazard/.cache)
//   node scripts/fetch-lka-hazard.mjs --refresh  (re-downloads everything)
//
// Sources
//   IWMI ENSO Outlook API (https://enso.iwmi.org/ENSO_api):
//     - CHIRPS daily rainfall, province mean, 1991–2025   (/gee/accumulated-precip-timeseries)
//     - WorldPop 2026 population per province              (/population/admin)
//     - IFPRI SPAM 2020 physical crop area per province    (/spam/admin-summary)
//   OpenTopoData (https://www.opentopodata.org) SRTM 90 m elevation for terrain slope (landslide).
//
// Outputs
//   data-raw/hazard/lka_province_indicators.csv   raw indicator values (auditable)
//   data-raw/hazard/lka_province_hazard.csv       0–1 hazard / exposure scores used by build-lka-gap.mjs
//
// Vulnerability is left blank: no province-level poverty/deprivation layer is available from
// these APIs. Fill the vulnerability_score column (e.g. DCS HIES poverty headcount, 0–1) and re-run
// `npm run data`; blanks are excluded from the risk geometric mean.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "data-raw");
const OUT_DIR = path.join(RAW, "hazard");
const CACHE = path.join(OUT_DIR, ".cache");
fs.mkdirSync(CACHE, { recursive: true });

const ENSO = "https://enso.iwmi.org/ENSO_api/api/v1";
const REFRESH = process.argv.includes("--refresh");
const START = "1991-01-01";
const END = "2025-12-31";

// GAUL 2024 L1 codes used by the ENSO API
const PROVINCES = {
  Central: 2978, Eastern: 2979, "North Central": 2980, "North Western": 2981, Northern: 2982,
  Sabaragamuwa: 2983, Southern: 2984, Uva: 2985, Western: 2986,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const norm = (s) => s.replace(/\s+Province$/i, "").replace(/\s+/g, " ").trim().toLowerCase();

async function getJson(url, cacheName, tries = 4) {
  const file = path.join(CACHE, cacheName);
  if (!REFRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      fs.writeFileSync(file, JSON.stringify(j));
      return j;
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(3000 * i);
    }
  }
}

// ---------- rainfall indicators from a daily series ----------
function rainfallIndicators(series) {
  const days = series.map((d) => ({ y: +d.date.slice(0, 4), m: +d.date.slice(5, 7), p: Math.max(0, d.daily ?? 0) }));
  const years = [...new Set(days.map((d) => d.y))];
  const byYear = Object.fromEntries(years.map((y) => [y, days.filter((d) => d.y === y).map((d) => d.p)]));

  const annual = years.map((y) => byYear[y].reduce((a, b) => a + b, 0));
  const mean = annual.reduce((a, b) => a + b, 0) / annual.length;
  const sd = Math.sqrt(annual.reduce((a, b) => a + (b - mean) ** 2, 0) / (annual.length - 1));

  const maxRun = (ps, k) => {
    let best = 0;
    for (let i = 0; i + k <= ps.length; i++) {
      let s = 0;
      for (let j = i; j < i + k; j++) s += ps[j];
      if (s > best) best = s;
    }
    return best;
  };
  const longestDry = (ps) => {
    let best = 0, run = 0;
    for (const p of ps) {
      run = p < 2.5 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };
  const avg = (f) => years.reduce((a, y) => a + f(byYear[y]), 0) / years.length;

  // monthly totals -> rolling 3-month totals; deficit = below 60% of that window's climatology
  const monthly = [];
  for (const y of years) for (let m = 1; m <= 12; m++) monthly.push({ m, p: days.filter((d) => d.y === y && d.m === m).reduce((a, d) => a + d.p, 0) });
  const roll = monthly.slice(2).map((x, i) => ({ m: x.m, p: monthly[i].p + monthly[i + 1].p + x.p }));
  const clim = Object.fromEntries([...Array(12)].map((_, i) => { const v = roll.filter((r) => r.m === i + 1); return [i + 1, v.reduce((a, r) => a + r.p, 0) / v.length]; }));
  const deficitFreq = roll.filter((r) => r.p < 0.6 * clim[r.m]).length / roll.length;

  return {
    annual_mm: mean,
    annual_cv: sd / mean,
    deficit_3m_freq: deficitFreq,
    dry_spell_days: avg(longestDry),
    rx3day_mm: avg((ps) => maxRun(ps, 3)),
    rx5day_mm: avg((ps) => maxRun(ps, 5)),
    heavy_days_per_yr: avg((ps) => ps.filter((p) => p >= 30).length),
    years: years.length,
  };
}

// ---------- terrain slope from a DEM grid ----------
function inRing(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function inGeom(x, y, g) {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.some((rings) => inRing(x, y, rings[0]) && !rings.slice(1).some((h) => inRing(x, y, h)));
}

async function slopes(adm1) {
  const STEP = 0.02; // ~2.2 km
  const feats = adm1.features.map((f) => ({ name: norm(f.properties.name), geom: f.geometry }));
  const pts = [];
  for (let lat = 5.9; lat <= 9.85; lat += STEP)
    for (let lon = 79.5; lon <= 81.9; lon += STEP) {
      const f = feats.find((p) => inGeom(lon, lat, p.geom));
      if (f) pts.push({ i: Math.round((lat - 5.9) / STEP), j: Math.round((lon - 79.5) / STEP), lat: round(lat, 4), lon: round(lon, 4), prov: f.name });
    }
  const cacheFile = `elevation_srtm90m_${STEP}.json`;
  // the cache is written after every chunk, so an interrupted download resumes where it stopped
  const cachePath = path.join(CACHE, cacheFile);
  let elev = !REFRESH && fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : [];
  if (elev.length > pts.length) elev = [];
  for (let k = elev.length; k < pts.length; k += 100) {
    const chunk = pts.slice(k, k + 100);
    const url = `https://api.opentopodata.org/v1/srtm90m?locations=${chunk.map((p) => `${p.lat},${p.lon}`).join("|")}`;
    for (let t = 1; ; t++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        elev.push(...(await r.json()).results.map((x) => x.elevation ?? 0));
        break;
      } catch (e) {
        if (t > 6) throw new Error(`elevation: ${e.message}`);
        await sleep(5000 * t);
      }
    }
    fs.writeFileSync(cachePath, JSON.stringify(elev));
    process.stdout.write(`\r  elevation ${elev.length}/${pts.length}`);
    await sleep(1100); // public API limit: 1 request / second
  }
  process.stdout.write("\n");
  const grid = new Map(pts.map((p, k) => [`${p.i},${p.j}`, elev[k]]));
  const dy = STEP * 111_320;
  const acc = {};
  pts.forEach((p, k) => {
    const n = grid.get(`${p.i + 1},${p.j}`), s = grid.get(`${p.i - 1},${p.j}`), e = grid.get(`${p.i},${p.j + 1}`), w = grid.get(`${p.i},${p.j - 1}`);
    if ([n, s, e, w].some((v) => v == null)) return;
    const dx = dy * Math.cos((p.lat * Math.PI) / 180);
    const slope = (Math.atan(Math.hypot((e - w) / (2 * dx), (n - s) / (2 * dy))) * 180) / Math.PI;
    const a = (acc[p.prov] ??= { sum: 0, n: 0, steep: 0, elev: 0 });
    a.sum += slope; a.n++; a.elev += elev[k];
    if (slope >= 5) a.steep++;
  });
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { mean_slope_deg: a.sum / a.n, steep_share: a.steep / a.n, mean_elev_m: a.elev / a.n }]));
}

// ---------- main ----------
const adm1 = JSON.parse(fs.readFileSync(path.join(RAW, "lka_adm1.geojson"), "utf8"));
const rows = [];
for (const [name, code] of Object.entries(PROVINCES)) {
  process.stdout.write(`${name}: rainfall`);
  const q = new URLSearchParams({ iso3: "LKA", level: "1", admin_name: name, source: "chirps", agg: "mean", start: START, end: END });
  const rain = await getJson(`${ENSO}/gee/accumulated-precip-timeseries?${q}`, `chirps_${code}.json`);
  if (!rain.series?.length) throw new Error(`no rainfall series for ${name}`);
  process.stdout.write(", population");
  const pop = await getJson(`${ENSO}/population/admin?iso3=LKA&level=1&code=${code}`, `pop_${code}.json`);
  process.stdout.write(", cropland\n");
  const crop = await getJson(`${ENSO}/spam/admin-summary?iso3=LKA&level=1&code=${code}`, `spam_${code}.json`);
  rows.push({ province: name, gaul_code: code, ...rainfallIndicators(rain.series), population: pop.value, crop_area_ha: crop.total_area_ha });
}
console.log("terrain (OpenTopoData SRTM 90 m)");
const terrain = await slopes(adm1);
for (const r of rows) {
  const t = terrain[norm(r.province)];
  if (!t) throw new Error(`no terrain for ${r.province}`);
  Object.assign(r, t);
}

// x / max scaling keeps ratios between provinces (min–max would force the lowest province to 0)
const scaled = (key, invert = false) => {
  const v = rows.map((r) => (invert ? 1 / r[key] : r[key]));
  const max = Math.max(...v);
  return Object.fromEntries(rows.map((r, i) => [r.province, v[i] / max]));
};
const S = {
  cv: scaled("annual_cv"), deficit: scaled("deficit_3m_freq"), arid: scaled("annual_mm", true), dry: scaled("dry_spell_days"),
  rx5: scaled("rx5day_mm"), heavy: scaled("heavy_days_per_yr"), rx3: scaled("rx3day_mm"), slope: scaled("mean_slope_deg"),
  pop: scaled("population"), crop: scaled("crop_area_ha"),
};
const CHIRPS = `CHIRPS daily ${START.slice(0, 4)}–${END.slice(0, 4)} via IWMI ENSO API`;
const HAZARDS = [
  ["drought", (p) => (S.cv[p] + S.deficit[p]) / 2, S.crop, `${CHIRPS}: annual rainfall CV + 3-month deficit frequency; exposure SPAM 2020 crop area`],
  ["flood", (p) => (S.rx5[p] + S.heavy[p]) / 2, S.pop, `${CHIRPS}: mean annual max 5-day rain + heavy-rain days (≥30 mm); exposure WorldPop 2026`],
  ["landslide", (p) => S.slope[p] * S.rx3[p], S.pop, `SRTM 90 m slope (OpenTopoData) × ${CHIRPS} max 3-day rain; exposure WorldPop 2026`],
  ["water_scarcity", (p) => (S.arid[p] + S.dry[p]) / 2, S.crop, `${CHIRPS}: inverse mean annual rainfall + longest dry spell; exposure SPAM 2020 crop area`],
];

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
const writeCsv = (file, data) => {
  const cols = Object.keys(data[0]);
  fs.writeFileSync(file, [cols.join(","), ...data.map((r) => cols.map((c) => csvCell(typeof r[c] === "number" ? round(r[c]) : r[c])).join(","))].join("\n") + "\n");
};

writeCsv(path.join(OUT_DIR, "lka_province_indicators.csv"), rows);
const hazardFile = path.join(OUT_DIR, "lka_province_hazard.csv");
// keep any vulnerability scores already typed into the existing file
const prevV = {};
if (fs.existsSync(hazardFile)) {
  const [head, ...lines] = fs.readFileSync(hazardFile, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");
  for (const l of lines) {
    const v = l.split(",");
    const o = Object.fromEntries(cols.map((c, i) => [c, v[i]]));
    if (o.vulnerability_score) prevV[`${o.province}|${o.hazard}`] = o.vulnerability_score;
  }
}
writeCsv(
  hazardFile,
  rows.flatMap((r) =>
    HAZARDS.map(([h, H, E, source]) => ({
      province: r.province, hazard: h, hazard_score: H(r.province), exposure_score: E[r.province],
      vulnerability_score: prevV[`${r.province}|${h}`] ?? "", source,
    })),
  ),
);
console.log(`wrote ${path.relative(ROOT, hazardFile)} (${rows.length} provinces × ${HAZARDS.length} hazards)`);
