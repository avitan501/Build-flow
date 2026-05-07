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

function DockItem({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group flex min-w-0 flex-1 flex-col items-center justify-center rounded-full px-1 py-1 transition-all duration-150 ease-out active:scale-[0.96] ${
        active ? "text-slate-900" : "text-slate-500"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150 ease-out group-active:scale-[1.06] ${
          active
            ? "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-900 shadow-[0_10px_20px_rgba(59,130,246,0.14)] ring-4 ring-sky-100/60"
            : "border-transparent bg-white/75 text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.06)] group-hover:bg-slate-100/90 group-active:bg-slate-100 group-active:shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
        }`}
      >
        {children}
      </span>
      <span className={`mt-1 text-[10px] font-medium leading-none transition-transform duration-150 ease-out group-active:scale-[1.03] ${active ? "text-slate-800" : "text-slate-500"}`}>
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-3 sm:hidden">
        <nav
          aria-label="Mobile homepage"
          className="pointer-events-auto mx-auto flex max-w-[22rem] items-center justify-between gap-0.5 rounded-full border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-2 py-1.5 shadow-[0_18px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl"
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
          <DockItem href={uploadHref} label="Upload" active={isActivePath(pathname, "/upload")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
