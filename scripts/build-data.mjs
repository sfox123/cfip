// Builds public/data/{iso}.json for the Finance Gap explorer.
//
//   node scripts/build-data.mjs
//
// Inputs (data-raw/):
//   {iso}_adm2.geojson      district boundaries (geoBoundaries gbOpen ADM2, simplified)
//   programmes.json         programme catalogue per country
//   {iso}_metrics.csv       OPTIONAL real district metrics  -> replaces demo risk/baseline values
//   {iso}_projects.csv      OPTIONAL real project allocations -> replaces demo allocations
//
// When the optional CSVs are missing, deterministic DEMO values are generated and
// template CSVs are written to data-raw/templates/ so real numbers can be pasted in.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "data-raw");
const OUT = path.join(ROOT, "public", "data");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(RAW, "templates"), { recursive: true });

const catalogue = JSON.parse(fs.readFileSync(path.join(RAW, "programmes.json"), "utf8"));

const clean = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+District$/i, "").trim();

// ---------- deterministic RNG ----------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ---------- demo priors (hazard, exposure, vulnerability) by admin-1 ----------
const PRIORS = {
  IND: {
    default: [0.4, 0.5, 0.5],
    Rajasthan: [0.88, 0.7, 0.6], Gujarat: [0.72, 0.62, 0.45], Maharashtra: [0.74, 0.7, 0.55],
    Karnataka: [0.74, 0.66, 0.5], "Andhra Pradesh": [0.7, 0.62, 0.52], Telangana: [0.72, 0.66, 0.55],
    "Madhya Pradesh": [0.62, 0.66, 0.66], "Tamil Nadu": [0.58, 0.55, 0.45], Jharkhand: [0.58, 0.6, 0.74],
    Odisha: [0.5, 0.6, 0.7], "Uttar Pradesh": [0.48, 0.55, 0.7], Haryana: [0.5, 0.4, 0.4],
    Punjab: [0.34, 0.25, 0.35], Bihar: [0.46, 0.6, 0.8], Chhattisgarh: [0.52, 0.62, 0.72],
    "West Bengal": [0.36, 0.5, 0.62], Kerala: [0.22, 0.35, 0.3], Assam: [0.2, 0.45, 0.62],
    Delhi: [0.4, 0.1, 0.3], Goa: [0.2, 0.3, 0.25], "Himachal Pradesh": [0.3, 0.45, 0.4],
    Uttarakhand: [0.3, 0.45, 0.45], "Jammu and Kashmir": [0.34, 0.45, 0.5], Ladakh: [0.45, 0.3, 0.5],
  },
  ZMB: {
    default: [0.5, 0.5, 0.6],
    Southern: [0.86, 0.72, 0.66], Western: [0.76, 0.66, 0.78], Lusaka: [0.68, 0.45, 0.48],
    Eastern: [0.64, 0.74, 0.7], Central: [0.6, 0.62, 0.6], Muchinga: [0.46, 0.55, 0.68],
    Copperbelt: [0.38, 0.4, 0.46], "North-Western": [0.36, 0.5, 0.66], Northern: [0.34, 0.6, 0.72],
    Luapula: [0.28, 0.6, 0.78],
  },
};
// baseline agricultural asset/output value per district (USD M), demo range
const BASELINE = { IND: [180, 1400], ZMB: [18, 140] };
const NEED_FACTOR = 0.14;
const ALLOC_SCALE = { IND: 0.42, ZMB: 0.34 }; // demo calibration so typical coverage is 35–60% // share of exposed baseline that a full drought-resilience package would require

