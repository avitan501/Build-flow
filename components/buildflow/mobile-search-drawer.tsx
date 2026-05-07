"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SearchItem = {
  title: string;
  description: string;
  href: string;
  keywords: string[];
  badge: string;
};

type MobileSearchDrawerProps = {
  items: SearchItem[];
  mode?: "inline" | "floating";
  onClose?: () => void;
};

export function MobileSearchDrawer({ items, mode = "inline", onClose }: MobileSearchDrawerProps) {
  const [open, setOpen] = useState(mode === "inline");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const pool = normalizedQuery
      ? items.filter((item) => [item.title, item.description, item.badge, ...item.keywords].join(" ").toLowerCase().includes(normalizedQuery))
      : items;

    return pool.slice(0, 6);
  }, [items, normalizedQuery]);

  const shellClass =
    mode === "floating"
      ? "rounded-[28px] border border-[#25446d] bg-[#0e2341] p-4 text-white shadow-[0_24px_50px_rgba(15,23,42,0.34)] backdrop-blur-xl"
      : "rounded-[28px] border border-[#25446d] bg-[#10294d] p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]";

  const scopeText = "Search project name, project address, and material names from your material list.";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Search BuildFlow</p>
          <p className="mt-1 text-xs leading-5 text-slate-200">{scopeText}</p>
        </div>
        {mode === "floating" ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClose?.();
            }}
            aria-label="Close search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/14 text-white active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Collapse search" : "Open search"}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white active:scale-[0.98]"
          >
            {open ? "Hide" : "Open"}
          </button>
        )}
      </div>

      {open ? (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/12 bg-white px-4 py-3 shadow-sm">
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

          <div className="mt-3 text-xs text-slate-200">
            {normalizedQuery ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}` : "Start typing to search."}
          </div>

          <div className="mt-3 grid gap-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  onClick={() => {
                    setOpen(mode === "inline");
                    if (mode === "floating") onClose?.();
                  }}
                  className="block rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-sm text-white transition active:scale-[0.99] hover:bg-white/16"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-200">{item.description}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0e2341]">
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
        </>
      ) : null}
    </div>
  );
}

export type { SearchItem };
