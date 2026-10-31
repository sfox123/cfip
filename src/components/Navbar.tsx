"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import climateAction from "../../public/brand/cgiar-climate-action.png";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/hazard-finance", label: "Hazard × Finance" },
  { href: "/finance-gap", label: "Drought Explorer" },
  { href: "/knowledge", label: "Knowledge Bank" },
  { href: "/methodology", label: "Methodology" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      {/* thin IWMI water stripe */}
      <div className="h-0.75 bg-[linear-gradient(90deg,var(--color-forest),var(--color-brand-2)_45%,var(--color-water))]" />
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 px-5 pt-2.5 md:h-15 md:flex-nowrap md:pt-0">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Climate Finance Intelligence, home">
          {/* IWMI only publishes a white transparent logo; tint it via a mask so it reads on white */}
          <span
            role="img"
            aria-label="IWMI, International Water Management Institute"
            className="block h-5 w-36 bg-forest sm:h-6.5 sm:w-47"
            style={{
              maskImage: "url(/brand/iwmi-logo-white.png)",
              WebkitMaskImage: "url(/brand/iwmi-logo-white.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "left center",
              WebkitMaskPosition: "left center",
            }}
          />
          <span className="h-8 w-px bg-line" />
          <Image src={climateAction} alt="CGIAR Climate Action" height={36} className="h-7 w-auto sm:h-9" priority />
          <span className="hidden h-8 w-px bg-line xl:block" />
          <span className="hidden leading-tight xl:block">
            <span className="block text-[14px] font-semibold tracking-tight text-ink">Climate Finance Intelligence</span>
            <span className="block text-[11px] text-ink-3">Water data for climate resilience</span>
          </span>
        </Link>
        {/* own row on small screens so the logos keep their space */}
        <nav className="scroll-thin -mx-2 flex w-full items-center gap-0.5 overflow-x-auto md:mx-0 md:ml-auto md:w-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative whitespace-nowrap px-3 py-2 text-[13.5px] transition ${
                  active ? "font-semibold text-forest" : "text-ink-2 hover:text-brand"
                }`}
              >
                {l.label}
                <span className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-water transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