// ---------- tiny CSV helpers ----------
function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const [head, ...rows] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",").map((c) => c.trim());
  return rows.filter(Boolean).map((r) => {
    const v = r.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, v[i]]));
  });
}
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
const writeCsv = (file, rows) => {
  const cols = Object.keys(rows[0]);
  fs.writeFileSync(file, [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n"));
};

// ---------- build ----------
// Sri Lanka is built by build-lka-gap.mjs (real CSG finance + hazard data).
const COUNTRIES = { IND: "India", ZMB: "Zambia" };
const summary = {};

for (const iso of Object.keys(COUNTRIES)) {
  const geo = JSON.parse(fs.readFileSync(path.join(RAW, `${iso.toLowerCase()}_adm2.geojson`), "utf8"));
  const realMetrics = readCsv(path.join(RAW, `${iso.toLowerCase()}_metrics.csv`));
  const realProjects = readCsv(path.join(RAW, `${iso.toLowerCase()}_projects.csv`));
  const metricsById = realMetrics ? Object.fromEntries(realMetrics.map((r) => [r.district_id, r])) : null;
  const programmes = catalogue[iso];
  const priors = PRIORS[iso];
  const [bMin, bMax] = BASELINE[iso];

  const metricRows = [];
  const projectRows = [];

  geo.features = geo.features.map((f) => {
    const p = f.properties;
    const id = p.shapeID;
    const name = clean(p.shapeName);
    const state = clean(p.state) || "—";
    const r = rng(id);
    const [h0, e0, v0] = priors[state] || priors.default;

    let hazard, exposure, vulnerability, baseline;
    const m = metricsById?.[id];
    if (m) {
      hazard = +m.hazard; exposure = +m.exposure; vulnerability = +m.vulnerability; baseline = +m.baseline_usd_m;
    } else {
      hazard = clamp(h0 + (r() - 0.5) * 0.28);
      exposure = clamp(e0 + (r() - 0.5) * 0.3);
      vulnerability = clamp(v0 + (r() - 0.5) * 0.26);
      baseline = bMin + (bMax - bMin) * Math.pow(r(), 1.6);
    }
    // Drought Risk Index: geometric mean of H, E, V (INFORM-style)
    const dri = Math.cbrt(Math.max(hazard, 0.01) * Math.max(exposure, 0.01) * Math.max(vulnerability, 0.01));
    const need = dri * baseline * NEED_FACTOR * (0.6 + hazard * 0.8);

    // programme allocations
    let allocations = [];
    if (realProjects) {
      allocations = realProjects
        .filter((x) => x.district_id === id)
        .map((x) => ({ id: x.programme_id, amount: +x.amount_usd_m, year: x.year || "" }));
    } else {
      for (const prog of programmes) {
        const pr = rng(id + prog.id);
        let covered = false;
        if (prog.coverage === "all") covered = true;
        else if (prog.coverage === "hazard") covered = hazard > 0.55 && pr() < hazard;
        else if (Array.isArray(prog.coverage)) covered = prog.coverage.includes(state) && pr() < (prog.p ?? 1);
        else covered = pr() < prog.coverage.p;
        if (!covered) continue;
        const [a, b] = prog.range;
        // national schemes scale loosely with district size; others are flat
        const scale = ALLOC_SCALE[iso] * (0.55 + 0.9 * ((baseline - bMin) / (bMax - bMin)));
        allocations.push({ id: prog.id, amount: round((a + (b - a) * pr()) * scale), year: "2024-25" });
      }
    }
    const allocated = allocations.reduce((s, x) => s + x.amount, 0);
    const gap = need - allocated;

    metricRows.push({ district_id: id, district: name, admin1: state, hazard: round(hazard, 3), exposure: round(exposure, 3), vulnerability: round(vulnerability, 3), baseline_usd_m: round(baseline, 1) });
    for (const a of allocations) projectRows.push({ district_id: id, district: name, programme_id: a.id, amount_usd_m: a.amount, year: a.year });

    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        id, name, state,
        hazard: round(hazard, 3), exposure: round(exposure, 3), vulnerability: round(vulnerability, 3),
        dri: round(dri, 3), baseline: round(baseline, 1), need: round(need, 2),
        allocated: round(allocated, 2), gap: round(gap, 2),
        gapPct: round(need > 0 ? (gap / need) * 100 : 0, 1),
        coverage: round(need > 0 ? (allocated / need) * 100 : 0, 1),
        allocations: allocations,
      },
    };
  });

  const out = {
    iso, country: COUNTRIES[iso],
    demo: { metrics: !realMetrics, allocations: !realProjects },
    units: "USD million",
    generated: new Date().toISOString().slice(0, 10),
    programmes,
    geojson: geo,
  };
  fs.writeFileSync(path.join(OUT, `${iso.toLowerCase()}.json`), JSON.stringify(out));
  if (!realMetrics) writeCsv(path.join(RAW, "templates", `${iso.toLowerCase()}_metrics.csv`), metricRows);
  if (!realProjects && projectRows.length) writeCsv(path.join(RAW, "templates", `${iso.toLowerCase()}_projects.csv`), projectRows);

  const tot = geo.features.reduce((a, f) => ((a.n += f.properties.need), (a.al += f.properties.allocated), a), { n: 0, al: 0 });
  const worst = [...geo.features].sort((a, b) => b.properties.gap - a.properties.gap)[0].properties;
  summary[iso] = { iso, country: COUNTRIES[iso], districts: geo.features.length, need: round(tot.n, 0), allocated: round(tot.al, 0), gap: round(tot.n - tot.al, 0), coverage: round((tot.al / tot.n) * 100, 1), programmes: programmes.length, worst: { name: worst.name, state: worst.state, gap: worst.gap }, demo: !realMetrics || !realProjects };
  console.log(`${iso}: ${geo.features.length} districts | need ${tot.n.toFixed(0)} | allocated ${tot.al.toFixed(0)} | gap ${(tot.n - tot.al).toFixed(0)} USD M | demo=${!realMetrics}/${!realProjects}`);
}

fs.mkdirSync(path.join(ROOT, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "data", "summary.json"), JSON.stringify(summary, null, 2));
