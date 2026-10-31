"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/hazard-finance", label: "Hazard × Finance", also: [] as string[] },
  { href: "/drought-pilot", label: "Drought pilot", also: ["/finance-gap"] },
  { href: "/knowledge", label: "Knowledge Bank", also: [] as string[] },
  { href: "/methodology", label: "Methodology", also: [] as string[] },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-5">
        <Link href="/hazard-finance" className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Climate Finance Intelligence</div>
            <div className="text-[11px] text-ink-3">IWMI · Water Data for Climate Resilience</div>
          </div>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = [l.href, ...l.also].some((h) => path.startsWith(h));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                  active ? "bg-brand text-white" : "text-ink-2 hover:bg-brand-soft hover:text-brand"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4a3aa7" />
      <path d="M16 6c4 5.2 6.5 8.8 6.5 12.2A6.5 6.5 0 0 1 9.5 18.2C9.5 14.8 12 11.2 16 6Z" fill="#fff" opacity=".95" />
      <path d="M12.5 19.5h7M14 22.5h4" stroke="#e8664f" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
