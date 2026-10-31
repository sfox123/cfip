// Builds public/data/lka_gap.json for the Hazard × Finance explorer.
//
//   node scripts/build-lka-gap.mjs
//
// Inputs (data-raw/):
//   lka_adm1.geojson / lka_adm2.geojson         geoBoundaries provinces / districts
//   csg/lka_province_investment_usd.csv         CSG tracker: USD per province × category (multi-province projects counted in full)
//   csg/lka_province_hazard_projects.csv        CSG tracker: project count per province × hazard
//   csg/lka_national.json                       CSG tracker: national totals (de-duplicated)
//   hazard/lka_province_hazard.csv              hazard / exposure / vulnerability scores (scripts/fetch-lka-hazard.mjs)
//   csg/lka_projects_export.csv                 OPTIONAL project-level export from CSG -> switches to district level
//   hazard/lka_district_hazard.csv              OPTIONAL district scores used with the export (same columns, `district` instead of `province`)
//
// If the hazard file is missing a DEMO template is written and the output is flagged demo.hazard = true.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "data-raw");
const OUT = path.join(ROOT, "public", "data");
fs.mkdirSync(OUT, { recursive: true });

const HAZARDS = ["flood", "drought", "landslide", "water_scarcity"];
// overall risk = weighted mean of hazard risks (default equal)
const WEIGHTS = { flood: 1, drought: 1, landslide: 1, water_scarcity: 1 };
const CSG_HAZARD = { Flood: "flood", Drought: "drought", Landslide: "landslide", "Water scarcity": "water_scarcity", Heatwave: "heatwave" }; // GHG is mitigation, not a hazard
const CATEGORY = { Adaptation: "adaptation", Mitigation: "mitigation", "Cross-cutting": "crosscutting" };

const key = (s) => String(s ?? "").replace(/\s+(Province|District)$/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const slug = (s) => key(s).replace(/[^a-z0-9]+/g, "-");
const round = (v, d = 4) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const num = (v) => (v === "" || v == null || Number.isNaN(+v) ? null : +v);

function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const [head, ...rows] = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const cols = head.split(",").map((c) => c.trim());
  return rows.filter(Boolean).map((r) => {
    const v = r.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim());
    return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ""]));
  });
}
const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const national = JSON.parse(fs.readFileSync(path.join(RAW, "csg", "lka_national.json"), "utf8"));
const exportRows = readCsv(path.join(RAW, "csg", "lka_projects_export.csv"));
const unit = exportRows ? "district" : "province";
const geo = JSON.parse(fs.readFileSync(path.join(RAW, unit === "district" ? "lka_adm2.geojson" : "lka_adm1.geojson"), "utf8"));

// ---------- units ----------
const units = geo.features.map((f) => {
  const p = f.properties;
  const raw = p.shapeName ?? p.name;
  const name = raw.replace(/\s+(Province|District)$/i, "").trim();
  return {
    id: slug(name), name, k: key(raw), parent: p.state ? p.state.replace(/\s+Province$/i, "") : null, geometry: f.geometry,
    fin: { adaptation: 0, mitigation: 0, crosscutting: 0 }, projects: Object.fromEntries([...HAZARDS, "heatwave"].map((h) => [h, 0])),
  };
});
const byKey = new Map(units.map((u) => [u.k, u]));
const unitFor = (name, what) => byKey.get(key(name)) ?? fail(`${what}: "${name}" does not match any ${unit} in the boundaries (${[...byKey.keys()].join(", ")})`);

// ---------- finance ----------
let adjust;
if (exportRows) {
  // one row per project; budgets split equally across listed districts, so nothing is double counted
  for (const r of exportRows) {
    const cat = CATEGORY[r.category] ?? fail(`export: unknown category "${r.category}" (project ${r.project_id})`);
    const ds = r.districts.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
    if (!ds.length) continue; // national-only project
    const share = num(r.budget_usd) / ds.length;
    const hs = r.hazards.split(/[;|]/).map((s) => CSG_HAZARD[s.trim()]).filter(Boolean);
    for (const d of ds) {
      const u = unitFor(d, `export project ${r.project_id}`);
      u.fin[cat] += share;
      for (const h of hs) u.projects[h] += 1;
    }
  }
  adjust = { adaptation: 1, mitigation: 1, crosscutting: 1 };
} else {
  const inv = readCsv(path.join(RAW, "csg", "lka_province_investment_usd.csv"));
  for (const r of inv) unitFor(r.province, "investment csv").fin[CATEGORY[r.category] ?? fail(`unknown category "${r.category}"`)] += +r.usd;
  for (const r of readCsv(path.join(RAW, "csg", "lka_province_hazard_projects.csv"))) {
    const h = CSG_HAZARD[r.hazard];
    if (h) unitFor(r.province, "hazard-projects csv").projects[h] += +r.projects;
  }
  const rawTotal = sum(inv.map((r) => +r.usd));
  if (rawTotal !== 19_458_042_200) fail(`raw province USD sum ${rawTotal} ≠ 19,458,042,200 (CSG sanity check)`);
  // multi-province projects appear in full in every province -> scale each category to the national total
  adjust = Object.fromEntries(Object.keys(national.usd).filter((c) => c !== "all").map((c) => [c, national.usd[c] / sum(units.map((u) => u.fin[c]))]));
}

