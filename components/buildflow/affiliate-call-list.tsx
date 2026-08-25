"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Phone, Search } from "lucide-react";

import { AFFILIATE_CALL_TARGETS } from "@/lib/affiliate-call-list";
import type { AffiliateProgram } from "@/lib/affiliate-tracker";

export function AffiliateCallList({ programs = [] }: { programs?: AffiliateProgram[] }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"All" | "A" | "B" | "C">("All");
  const [contactLevel, setContactLevel] = useState<"All" | "Dedicated team" | "Direct business" | "Pro or sales team" | "Network managed">("All");
  const statuses = useMemo(() => new Map(programs.map((program) => [program.supplier_name.toLowerCase(), program.affiliate_status])), [programs]);
  const filtered = AFFILIATE_CALL_TARGETS.filter((target) => {
    const search = query.trim().toLowerCase();
    return (priority === "All" || target.priority === priority)
      && (contactLevel === "All" || target.contactLevel === contactLevel)
      && (!search || `${target.company} ${target.category} ${target.phone} ${target.askFor} ${target.callRoute}`.toLowerCase().includes(search));
  });

  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Carlos call list</p><h3 className="mt-1 text-lg font-semibold">50 construction-focused targets</h3><p className="mt-1 text-sm text-slate-600">Direct and dedicated teams appear first. Every row gives the exact person or department to request.</p></div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{filtered.length} calls</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_12rem]">
        <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, category, or phone" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" /></label>
        <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option>All</option><option>A</option><option>B</option><option>C</option></select>
        <select value={contactLevel} onChange={(event) => setContactLevel(event.target.value as typeof contactLevel)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option>All</option><option>Dedicated team</option><option>Direct business</option><option>Pro or sales team</option><option>Network managed</option></select>
      </div>
    </div>
    <div className="divide-y divide-slate-100">
      {filtered.map((target) => {
        const savedStatus = statuses.get(target.company.toLowerCase());
        return <article key={target.rank} className="grid gap-3 p-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">{target.rank}</span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{target.company}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${target.priority === "A" ? "bg-emerald-100 text-emerald-800" : target.priority === "B" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>Priority {target.priority}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{target.contactLevel}</span>{savedStatus ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{savedStatus}</span> : null}</div><p className="mt-0.5 text-xs text-slate-500">{target.category}</p><p className="mt-1 text-xs"><strong>Ask for:</strong> {target.askFor}</p><p className="mt-1 text-xs leading-5 text-slate-600"><strong>Call route:</strong> {target.callRoute}</p></div>
          <div className="flex gap-2 sm:justify-end"><a href={target.phoneHref} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white sm:flex-none"><Phone className="h-4 w-4" />{target.phone}</a><a href={target.programUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${target.company} affiliate page`} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700"><ExternalLink className="h-4 w-4" /></a></div>
        </article>;
      })}
    </div>
    <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">Only public business numbers are shown. “Network managed” means the company does not publish a direct affiliate extension, so the row states that clearly instead of pretending the number reaches a specific representative.</p>
  </section>;
}
