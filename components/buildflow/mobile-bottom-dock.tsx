"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomDockProps = {
  projectsHref: string;
};

const HIDDEN_DOCK_PATHS = new Set(["/login", "/signup", "/reset-password", "/request-quote", "/beat-a-quote"]);

function shouldShowDock(pathname: string) {
  return !HIDDEN_DOCK_PATHS.has(pathname) && !pathname.startsWith("/admin");
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function DockItem({ href, label, active, children, accent = false }: { href: string; label: string; active: boolean; children: ReactNode; accent?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      className={`group relative flex min-w-0 ${accent ? "flex-[1.28]" : "flex-1"} flex-col items-center justify-center rounded-[18px] px-1 py-1.5 text-center transition-all duration-200 ease-out active:scale-[0.96] ${
        active
          ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.16))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),inset_0_-8px_14px_rgba(255,255,255,0.06),0_8px_18px_rgba(148,163,184,0.1)]"
          : "text-slate-500/95"
      }`}
    >
      <span
        className={`relative flex items-center justify-center overflow-hidden transition-all duration-200 ease-out group-active:translate-y-[1px] ${
          accent
            ? "h-[2.125rem] w-[2.125rem] rounded-[999px] border border-[#f0d18a]/55 bg-[linear-gradient(180deg,rgba(247,215,132,0.96),rgba(220,168,69,0.94))] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-5px_12px_rgba(255,255,255,0.08),0_10px_20px_rgba(220,168,69,0.18),0_0_0_1px_rgba(255,244,214,0.22)]"
            : active
              ? "h-[1.95rem] w-[1.95rem] rounded-full border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(239,246,255,0.34))] text-[#10233f] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),inset_0_-8px_12px_rgba(255,255,255,0.05),0_8px_16px_rgba(148,163,184,0.12),0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-[16px]"
              : "h-[1.95rem] w-[1.95rem] rounded-full border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.08))] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-8px_12px_rgba(255,255,255,0.04)] backdrop-blur-[12px]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[18%] top-[10%] h-[34%] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.08))] blur-[0.5px] ${accent ? "opacity-95" : active ? "opacity-85" : "opacity-60"}`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[24%] bottom-[16%] h-[24%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_72%)] ${accent ? "opacity-80" : active ? "opacity-65" : "opacity-35"}`}
        />
        <span className="relative z-10">{children}</span>
      </span>
      <span className={`mt-1 text-[10px] font-medium leading-none ${accent ? "text-slate-800" : active ? "text-slate-800" : "text-slate-500/95"}`}>
        {label}
      </span>
    </Link>
  );
}

export function MobileBottomDock({ projectsHref }: MobileBottomDockProps) {
  const pathname = usePathname();

  if (!pathname || !shouldShowDock(pathname)) {
    return null;
  }

  const shopHref = "/shop";

  return (
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+0.35rem)] left-1/2 z-50 w-[calc(100%-1rem)] max-w-[29rem] -translate-x-1/2 px-2 lg:hidden">
        <nav
          aria-label="Mobile homepage"
          className="pointer-events-auto relative flex w-full items-center justify-between gap-1 overflow-hidden rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(240,247,255,0.18))] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-12px_20px_rgba(255,255,255,0.08),0_18px_34px_rgba(15,23,42,0.12),0_6px_16px_rgba(148,163,184,0.12)] backdrop-blur-[26px] [backdrop-filter:blur(26px)_saturate(145%)]"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/35" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1 h-4 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.14))] opacity-90 blur-[0.8px]" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-4 left-10 right-10 h-10 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_72%)] opacity-75" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.16),transparent_72%)]" />
          <DockItem href="/" label="Home" active={isActivePath(pathname, "/")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
          </DockItem>
          <DockItem href={shopHref} label="Let's Work" active={isActivePath(pathname, "/shop")} accent>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 11 12 4l8.5 7" />
              <path d="M5.5 10.5V20h13v-9.5" />
              <path d="M9 20v-6h6v6" />
              <path d="M7 7.5V4h3" />
              <path d="M16.5 7.5h3" />
              <path d="M18 6v3" />
            </svg>
          </DockItem>
          <DockItem href={projectsHref} label="My Projects" active={isActivePath(pathname, "/projects")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="7" height="7" rx="1.5" />
              <rect x="14" y="4" width="7" height="7" rx="1.5" />
              <rect x="3" y="13" width="7" height="7" rx="1.5" />
              <rect x="14" y="13" width="7" height="7" rx="1.5" />
            </svg>
          </DockItem>
        </nav>
      </div>
  );
}
