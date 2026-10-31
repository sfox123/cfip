export type Category =
  | "IWMI drought & climate tools"
  | "Early warning & food security"
  | "Risk & hazard data"
  | "Climate finance data"
  | "Guidance & methods";

export const CATEGORIES: Category[] = [
  "IWMI drought & climate tools",
  "Early warning & food security",
  "Risk & hazard data",
  "Climate finance data",
  "Guidance & methods",
];

export const COUNTRY_TAGS = ["India", "Zambia", "Sri Lanka", "South Asia", "Africa", "Global"] as const;

export type KnowledgeItem = {
  id: string;
  title: string;
  url: string;
  org: string;
  category: Category;
  countries: string[];
  description: string;
  tags: string[];
  iwmi?: boolean;
  userAdded?: boolean;
};

export const KNOWLEDGE: KnowledgeItem[] = [
  // ---------------- IWMI ----------------
  {
    id: "enso",
    title: "ENSO Outlook",
    url: "https://enso.iwmi.org",
    org: "IWMI",
    category: "IWMI drought & climate tools",
    countries: ["Global", "South Asia", "Africa"],
    description:
      "Seasonal ENSO-driven outlooks with the Ready–Set–Go anticipatory-action triggers for flood and drought (Action Hub), plus the Ask AI assistant.",
    tags: ["seasonal outlook", "anticipatory action", "triggers"],
    iwmi: true,
  },
  {
    id: "aware",
    title: "AWARE",
    url: "http://aware.iwmi.org/",
    org: "IWMI · CGIAR ClimBeR",
    category: "IWMI drought & climate tools",
    countries: ["Global", "Africa", "South Asia"],
    description:
      "Multi-country platform that links early warning to early action and early finance in response to climate shocks.",
    tags: ["early warning", "early finance", "multi-country"],
    iwmi: true,
  },
  {
    id: "sukharakshak",
    title: "SukhaRakshak AI",
    url: "https://dms.iwmi.org/sukharakshak-ai",
    org: "IWMI",
    category: "IWMI drought & climate tools",
    countries: ["India"],
    description:
      "Multilingual drought advisory assistant for farmers, grounded in district-level agricultural contingency plans.",
    tags: ["farm advisory", "contingency plans", "AI"],
    iwmi: true,
  },
  {
    id: "agrise",
    title: "AgRISE",
    url: "https://agrise.app/",
    org: "IWMI",
    category: "IWMI drought & climate tools",
    countries: ["India"],
    description:
      "Remote-sensing support for PMFBY crop insurance: sub-district crop risk scores, portfolio exposure, claim evidence packs and a parametric index lab.",
    tags: ["crop insurance", "PMFBY", "risk transfer"],
    iwmi: true,
  },
  {
    id: "sadms",
    title: "South Asia Drought Monitoring System (SADMS)",
    url: "https://dms.iwmi.org",
    org: "IWMI · ICAR",
    category: "IWMI drought & climate tools",
    countries: ["India", "Sri Lanka", "South Asia"],
    description:
      "Seasonal, sub-seasonal and 7-day forecasts, drought severity monitoring (IDSI, SPI, soil moisture) and district contingency plans across South Asia.",
    tags: ["drought monitoring", "IDSI", "contingency plans"],
    iwmi: true,
  },
  {
    id: "zadms",
    title: "Zambia Drought Management System (ZADMS)",
    url: "https://zadmsdemo.iwmi.org",
    org: "IWMI · Ministry of Agriculture, Zambia",
    category: "IWMI drought & climate tools",
    countries: ["Zambia"],
    description:
      "End-to-end drought management portal for Zambia: forecasts, drought severity monitoring, bulletins and an API for drought indices.",
    tags: ["drought monitoring", "bulletins", "API"],
    iwmi: true,
  },
  {
    id: "malidms",
    title: "Mali Drought Monitoring System (MaliDMS)",
    url: "https://www.cgiar.org/research/publication/drought-monitoring-mali",
    org: "IWMI · DNA Mali",
    category: "IWMI drought & climate tools",
    countries: ["Africa"],
    description:
      "Monitors drought onset, duration, extent and severity in Mali using WaPOR-derived and other high-resolution remote-sensing data (tool brief).",
    tags: ["drought monitoring", "WaPOR"],
    iwmi: true,
  },
  {
    id: "hydrosecure",
    title: "HydroSecure Dashboard (Africa multi-hazard)",
    url: "https://hydrosecure-demo.iwmi.org/",
    org: "IWMI · DIWASA · AICCRA Zambia",
    category: "IWMI drought & climate tools",
    countries: ["Africa", "Zambia"],
    description:
      "Flood and drought assessments and a sub-national multi-hazard map for Africa, built with Digital Earth Africa partners.",
    tags: ["multi-hazard map", "flood", "drought"],
    iwmi: true,
  },
  {
    id: "csg",
    title: "Climate-Smart Governance (CSG) Dashboard",
    url: "https://csg.iwmi.org/index.html",
    org: "IWMI · CGIAR ClimBeR",
    category: "IWMI drought & climate tools",
    countries: ["Sri Lanka", "Zambia", "Africa"],
    description:
      "Climate risk, project tracker, adaptation catalogue, investment portfolio planning and NDC tracking — includes a Water Adaptation Finance (WAF) index by district.",
    tags: ["project tracker", "adaptation finance", "WAF index"],
    iwmi: true,
  },
  {
    id: "csg-ai",
    title: "CSG AI Agent",
    url: "https://csg.iwmi.org/aiagent/#/home",
    org: "IWMI",
    category: "IWMI drought & climate tools",
    countries: ["Sri Lanka", "Zambia"],
    description: "Conversational assistant over CSG data, used to draft district climate risk profiles.",
    tags: ["AI", "climate risk profile"],
    iwmi: true,
  },

  // ---------------- Early warning / food security ----------------
  {
    id: "hungermap",
    title: "HungerMap LIVE",
    url: "https://hungermap.wfp.org/",
    org: "WFP",
    category: "Early warning & food security",
    countries: ["Global"],
    description: "Near real-time food security monitoring with hazard, rainfall and vegetation layers by country and region.",
    tags: ["food security", "near real-time"],
  },
  {
    id: "prism",
    title: "PRISM",
    url: "https://innovation.wfp.org/project/prism",
    org: "WFP",
    category: "Early warning & food security",
    countries: ["Global", "Sri Lanka"],
    description:
      "Open-source climate risk monitoring that combines hazard layers with vulnerability data; deployed with governments including Sri Lanka.",
    tags: ["hazard monitoring", "open source"],
  },
  {
    id: "asis",
    title: "FAO GIEWS – Agricultural Stress Index (ASIS)",
    url: "https://www.fao.org/giews/earthobservation/asis/",
    org: "FAO",
    category: "Early warning & food security",
    countries: ["Global"],
    description: "Satellite-based detection of cropland and grassland under water stress during the growing season.",
    tags: ["agricultural drought", "remote sensing"],
  },
  {
    id: "fewsnet",
    title: "FEWS NET",
    url: "https://fews.net/",
    org: "USAID-funded",
    category: "Early warning & food security",
    countries: ["Africa", "Zambia", "Global"],
    description: "Food security outlooks and alerts, including southern Africa.",
    tags: ["food security", "outlooks"],
  },
  {
    id: "ipc",
    title: "IPC – Integrated Food Security Phase Classification",
    url: "https://www.ipcinfo.org/",
    org: "IPC partnership",
    category: "Early warning & food security",
    countries: ["Global", "Zambia"],
    description: "Standard classification of acute food insecurity severity used by governments and humanitarian agencies.",
    tags: ["food security", "classification"],
  },

  // ---------------- Risk & hazard ----------------
  {
    id: "gdo",
    title: "Global Drought Observatory",
    url: "https://drought.emergency.copernicus.eu/",
    org: "Copernicus · EC JRC",
    category: "Risk & hazard data",
    countries: ["Global"],
    description: "Global drought indicators (precipitation, soil moisture, vegetation) and drought risk analyses.",
    tags: ["drought indicators", "global"],
  },
  {
    id: "inform",
    title: "INFORM Risk Index",
    url: "https://drmkc.jrc.ec.europa.eu/inform-index",
    org: "EC JRC · IASC",
    category: "Risk & hazard data",
    countries: ["Global"],
    description: "Composite hazard–exposure–vulnerability–coping capacity index; the reference design for a drought risk index.",
    tags: ["risk index", "methodology"],
  },
  {
    id: "thinkhazard",
    title: "ThinkHazard!",
    url: "https://thinkhazard.org/",
    org: "GFDRR · World Bank",
    category: "Risk & hazard data",
    countries: ["Global"],
    description: "Hazard levels (including water scarcity) by admin unit for project screening.",
    tags: ["hazard screening", "admin-2"],
  },
  {
    id: "cckp",
    title: "Climate Change Knowledge Portal – country risk profiles",
    url: "https://climateknowledgeportal.worldbank.org/",
    org: "World Bank",
    category: "Risk & hazard data",
    countries: ["Global", "India", "Zambia", "Sri Lanka"],
    description: "Historical and projected climate data plus country climate risk profiles.",
    tags: ["climate risk profile", "projections"],
  },
  {
    id: "geoboundaries",
    title: "geoBoundaries",
    url: "https://www.geoboundaries.org/",
    org: "William & Mary geoLab",
    category: "Risk & hazard data",
    countries: ["Global"],
    description: "Open administrative boundaries (used for the district layers in this platform).",
    tags: ["boundaries", "open data"],
  },

  // ---------------- Climate finance ----------------
  {
    id: "cfu",
    title: "Climate Funds Update",
    url: "https://climatefundsupdate.org/",
    org: "ODI · Heinrich Böll Stiftung",
    category: "Climate finance data",
    countries: ["Global"],
    description: "Tracks approvals and disbursements of multilateral climate funds by country.",
    tags: ["multilateral funds", "approvals"],
  },
  {
    id: "gcf",
    title: "Green Climate Fund – project portfolio",
    url: "https://www.greenclimate.fund/projects",
    org: "GCF",
    category: "Climate finance data",
    countries: ["Global", "Zambia", "Sri Lanka", "India"],
    description: "GCF-approved projects with financing and target geographies.",
    tags: ["projects", "adaptation finance"],
  },
  {
    id: "wbprojects",
    title: "World Bank Projects & Operations",
    url: "https://projects.worldbank.org/",
    org: "World Bank",
    category: "Climate finance data",
    countries: ["Global", "India", "Zambia", "Sri Lanka"],
    description: "Project financing, locations and documents for programmes such as Atal Bhujal, PoCRA, TRALARD and CSIAP.",
    tags: ["projects", "loans"],
  },
  {
    id: "dportal",
    title: "IATI d-portal",
    url: "https://d-portal.org/",
    org: "IATI",
    category: "Climate finance data",
    countries: ["Global"],
    description: "Searchable donor activity data (commitments, disbursements, locations) published to IATI.",
    tags: ["aid flows", "open data"],
  },
  {
    id: "cpi",
    title: "Climate Policy Initiative",
    url: "https://www.climatepolicyinitiative.org/",
    org: "CPI",
    category: "Climate finance data",
    countries: ["Global", "India"],
    description: "Global Landscape of Climate Finance and country-level climate finance tracking studies.",
    tags: ["finance tracking", "landscape"],
  },

  // ---------------- Guidance ----------------
  {
    id: "idmp",
    title: "Integrated Drought Management Programme (IDMP)",
    url: "https://www.droughtmanagement.info/",
    org: "WMO · GWP",
    category: "Guidance & methods",
    countries: ["Global"],
    description: "The three pillars of drought management: monitoring & early warning, vulnerability & impact assessment, mitigation & response.",
    tags: ["drought policy", "three pillars"],
  },
  {
    id: "unccd",
    title: "UNCCD Drought Toolbox",
    url: "https://www.unccd.int/land-and-life/drought/toolbox",
    org: "UNCCD",
    category: "Guidance & methods",
    countries: ["Global"],
    description: "Tools and case studies for drought preparedness, risk assessment and risk mitigation.",
    tags: ["toolbox", "preparedness"],
  },
];
