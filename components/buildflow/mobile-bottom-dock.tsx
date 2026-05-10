"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomDockProps = {
  accountHref: string;
  projectsHref: string;
  uploadHref: string;
  searchHref: string;
};

const DOCK_PATHS = new Set(["/", "/dashboard", "/projects", "/projects/new", "/upload", "/materials", "/quotes", "/orders"]);

function shouldShowDock(pathname: string) {
  return pathname.startsWith("/projects/") || DOCK_PATHS.has(pathname);
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function DockItem({ href, label, active, children, accent = false }: { href: string; label: string; active: boolean; children: ReactNode; accent?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-full px-0.5 py-0.5 text-center transition-all duration-200 ease-out active:scale-[0.95] ${
        active ? "text-slate-900" : "text-slate-500"
      }`}
    >
      <span
        className={`relative flex items-center justify-center overflow-hidden transition-all duration-200 ease-out group-active:translate-y-[1px] ${
          accent
            ? "h-[2.875rem] w-[2.875rem] -translate-y-2 rounded-full border border-[#efca75]/45 bg-[linear-gradient(180deg,#f5d488_0%,#dca845_100%)] text-slate-950 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-6px_12px_rgba(255,255,255,0.08),0_18px_30px_rgba(220,168,69,0.28),0_0_0_1px_rgba(255,244,214,0.3)]"
            : active
              ? "h-[2.375rem] w-[2.375rem] rounded-[19px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(239,246,255,0.4))] text-[#10233f] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-10px_18px_rgba(255,255,255,0.14),0_14px_28px_rgba(148,163,184,0.16),0_0_0_1px_rgba(255,255,255,0.24),0_0_18px_rgba(191,219,254,0.34)] backdrop-blur-[14px]"
              : "h-[2.375rem] w-[2.375rem] rounded-[19px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] backdrop-blur-[10px]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[18%] top-[10%] h-[34%] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.06))] blur-[1px] ${accent ? "opacity-90" : active ? "opacity-80" : "opacity-55"}`}
        />
        <span className="relative z-10">{children}</span>
      </span>
      <span className={`mt-0.5 text-[9px] font-medium leading-none ${accent ? "text-slate-800" : active ? "text-slate-800" : "text-slate-500/95"}`}>
        {label}
      </span>
    </Link>
  );
}

export function MobileBottomDock({ accountHref, projectsHref, uploadHref, searchHref }: MobileBottomDockProps) {
  const pathname = usePathname();

  if (!pathname || !shouldShowDock(pathname)) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-[5.5rem] sm:hidden" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-50 px-3 sm:hidden">
        <nav
          aria-label="Mobile homepage"
          className="pointer-events-auto relative mx-auto flex max-w-[21.5rem] items-end justify-between gap-0.5 overflow-hidden rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(234,243,255,0.22))] px-2.5 pb-1.5 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),inset_0_-10px_18px_rgba(255,255,255,0.08),0_18px_40px_rgba(15,23,42,0.12),0_6px_16px_rgba(148,163,184,0.12)] backdrop-blur-[24px]"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-1 h-7 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.08))] opacity-80 blur-[1px]" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.16),transparent_72%)]" />
          <DockItem href="/" label="Home" active={isActivePath(pathname, "/")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
          </DockItem>
          <DockItem href={projectsHref} label="Projects" active={isActivePath(pathname, "/projects")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="7" height="7" rx="1.5" />
              <rect x="14" y="4" width="7" height="7" rx="1.5" />
              <rect x="3" y="13" width="7" height="7" rx="1.5" />
              <rect x="14" y="13" width="7" height="7" rx="1.5" />
            </svg>
          </DockItem>
          <DockItem href={uploadHref} label="Upload" active={isActivePath(pathname, "/upload")} accent>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </DockItem>
          <DockItem href={accountHref} label="Account" active={isActivePath(pathname, "/dashboard")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </DockItem>
          <DockItem href={searchHref} label="Search" active={isActivePath(pathname, "/shop") || isActivePath(pathname, "/materials") || isActivePath(pathname, "/quotes") || isActivePath(pathname, "/orders")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </DockItem>
        </nav>
      </div>
    </>
  );
}