// ---------- hazard ----------
const hazardFile = path.join(RAW, "hazard", unit === "district" ? "lka_district_hazard.csv" : "lka_province_hazard.csv");
let hazardRows = readCsv(hazardFile);
const demoHazard = !hazardRows;
if (!hazardRows) {
  // DEMO placeholder so the page renders; never presented as real (demo.hazard = true -> banner)
  const prior = (u) => [0.3 + 0.6 * ((u.k.charCodeAt(0) * 7 + u.k.length * 13) % 100) / 100, 0.5, 0.5];
  hazardRows = units.flatMap((u) => HAZARDS.map((h, i) => {
    const [H, E, V] = prior(u);
    return { [unit]: u.name, hazard: h, hazard_score: round(Math.min(1, H * (0.7 + 0.15 * i)), 3), exposure_score: E, vulnerability_score: V, source: "DEMO placeholder" };
  }));
  fs.mkdirSync(path.dirname(hazardFile), { recursive: true });
  const cols = Object.keys(hazardRows[0]);
  fs.writeFileSync(hazardFile.replace(/\.csv$/, ".template.csv"), [cols.join(","), ...hazardRows.map((r) => cols.map((c) => r[c]).join(","))].join("\n") + "\n");
  console.warn(`! ${path.relative(ROOT, hazardFile)} missing: using DEMO hazard values (template written next to it)`);
}
const sources = {};
for (const r of hazardRows) {
  const u = unitFor(r[unit], path.basename(hazardFile));
  if (!HAZARDS.includes(r.hazard)) continue;
  const comps = [num(r.hazard_score), num(r.exposure_score), num(r.vulnerability_score)];
  if (comps[0] == null || comps[1] == null) fail(`${path.basename(hazardFile)}: ${r[unit]} / ${r.hazard} needs hazard_score and exposure_score`);
  const present = comps.filter((x) => x != null).map((x) => Math.max(x, 0));
  (u.hazard ??= {})[r.hazard] = {
    hazard: comps[0], exposure: comps[1], vulnerability: comps[2],
    // INFORM-style geometric mean of the components that are available
    risk: Math.pow(present.reduce((a, b) => a * b, 1), 1 / present.length),
  };
  sources[r.hazard] = r.source;
}
for (const u of units) for (const h of HAZARDS) if (!u.hazard?.[h]) fail(`${path.basename(hazardFile)}: missing ${u.name} / ${h}`);
const vulnerabilityLoaded = units.every((u) => HAZARDS.every((h) => u.hazard[h].vulnerability != null));

// ---------- metrics ----------
const wSum = sum(HAZARDS.map((h) => WEIGHTS[h]));
for (const u of units) {
  u.R = sum(HAZARDS.map((h) => WEIGHTS[h] * u.hazard[h].risk)) / wSum;
  u.adj = Object.fromEntries(Object.keys(u.fin).map((c) => [c, u.fin[c] * adjust[c]]));
  u.F = u.fin.adaptation + u.fin.crosscutting; // mitigation excluded: it does not reduce local hazard risk
  u.Fadj = u.adj.adaptation + u.adj.crosscutting;
}
const sumR = sum(units.map((u) => u.R));
const sumF = sum(units.map((u) => u.F));
const pool = sum(units.map((u) => u.Fadj)); // = national adaptation + cross-cutting at province level
const sumMit = sum(units.map((u) => u.fin.mitigation));
const sumRh = Object.fromEntries(HAZARDS.map((h) => [h, sum(units.map((u) => u.hazard[h].risk))]));
const sumPh = Object.fromEntries(HAZARDS.map((h) => [h, sum(units.map((u) => u.projects[h]))]));
const n = units.length;

