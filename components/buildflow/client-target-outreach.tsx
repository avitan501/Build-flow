"use client";

import { Mail, PhoneCall, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  createOutreachLeadAction,
  deleteOutreachLeadAction,
  updateOutreachLeadStatusAction,
} from "@/app/admin/goals-progress/lead-actions";

export type OutreachLeadRecord = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: "new" | "contacted" | "qualified" | "not_interested";
  relationship_level: number;
};

const EMPTY_LEAD = { fullName: "", companyName: "", email: "", phone: "", notes: "", relationshipLevel: 1 };

export function AddOutreachLead() {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createOutreachLeadAction(lead);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLead(EMPTY_LEAD);
      setOpen(false);
      window.location.reload();
    });
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"><Plus className="h-4 w-4" />Add lead</button>
    {open && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[160] grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-outreach-lead-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 p-5"><div><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><UserPlus className="h-4 w-4" /></span><h2 id="add-outreach-lead-title" className="mt-3 text-xl font-semibold">Add an outreach lead</h2><p className="mt-1 text-sm text-slate-500">A lead stays separate from active clients and orders.</p></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button></header>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Name<input autoFocus value={lead.fullName} onChange={(event) => setLead((current) => ({ ...current, fullName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Phone<input type="tel" value={lead.phone} onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Email<input type="email" value={lead.email} onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Company <span className="font-normal text-slate-400">optional</span><input value={lead.companyName} onChange={(event) => setLead((current) => ({ ...current, companyName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Relationship level <span className="font-normal text-slate-400">1 = new contact, 5 = know very well</span><select value={lead.relationshipLevel} onChange={(event) => setLead((current) => ({ ...current, relationshipLevel: Number(event.target.value) }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal">{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Level {level}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Outreach notes <span className="font-normal text-slate-400">optional</span><textarea rows={3} maxLength={1000} value={lead.notes} onChange={(event) => setLead((current) => ({ ...current, notes: event.target.value }))} placeholder="What they buy, when to call, or the next step" className="rounded-md border border-slate-300 p-3 font-normal" /></label>
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={submit} disabled={pending || lead.fullName.trim().length < 2 || (!lead.phone.trim() && !lead.email.trim())} className="min-h-11 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Adding..." : "Add lead"}</button></footer>
        </section>
      </div>, document.body) : null}
  </>;
}

export function OutreachLeadList({ leads }: { leads: OutreachLeadRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return <details className="group overflow-hidden rounded-md border border-slate-200 bg-white">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2"><span className="text-xs font-semibold uppercase text-slate-600">Leads outreach</span><span className="text-xs font-semibold text-slate-500">{leads.length} leads · Open</span></summary>
    {leads.length ? leads.map((lead) => <article key={lead.id} className="border-t border-slate-100 px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{lead.full_name}</p><span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#0066cc]">Level {lead.relationship_level}</span></div><p className="truncate text-xs text-slate-500">{lead.company_name || lead.email || lead.phone}</p>{lead.notes ? <p className="mt-1 text-xs leading-5 text-slate-600">{lead.notes}</p> : null}</div>
        <select aria-label={`Status for ${lead.full_name}`} defaultValue={lead.status} disabled={pending} onChange={(event) => run(() => updateOutreachLeadStatusAction({ id: lead.id, status: event.target.value }))} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="not_interested">Not interested</option></select>
        <div className="flex gap-1">{lead.phone ? <a href={`tel:${lead.phone}`} aria-label={`Call ${lead.full_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600"><PhoneCall className="h-4 w-4" /></a> : null}{lead.email ? <a href={`mailto:${lead.email}`} aria-label={`Email ${lead.full_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600"><Mail className="h-4 w-4" /></a> : null}<button type="button" disabled={pending} onClick={() => window.confirm(`Remove ${lead.full_name} from leads?`) && run(() => deleteOutreachLeadAction(lead.id))} aria-label={`Remove ${lead.full_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
      </div>
    </article>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No outreach leads yet. Add the first person Carlos should contact.</p>}
    {error ? <p className="m-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </details>;
}
