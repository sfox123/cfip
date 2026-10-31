# Climate Finance Intelligence (IWMI)

District-level drought risk, finance flows and **drought finance gaps** for **India** and **Zambia** (Sri Lanka as a pilot), plus a **Knowledge Bank** of drought and climate-risk tools.

It takes the country-level logic of the Drought Finance Accelerator Tool (DFAT) — Drought Risk Index → risk-adjusted need → allocated finance → finance gap — down to districts. Click a district to see what is funded, what is missing, and which IWMI tools (SADMS, ZADMS, SukhaRakshak AI, AgRISE, CSG, ENSO Outlook) can guide action.

> **Data status:** district boundaries (geoBoundaries ADM2) and programme names are real. Risk scores, baselines and allocations are **illustrative placeholders** until the district matrix and project data are loaded. Banners in the UI say so and disappear automatically when real CSVs are present.

## Pages

| Route | What it does |
|---|---|
| `/` | Overview: country KPIs, how the pieces fit (risk → need → finance → gap → action), next steps |
| `/finance-gap` | MapLibre choropleth of 8 layers (gap, gap %, DRI, need, allocated, H/E/V); state/province filter; largest-gap ranking; CSV export; district panel with finance position, risk breakdown, programmes by instrument and links to related tools |
| `/knowledge` | 27 curated links (IWMI tools, HungerMap, PRISM, FAO ASIS, FEWS NET, INFORM, GCF, IATI…), search and filters, **Add link** (saved in the browser), JSON import/export |
| `/methodology` | Indicator definitions and how to load real data |

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Deploys to Vercel as-is. (`predev`/`prebuild` copy MapLibre's worker into `public/` because Turbopack can't resolve it from `node_modules`.)

## Loading real data

```
data-raw/
  ind_adm2.geojson, zmb_adm2.geojson, lka_adm2.geojson   boundaries (simplified)
  *_adm1.geojson                                         state/province outlines
  programmes.json                                        programme catalogue per country
  templates/<iso>_metrics.csv                            current values, one row per district
  templates/<iso>_projects.csv                           current allocations, one row per district × programme
```

1. Copy `templates/ind_metrics.csv` → `data-raw/ind_metrics.csv` and replace `hazard, exposure, vulnerability, baseline_usd_m` with real values (keep `district_id`).
2. Copy `templates/ind_projects.csv` → `data-raw/ind_projects.csv` with real `programme_id, amount_usd_m, year` rows (e.g. from the CSG Project Tracker). Add any new programmes to `programmes.json`.
3. `npm run data` → rebuilds `public/data/ind.json` and `src/data/summary.json`.

Same for `zmb` and `lka`. If the supervisor's matrix already contains DRI / need / allocated per district, extend `scripts/build-data.mjs` to read those columns directly instead of computing them.

### Formulas (in `scripts/build-data.mjs`)
- `DRI = ∛(H × E × V)`
- `need = DRI × baseline × 0.14 × (0.6 + 0.8 × H)` — placeholder cost factor; replace with the agreed DFAT method
- `gap = need − Σ allocations`; `gap% = gap / need`

## Stack
Next.js 16 (App Router), React 19, Tailwind CSS 4, MapLibre GL 6, lucide-react. Basemap © Esri, © OpenStreetMap contributors; boundaries © geoBoundaries (CC BY 4.0).
