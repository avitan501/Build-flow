"use client";

import Link from "next/link";
import { useState } from "react";
import capabilities from "@/data/business-blueprint.json";
import { saveBlueprintNote } from "@/app/admin/build-map/blueprint-actions";

type Saved = { task_key: string; progress_percent: number; summary: string };
const statuses = [{value:0,label:"Not started"},{value:50,label:"50%"},{value:100,label:"Done"}];

function Capability({entry, saved, onSaved}: {entry: typeof capabilities[number]; saved?: Saved; onSaved: (row: Saved) => void}) {
  const [note,setNote]=useState(saved?.summary ?? "");
  const [progress,setProgress]=useState(saved?.progress_percent ?? 50);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState("");
  return <details className="rounded-lg border border-slate-200 bg-white">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-semibold">
      <span>{entry.title}</span><span className="shrink-0 text-xs text-slate-600">{statuses.find(s=>s.value===(saved?.progress_percent ?? 50))?.label}</span>
    </summary>
    <div className="space-y-3 border-t border-slate-100 p-3">
      <p className="text-xs leading-5 text-slate-600">{saved ? "Owner-reviewed status." : "Implementation exists. End-to-end verification is pending."}</p>
      <label className="block text-xs font-semibold">Status<select value={progress} onChange={e=>setProgress(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded border border-slate-300 px-2">{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      <label className="block text-xs font-semibold">Private notes<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="min-h-11 rounded bg-[#0066cc] px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={async()=>{setPending(true);setMessage("");try{const result=await saveBlueprintNote({id:entry.id,progress,note});if(result.ok){onSaved({task_key:`blueprint-${entry.id}`,progress_percent:progress,summary:note});setMessage("Saved");}else setMessage(result.error ?? "Could not save.");}catch{setMessage("Could not save. Your note is still here; please retry.");}finally{setPending(false);}}}>{pending ? "Saving…" : "Save"}</button>
        {entry.href ? <Link href={entry.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0066cc]">Open capability</Link> : null}
      </div>
      <p role="status" className="text-xs text-slate-700">{message}</p>
      <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">Evidence</summary><code className="block break-all">{entry.source}</code></details>
    </div>
  </details>;
}

export function BusinessBlueprint({ savedRows }: {savedRows: Saved[]}) {
  const [saved,setSaved]=useState(Object.fromEntries(savedRows.map(r=>[r.task_key,r])));
  const [query,setQuery]=useState("");const [status,setStatus]=useState("all");const [group,setGroup]=useState("all");
  const shown=capabilities.filter(e=>(group==="all"||e.group===group)&&(status==="all"||(saved[`blueprint-${e.id}`]?.progress_percent ?? 50)===Number(status))&&`${e.title} ${e.group} ${saved[`blueprint-${e.id}`]?.summary ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const progress=Math.round(capabilities.reduce((sum,e)=>sum+(saved[`blueprint-${e.id}`]?.progress_percent ?? 50),0)/capabilities.length);
  return <main className="mx-auto max-w-5xl px-3 py-5 text-slate-950 sm:px-6">
    <Link href="/admin/build-map" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0066cc]">← Dashboard</Link>
    <h1 className="text-2xl font-semibold">Business Blueprint</h1>
    <p className="mt-2 text-xs leading-5 text-slate-600">Owner only · {capabilities.length} capabilities. Initial 50% means implementation exists and verification is pending. Notes stay private.</p>
    <label className="mt-4 block text-xs font-semibold">Overall progress · {progress}%<progress value={progress} max={100} className="mt-1 h-2 w-full accent-[#0066cc]" /></label>
    <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <label className="col-span-2 text-xs font-semibold sm:col-span-1">Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search capabilities or notes" className="mt-1 min-h-11 w-full rounded border border-slate-300 px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-300 px-2"><option value="all">All statuses</option>{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      <label className="text-xs font-semibold">Area<select value={group} onChange={e=>setGroup(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-300 px-2"><option value="all">All areas</option>{[...new Set(capabilities.map(e=>e.group))].map(g=><option key={g}>{g}</option>)}</select></label>
    </div>
    <p className="mb-2 text-xs text-slate-600" role="status">{shown.length} capabilities</p>
    <div className="grid items-start gap-2 sm:grid-cols-2">{shown.map(entry=><Capability key={entry.id} entry={entry} saved={saved[`blueprint-${entry.id}`]} onSaved={row=>setSaved(s=>({...s,[row.task_key]:row}))} />)}</div>
  </main>;
}