const out = units.map((u) => {
  const rs = u.R / sumR;
  const fs_ = u.F / sumF;
  const expected = rs * pool;
  const quadrant = `${rs >= 1 / n ? "high" : "low"}-risk-${fs_ >= 1 / n ? "high" : "low"}-finance`;
  return {
    id: u.id, name: u.name, parent: u.parent,
    finance: {
      adaptation: u.fin.adaptation, mitigation: u.fin.mitigation, crosscutting: u.fin.crosscutting,
      adj_adaptation: round(u.adj.adaptation, 0), adj_mitigation: round(u.adj.mitigation, 0), adj_crosscutting: round(u.adj.crosscutting, 0),
      adj_usd: round(u.Fadj, 0), share: round(fs_, 5), mitigation_share: round(sumMit ? u.fin.mitigation / sumMit : 0, 5),
    },
    projects_by_hazard: u.projects,
    hazard: Object.fromEntries(HAZARDS.map((h) => [h, { hazard: round(u.hazard[h].hazard, 3), exposure: round(u.hazard[h].exposure, 3), vulnerability: round(u.hazard[h].vulnerability, 3) }])),
    risk: { ...Object.fromEntries(HAZARDS.map((h) => [h, round(u.hazard[h].risk, 4)])), overall: round(u.R, 4), share: round(rs, 5) },
    gap: {
      index: round(rs - fs_, 5),
      expected_usd: round(expected, 0),
      gap_usd: round(expected - u.Fadj, 0),
      usd_per_risk: round(u.Fadj / u.R, 0),
      quadrant,
      coverage: Object.fromEntries(HAZARDS.map((h) => {
        const riskShare = u.hazard[h].risk / sumRh[h];
        return [h, riskShare > 0 && sumPh[h] > 0 ? round(u.projects[h] / sumPh[h] / riskShare, 3) : null];
      })),
    },
  };
});

// ---------- acceptance checks ----------
const close = (a, b) => Math.abs(a - b) <= 0.001;
if (!close(sum(out.map((u) => u.finance.share)), 1)) fail("finance shares do not sum to 1");
if (!close(sum(out.map((u) => u.risk.share)), 1)) fail("risk shares do not sum to 1");

const props = Object.fromEntries(out.map((u) => [u.id, u]));
const doc = {
  iso: "LKA",
  country: "Sri Lanka",
  unit,
  generated: new Date().toISOString().slice(0, 10),
  demo: { hazard: demoHazard, finance: false },
  pending: vulnerabilityLoaded ? [] : ["vulnerability"],
  sources: {
    finance: national.source,
    finance_retrieved: national.retrieved,
    hazard: sources,
  },
  national: {
    total_usd: national.usd.all, adaptation_usd: national.usd.adaptation, mitigation_usd: national.usd.mitigation,
    crosscutting_usd: national.usd.crosscutting, projects: national.projects.all, projects_by_category: national.projects,
    beneficiaries: national.beneficiaries, status: national.status, pool_usd: round(pool, 0),
    raw_province_sum_usd: unit === "province" ? sum(units.map((u) => u.fin.adaptation + u.fin.mitigation + u.fin.crosscutting)) : null,
  },
  hazards: HAZARDS,
  weights: WEIGHTS,
  provinces: out,
  geojson: {
    type: "FeatureCollection",
    features: units.map((u) => {
      const p = props[u.id];
      return {
        type: "Feature",
        geometry: u.geometry,
        properties: {
          id: u.id, name: u.name,
          ...Object.fromEntries(HAZARDS.map((h) => [`risk_${h}`, p.risk[h]])),
          ...Object.fromEntries(HAZARDS.map((h) => [`cov_${h}`, p.gap.coverage[h] ?? -1])),
          risk_overall: p.risk.overall, finance_share: p.finance.share, mitigation_share: p.finance.mitigation_share, gap_index: p.gap.index,
        },
      };
    }),
  },
};
fs.writeFileSync(path.join(OUT, "lka_gap.json"), JSON.stringify(doc));

console.log(`LKA ${unit} level: ${n} units matched | hazard ${demoHazard ? "DEMO" : "loaded"}${vulnerabilityLoaded ? "" : " (vulnerability pending)"} | pool ${(pool / 1e9).toFixed(2)} B USD`);
for (const u of [...out].sort((a, b) => b.gap.index - a.gap.index))
  console.log(`  ${u.name.padEnd(14)} risk ${(u.risk.share * 100).toFixed(1).padStart(5)}%  finance ${(u.finance.share * 100).toFixed(1).padStart(5)}%  gap ${(u.gap.index * 100).toFixed(1).padStart(6)} pp  ${u.gap.quadrant}`);
