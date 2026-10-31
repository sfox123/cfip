# Climate Finance Intelligence (IWMI)

**Hazard risk × climate finance gap for Sri Lanka.** Real climate-finance data from the IWMI CSG Project Tracker sits on top of a multi-hazard risk layer (flood, drought, landslide, water scarcity), to show **where risk is high but adaptation investment is low**. The app also has an India/Zambia drought pilot (illustrative data) and a **Knowledge Bank** of climate-risk tools.

> **Data status (Sri Lanka):** finance is real (CSG public tracker, province level). Hazard and exposure come from public data (CHIRPS rainfall, WorldPop, SPAM crop area via the IWMI ENSO Outlook API; SRTM elevation via OpenTopoData). **Vulnerability is not yet loaded**: risk is currently √(hazard × exposure). CSG province totals count multi-province projects in every province, so the gap uses **shares**, and USD values are labelled as **estimates**.

## Pages

| Route | What it does |
|---|---|
| `/` | Redirects to `/hazard-finance` |
| `/hazard-finance` | Map with layers for risk (per hazard or overall), finance share, mitigation share (info only), finance gap index and hazard coverage ratio; province panel; risk-vs-finance quadrant chart; ranking table; CSV export |
| `/drought-pilot`, `/finance-gap` | India/Zambia district drought finance gap (illustrative placeholders) |
| `/knowledge` | Curated links to IWMI and external tools; add your own links |
| `/methodology` | CSG caveats, hazard sources, gap formulas, how to load the CSG project export |

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Deploys to Vercel as-is. (`predev`/`prebuild` copy MapLibre's worker into `public/` because Turbopack can't resolve it from `node_modules`.)

## Data pipeline (Sri Lanka)

```
data-raw/
  lka_adm1.geojson, lka_adm2.geojson         geoBoundaries provinces / districts
  csg/lka_province_investment_usd.csv        CSG: USD per province × Adaptation / Mitigation / Cross-cutting
  csg/lka_province_hazard_projects.csv       CSG: project count per province × hazard
  csg/lka_national.json                      CSG: de-duplicated national totals
  hazard/lka_province_indicators.csv         raw rainfall / terrain / population / crop indicators
  hazard/lka_province_hazard.csv             0–1 hazard, exposure, vulnerability scores + source
  csg/lka_projects_export.csv                OPTIONAL project-level CSG export -> district level
```

| Command | What it does |
|---|---|
| `npm run data:hazard` | Downloads CHIRPS daily rainfall (1991–2025), WorldPop and SPAM from the ENSO API, plus SRTM elevation from OpenTopoData, and writes the two `hazard/` CSVs. Uses `data-raw/hazard/.cache`; add `-- --refresh` to download again. Vulnerability values typed into the CSV are kept. |
| `npm run data` | Builds `public/data/lka_gap.json`. Fails on unmatched province names, a wrong CSG raw total (19,458,042,200) or shares that don't sum to 1. |
| `npm run data:drought` | Rebuilds the India/Zambia demo data (`public/data/{ind,zmb}.json`, `src/data/summary.json`). |

**Adding vulnerability:** fill `vulnerability_score` (0–1, e.g. DCS HIES poverty headcount) in `hazard/lka_province_hazard.csv`, then run `npm run data`.

**District level:** request a project-level export from the IWMI CSG team (`project_id, name, category, budget_usd, start_year, end_year, status, funder, provinces, districts, hazards`, lists separated by `;`), save it as `data-raw/csg/lka_projects_export.csv`, add `data-raw/hazard/lka_district_hazard.csv`, and run `npm run data`. Budgets are split across each project's districts, so nothing is double counted. The JSON keeps the same shape, with `unit: "district"`.

### Gap formulas (`scripts/build-lka-gap.mjs`)
- `R(p,h) = ∛(H × E × V)` (only the components that are loaded); `R(p)` = mean over hazards
- `rs = R / ΣR`, `fs = F / ΣF` with `F = Adaptation + Cross-cutting` (mitigation excluded)
- `gap index = rs − fs` (> 0 = underfunded relative to risk)
- `expected = rs × national (Adaptation + Cross-cutting)`; `estimated gap = expected − scaled finance`
- `coverage(p,h) = (projects share) / (risk share)` for each hazard

## Stack
Next.js 16 (App Router), React 19, Tailwind CSS 4, MapLibre GL 6, lucide-react. Basemap © Esri, © OpenStreetMap contributors; boundaries © geoBoundaries (CC BY 4.0); finance © IWMI CSG Project Tracker.
