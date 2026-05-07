"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ShopItem = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  projectId: string;
  projectName: string;
  projectAddress: string | null;
};

type ShopSearchPanelProps = {
  items: ShopItem[];
};

export function ShopSearchPanel({ items }: ShopSearchPanelProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      [item.name, item.category || "", item.status, item.projectName, item.projectAddress || ""].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [items, normalizedQuery]);

  return (
    <>
      <div className="rounded-[28px] border border-[#25446d] bg-[#0e2341] p-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Shop Search</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Search available materials</h1>
        <p className="mt-2 text-sm leading-6 text-slate-200">For now this search shows only materials BuildFlow has in the website flow.</p>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-white px-4 py-3 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search material, category, or project address"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <p className="mt-3 text-xs text-slate-200">
          {normalizedQuery ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}` : "You can search material name, category, project name, or project address."}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/materials?projectId=${item.projectId}`}
              className="block rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.category || "Material"} · {item.status}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.projectName}{item.projectAddress ? ` • ${item.projectAddress}` : ""}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Material</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            No material matches yet. Try material name, category, or project address.
          </div>
        )}
      </div>
    </>
  );
}
