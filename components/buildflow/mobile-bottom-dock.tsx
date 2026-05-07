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
      className={`group flex min-w-0 flex-1 flex-col items-center justify-end rounded-full px-0.5 py-0.5 text-center transition-all duration-150 ease-out active:scale-[0.96] ${
        active ? "text-slate-900" : "text-slate-500"
      }`}
    >
      <span
        className={`flex items-center justify-center transition-all duration-150 ease-out group-active:scale-[1.06] ${
          accent
            ? "h-12 w-12 -translate-y-3 rounded-full border border-[#efca75]/35 bg-[linear-gradient(180deg,#f2ca70_0%,#dba544_100%)] text-slate-950 shadow-[0_14px_28px_rgba(220,164,69,0.32)]"
            : active
              ? "h-9.5 w-9.5 rounded-[18px] border border-[#efca75]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.92))] text-[#c68b2c] shadow-[0_10px_20px_rgba(220,164,69,0.08)]"
              : "h-9.5 w-9.5 rounded-[18px] border border-transparent bg-transparent text-slate-500"
        }`}
      >
        {children}
      </span>
      <span className={`mt-0.5 text-[9px] font-medium leading-none ${accent ? "-mt-0.5 text-slate-900" : active ? "text-[#c68b2c]" : "text-slate-500"}`}>
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
      <div aria-hidden="true" className="h-20 sm:hidden" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.35rem)] z-50 px-3 sm:hidden">
        <nav
          aria-label="Mobile homepage"
          className="pointer-events-auto mx-auto flex max-w-[21.75rem] items-end justify-between gap-0.5 rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.92))] px-2.5 pb-1.5 pt-2.5 shadow-[0_18px_38px_rgba(148,163,184,0.18)] backdrop-blur-xl"
        >
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
