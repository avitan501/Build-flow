"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";

type SearchItem = {
  title: string;
  description: string;
  href: string;
  keywords: string[];
  badge: string;
};

type MobileBottomDockProps = {
  accountHref: string;
  searchItems: SearchItem[];
};

function DockItem({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="flex min-w-[56px] flex-1 flex-col items-center justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">{children}</span>
      <span className="mt-1 text-[11px] font-medium text-slate-600">{label}</span>
    </Link>
  );
}

export function MobileBottomDock({ accountHref, searchItems }: MobileBottomDockProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return searchItems.slice(0, 6);
    }

    return searchItems
      .filter((item) => [item.title, item.description, item.badge, ...item.keywords].join(" ").toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [normalizedQuery, searchItems]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
      {searchOpen ? (
        <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search BuildFlow</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Search project name, project address, and material names from your material list.</p>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type project, address, or material"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {normalizedQuery ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}` : "Start typing to search."}
          </div>

          <div className="mt-3 grid gap-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  onClick={() => setSearchOpen(false)}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.badge}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                No matches yet. Try project name, address, upload, or material name.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <nav aria-label="Mobile homepage" className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-[0_20px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <DockItem href="/" label="Home">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
        </DockItem>
        <DockItem href="/projects" label="Projects">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="7" height="7" rx="1.5" />
            <rect x="14" y="4" width="7" height="7" rx="1.5" />
            <rect x="3" y="13" width="7" height="7" rx="1.5" />
            <rect x="14" y="13" width="7" height="7" rx="1.5" />
          </svg>
        </DockItem>
        <DockItem href="/upload" label="Upload">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V5" />
            <path d="m7 10 5-5 5 5" />
            <path d="M5 19h14" />
          </svg>
        </DockItem>
        <DockItem href={accountHref} label="Account">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        </DockItem>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen((open) => !open)}
          className="flex min-w-[56px] flex-1 flex-col items-center justify-center"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${searchOpen ? "bg-[#0e2341] text-white" : "bg-slate-100 text-slate-700"}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <span className="mt-1 text-[11px] font-medium text-slate-600">Search</span>
        </button>
      </nav>
    </div>
  );
}
