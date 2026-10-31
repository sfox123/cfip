"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Download, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { CATEGORIES, COUNTRY_TAGS, KNOWLEDGE, type Category, type KnowledgeItem } from "@/data/knowledge";

const STORE_KEY = "cfi.knowledge.userItems.v1";

const CAT_STYLE: Record<Category, string> = {
  "IWMI drought & climate tools": "bg-brand-soft text-brand",
  "Early warning & food security": "bg-amber-50 text-amber-700",
  "Risk & hazard data": "bg-coral-soft text-coral",
  "Climate finance data": "bg-aqua-soft text-aqua",
  "Guidance & methods": "bg-stone-100 text-stone-600",
};

function loadUserItems(): KnowledgeItem[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as KnowledgeItem[]) : [];
  } catch {
    return [];
  }
}
function saveUserItems(items: KnowledgeItem[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
}

export default function KnowledgeBank() {
  const [userItems, setUserItems] = useState<KnowledgeItem[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [country, setCountry] = useState<string>("All");
  const [iwmiOnly, setIwmiOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setUserItems(loadUserItems());
  }, []);

  const all = useMemo(() => [...userItems, ...KNOWLEDGE], [userItems]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((k) => {
      if (cat !== "All" && k.category !== cat) return false;
      if (country !== "All" && !k.countries.includes(country)) return false;
      if (iwmiOnly && !k.iwmi) return false;
      if (!s) return true;
      return [k.title, k.org, k.description, ...k.tags].join(" ").toLowerCase().includes(s);
    });
  }, [all, q, cat, country, iwmiOnly]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: all.length };
    for (const k of all) c[k.category] = (c[k.category] || 0) + 1;
    return c;
  }, [all]);

  function addItem(item: KnowledgeItem) {
    const next = [item, ...userItems];
    setUserItems(next);
    saveUserItems(next);
    setAdding(false);
  }
  function removeItem(id: string) {
    const next = userItems.filter((x) => x.id !== id);
    setUserItems(next);
    saveUserItems(next);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "knowledge-bank.json";
    a.click();
  }
  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text()) as KnowledgeItem[];
      const known = new Set(all.map((x) => x.url));
      const fresh = data
        .filter((x) => x && x.url && x.title && !known.has(x.url))
        .map((x) => ({ ...x, id: `u-${crypto.randomUUID()}`, userAdded: true }));
      const next = [...fresh, ...userItems];
      setUserItems(next);
      saveUserItems(next);
    } catch {
      alert("Could not read that file — expected a JSON array of links.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Knowledge Bank</h1>
          <p className="mt-1.5 max-w-2xl text-ink-2">
            Drought, climate-risk and climate-finance tools in one place — IWMI platforms alongside external sources such as
            HungerMap and PRISM. Add your own links; they are kept in this browser and can be exported.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <Upload size={15} /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
          <button onClick={exportJson} className="btn-ghost">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={15} /> Add link
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools, organisations, tags…"
            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All geographies</option>
          {COUNTRY_TAGS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={iwmiOnly} onChange={(e) => setIwmiOnly(e.target.checked)} className="accent-brand" />
          IWMI tools only
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-[13px] transition ${
              cat === c ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-2 hover:border-brand"
            }`}
          >
            {c} <span className="opacity-60">{counts[c] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((k, i) => (
          <article
            key={k.id}
            className="rise group relative flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_30px_rgba(74,58,167,0.08)]"
            style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          >
            <div className="flex items-start gap-3">
              <Favicon url={k.url} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-snug">{k.title}</h3>
                <div className="text-[12px] text-ink-3">{k.org}</div>
              </div>
              {k.userAdded && (
                <button
                  onClick={() => removeItem(k.id)}
                  className="rounded-md p-1 text-ink-3 hover:bg-coral-soft hover:text-coral"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">{k.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CAT_STYLE[k.category]}`}>{k.category}</span>
              {k.countries.map((c) => (
                <span key={c} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-2">
                  {c}
                </span>
              ))}
              {k.userAdded && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Added by you</span>}
            </div>
            <a
              href={k.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Open {hostname(k.url)} <ArrowUpRight size={14} />
            </a>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-line p-10 text-center text-ink-3">
            Nothing matches those filters.
          </div>
        )}
      </div>

      {adding && <AddDialog onClose={() => setAdding(false)} onAdd={addItem} />}

    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function Favicon({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  const host = hostname(url);
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper text-sm font-semibold text-brand">
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
          alt=""
          width={22}
          height={22}
          onError={() => setOk(false)}
        />
      ) : (
        host.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

function AddDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (k: KnowledgeItem) => void }) {
  const [form, setForm] = useState({
    title: "",
    url: "",
    org: "",
    category: CATEGORIES[1] as Category,
    countries: [] as string[],
    description: "",
    tags: "",
  });
  const valid = form.title.trim() && /^https?:\/\//.test(form.url.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      id: `u-${crypto.randomUUID()}`,
      title: form.title.trim(),
      url: form.url.trim(),
      org: form.org.trim() || hostname(form.url),
      category: form.category,
      countries: form.countries.length ? form.countries : ["Global"],
      description: form.description.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      userAdded: true,
    });
  }

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a link</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-paper">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <input className={field} placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={field} placeholder="https://… *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Organisation" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} />
            <select
              className={field}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRY_TAGS.map((c) => {
              const on = form.countries.includes(c);
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() =>
                    setForm({ ...form, countries: on ? form.countries.filter((x) => x !== c) : [...form.countries, c] })
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-[12px] ${on ? "border-brand bg-brand text-white" : "border-line text-ink-2"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <textarea
            className={field}
            rows={3}
            placeholder="What is it useful for?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input className={field} placeholder="Tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button disabled={!valid} className="btn-primary disabled:opacity-40">
            Save link
          </button>
        </div>
      </form>
    </div>
  );
}
