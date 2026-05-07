"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SearchItem = {
  title: string;
  description: string;
  href: string;
  tone: "navy" | "slate" | "emerald";
  keywords: string[];
  badge: string;
};

type SearchPanelProps = {
  items: SearchItem[];
};

function toneClasses(tone: SearchItem["tone"]) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "navy") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-900";
}

export function SearchPanel({ items }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [item.title, item.description, item.badge, ...item.keywords].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const visibleItems = filteredItems.slice(0, 8);

  return (
    <>
      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <label htmlFor="buildflow-search" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Search BuildFlow
        </label>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="buildflow-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, upload, materials, quote, orders..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {normalizedQuery ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"} found.` : "Start typing to filter BuildFlow pages and project items."}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <Link key={`${item.href}-${item.title}`} href={item.href} className={`block rounded-[24px] border p-4 transition hover:-translate-y-0.5 hover:bg-white ${toneClasses(item.tone)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 opacity-80">{item.description}</p>
                </div>
                <span className="rounded-full border border-current/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {item.badge}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <div className="text-sm font-semibold">No matches yet</div>
            <p className="mt-2 text-sm leading-6">Try words like project, upload, materials, quote, orders, address, or dashboard.</p>
          </div>
        )}
      </div>
    </>
  );
}
