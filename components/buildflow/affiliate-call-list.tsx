"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Mail, MessageSquareText, Phone, Search } from "lucide-react";

import { TOP_AFFILIATE_CALL_TARGETS } from "@/lib/affiliate-call-list";
import type { AffiliateActivity, AffiliateProgram } from "@/lib/affiliate-tracker";

function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function AffiliateCallList({ programs = [], activities = [] }: { programs?: AffiliateProgram[]; activities?: AffiliateActivity[] }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"All" | "A" | "B" | "C">("All");
  const [contactLevel, setContactLevel] = useState<"All" | "Dedicated team" | "Direct business" | "Pro or sales team" | "Network managed">("All");
  const programsByName = useMemo(() => new Map(programs.map((program) => [program.supplier_name.toLowerCase(), program])), [programs]);
  const activitiesByProgram = useMemo(() => {
    const grouped = new Map<string, AffiliateActivity[]>();
    for (const activity of activities) grouped.set(activity.program_id, [...(grouped.get(activity.program_id) ?? []), activity]);
    return grouped;
  }, [activities]);
  const filtered = TOP_AFFILIATE_CALL_TARGETS.filter((target) => {
    const search = query.trim().toLowerCase();
    return (priority === "All" || target.priority === priority)
      && (contactLevel === "All" || target.contactLevel === contactLevel)
      && (!search || `${target.company} ${target.category} ${target.phone} ${target.askFor} ${target.callRoute}`.toLowerCase().includes(search));
  });

  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Carlos call list</p><h3 className="mt-1 text-lg font-semibold">Top 10 supplier priorities</h3><p className="mt-1 text-sm text-slate-600">One focused list with the current status, the right department, and the next move.</p></div>
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
        const program = programsByName.get((target.trackerName ?? target.company).toLowerCase());
        const savedStatus = program?.affiliate_status;
        const programActivities = program ? activitiesByProgram.get(program.id) ?? [] : [];
        const ContactIcon = target.contactType === "email" ? Mail : target.contactType === "form" ? MessageSquareText : Phone;
        return <article key={target.rank} className="grid gap-3 p-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-start">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">{target.rank}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{target.company}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${target.priority === "A" ? "bg-emerald-100 text-emerald-800" : target.priority === "B" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>Priority {target.priority}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{target.contactLevel}</span>{savedStatus ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{savedStatus}</span> : null}</div>
            <p className="mt-0.5 text-xs text-slate-500">{target.category}</p>
            {program ? <div className="mt-2 rounded-md border border-slate-200 bg-slate-50/80 p-2.5">
              <div className="grid gap-x-4 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-3"><p><strong className="text-slate-800">API:</strong> {program.api_status || "No update"}</p><p><strong className="text-slate-800">Last contact:</strong> {shortDate(program.last_contact_date)}</p><p><strong className="text-slate-800">Next follow-up:</strong> {shortDate(program.next_follow_up_date)}</p></div>
              <p className="mt-1.5 text-xs leading-5 text-slate-700"><strong>Next:</strong> {program.next_action || "No next action recorded."}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500"><span>Applied {shortDate(program.application_date)}</span><span>Verified {shortDate(program.last_verified_date)}</span><span>Updated {shortDate(program.updated_at)}</span></div>
              {(program.notes || programActivities.length) ? <details className="mt-2 border-t border-slate-200 pt-2"><summary className="cursor-pointer text-[11px] font-semibold text-[#0066cc]">All updates ({programActivities.length})</summary>{program.notes ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{program.notes}</p> : null}{programActivities.length ? <div className="mt-2 divide-y divide-slate-200">{programActivities.map((activity) => <div key={activity.id} className="py-2"><p className="text-xs font-semibold text-slate-800">{activity.title}</p>{activity.details ? <p className="mt-0.5 text-xs leading-5 text-slate-600">{activity.details}</p> : null}<p className="mt-0.5 text-[10px] text-slate-400">{shortDate(activity.activity_date)}</p></div>)}</div> : null}</details> : null}
            </div> : <p className="mt-2 text-[11px] font-medium text-slate-400">No saved supplier update yet.</p>}
            <p className="mt-2 text-xs"><strong>Ask for:</strong> {target.askFor}</p><p className="mt-1 text-xs leading-5 text-slate-600"><strong>Call route:</strong> {target.callRoute}</p>
          </div>
          <div className="flex gap-2 sm:justify-end"><a href={target.contactHref ?? target.phoneHref} target={target.contactType === "form" ? "_blank" : undefined} rel={target.contactType === "form" ? "noopener noreferrer" : undefined} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white sm:flex-none"><ContactIcon className="h-4 w-4" />{target.contactLabel ?? target.phone}</a><a href={target.programUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${target.company} program page`} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700"><ExternalLink className="h-4 w-4" /></a></div>
        </article>;
      })}
    </div>
    <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">Only public business contacts are shown. “Network managed” means the retailer decides through its affiliate platform, not through a store employee.</p>
  </section>;
}
