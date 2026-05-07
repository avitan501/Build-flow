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
      className={`group flex min-w-0 flex-1 flex-col items-center justify-end rounded-full px-1 py-1 text-center transition-all duration-150 ease-out active:scale-[0.96] ${
        active ? "text-white" : "text-slate-300"
      }`}
    >
      <span
        className={`flex items-center justify-center transition-all duration-150 ease-out group-active:scale-[1.06] ${
          accent
            ? "h-14 w-14 -translate-y-4 rounded-full border border-[#efca75]/35 bg-[linear-gradient(180deg,#f2ca70_0%,#dba544_100%)] text-slate-950 shadow-[0_18px_34px_rgba(220,164,69,0.34)]"
            : active
              ? "h-11 w-11 rounded-2xl border border-[#efca75]/25 bg-[linear-gradient(180deg,rgba(242,202,112,0.16),rgba(242,202,112,0.06))] text-[#f4d184] shadow-[0_12px_24px_rgba(220,164,69,0.12)]"
              : "h-11 w-11 rounded-2xl border border-transparent bg-transparent text-slate-300"
        }`}
      >
        {children}
      </span>
      <span className={`mt-1 text-[10px] font-medium leading-none ${accent ? "-mt-1 text-white" : active ? "text-[#f4d184]" : "text-slate-300"}`}>
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
      <div aria-hidden="true" className="h-24 sm:hidden" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-50 px-3 sm:hidden">
        <nav
          aria-label="Mobile homepage"
          className="pointer-events-auto mx-auto flex max-w-[23rem] items-end justify-between gap-1 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,21,43,0.96),rgba(10,24,46,0.94))] px-3 pb-2 pt-3 shadow-[0_24px_50px_rgba(2,8,23,0.42)] backdrop-blur-xl"
        >
          <DockItem href="/" label="Home" active={isActivePath(pathname, "/")}>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
          </DockItem>
          <DockItem href={projectsHref} label="Projects" active={isActivePath(pathname, "/projects")}>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="7" height="7" rx="1.5" />
              <rect x="14" y="4" width="7" height="7" rx="1.5" />
              <rect x="3" y="13" width="7" height="7" rx="1.5" />
              <rect x="14" y="13" width="7" height="7" rx="1.5" />
            </svg>
          </DockItem>
          <DockItem href={uploadHref} label="Upload" active={isActivePath(pathname, "/upload")} accent>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </DockItem>
          <DockItem href={accountHref} label="Account" active={isActivePath(pathname, "/dashboard")}>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </DockItem>
          <DockItem href={searchHref} label="Search" active={isActivePath(pathname, "/shop") || isActivePath(pathname, "/materials") || isActivePath(pathname, "/quotes") || isActivePath(pathname, "/orders")}>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </DockItem>
        </nav>
      </div>
    </>
  );
}
