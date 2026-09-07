"use client";

import { LoaderCircle, Pencil, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  createOutreachLeadAction,
  deleteOutreachLeadAction,
  updateClientLanguageAction,
  updateOutreachLeadAction,
  updateOutreachLeadRelationshipAction,
  updateOutreachLeadStatusAction,
} from "@/app/admin/goals-progress/lead-actions";
import { ContactActions } from "@/components/buildflow/contact-actions";
import { ContactConversation, type DirectoryConversationEntry } from "@/components/buildflow/contact-conversation";
import { effectiveLeadDepartment, LEAD_DEPARTMENTS, leadDepartmentLabel, type LeadDepartment } from "@/lib/lead-discovery";

export type OutreachLeadRecord = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: "new" | "contacted" | "qualified" | "not_interested";
  relationship_level: number;
  preferred_language: "en" | "es";
  created_at?: string;
  updated_at?: string;
};

const EMPTY_LEAD = { fullName: "", companyName: "", email: "", phone: "", notes: "", relationshipLevel: 5, preferredLanguage: "en" };

export const LEAD_GROUPS = LEAD_DEPARTMENTS;

function leadGroupLabel(level: number) {
  return leadDepartmentLabel(level);
}

export function AddOutreachLead({ compact = false }: { compact?: boolean }) {
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
    <button type="button" onClick={() => setOpen(true)} aria-label="Add lead" title="Add lead" className={compact ? "inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0071e3] text-white hover:bg-[#0066cc]" : "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"}><Plus className="h-4 w-4" />{compact ? null : "Add lead"}</button>
    {open && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[160] grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-outreach-lead-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 p-5"><div><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><UserPlus className="h-4 w-4" /></span><h2 id="add-outreach-lead-title" className="mt-3 text-xl font-semibold">Add an outreach lead</h2><p className="mt-1 text-sm text-slate-500">A lead stays separate from active clients and orders.</p></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button></header>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Name<input autoFocus value={lead.fullName} onChange={(event) => setLead((current) => ({ ...current, fullName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <p className="text-xs font-medium text-slate-500 sm:col-span-2">Email or phone — enter at least one.</p>
            <label className="grid gap-1.5 text-sm font-semibold">Phone<input type="tel" value={lead.phone} onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Email<input type="email" value={lead.email} onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Company <span className="font-normal text-slate-400">optional</span><input value={lead.companyName} onChange={(event) => setLead((current) => ({ ...current, companyName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Department<select value={lead.relationshipLevel} onChange={(event) => setLead((current) => ({ ...current, relationshipLevel: Number(event.target.value) }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal">{LEAD_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Preferred language<select value={lead.preferredLanguage} onChange={(event) => setLead((current) => ({ ...current, preferredLanguage: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal"><option value="en">EN</option><option value="es">ES</option></select></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Outreach notes <span className="font-normal text-slate-400">optional</span><textarea rows={3} maxLength={1000} value={lead.notes} onChange={(event) => setLead((current) => ({ ...current, notes: event.target.value }))} placeholder="What they buy, when to call, or the next step" className="rounded-md border border-slate-300 p-3 font-normal" /></label>
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={submit} disabled={pending || lead.fullName.trim().length < 2 || (!lead.phone.trim() && !lead.email.trim())} className="min-h-11 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Adding..." : "Add lead"}</button></footer>
        </section>
      </div>, document.body) : null}
  </>;
}

export function EditOutreachLead({ lead, children }: { lead: OutreachLeadRecord; children?: ReactNode }) {
  const initialValue = () => ({ fullName: lead.full_name, companyName: lead.company_name ?? "", email: lead.email ?? "", phone: lead.phone ?? "", notes: lead.notes ?? "", relationshipLevel: effectiveLeadDepartment(lead), preferredLanguage: lead.preferred_language });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show() {
    setForm(initialValue());
    setError(null);
    setOpen(true);
  }

  function close() {
    if (!pending) setOpen(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateOutreachLeadAction({ id: lead.id, ...form });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      window.location.reload();
    });
  }

  return <>
    <button type="button" onClick={show} aria-label={`Edit ${lead.full_name}`} title="Edit lead" className={children ? "group inline-flex max-w-full items-center gap-1.5 rounded-md text-left text-base font-bold outline-none hover:text-[#0066cc] focus-visible:ring-2 focus-visible:ring-[#0071e3]" : "inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"}>{children || <Pencil className="h-4 w-4" />}{children ? <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" /> : null}</button>
    {open && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[165] grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`edit-lead-${lead.id}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="my-auto w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 p-5"><div><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><Pencil className="h-4 w-4" /></span><h2 id={`edit-lead-${lead.id}`} className="mt-3 text-xl font-semibold">Edit outreach lead</h2><p className="mt-1 text-sm text-slate-500">Update this lead&apos;s contact and outreach details.</p></div><button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button></header>
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Name<input autoFocus value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <p className="text-xs font-medium text-slate-500 sm:col-span-2">Email or phone — enter at least one.</p>
            <label className="grid gap-1.5 text-sm font-semibold">Phone<input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Company <span className="font-normal text-slate-400">optional</span><input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Department<select value={form.relationshipLevel} onChange={(event) => setForm((current) => ({ ...current, relationshipLevel: Number(event.target.value) as LeadDepartment }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal">{LEAD_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold">Preferred language<select value={form.preferredLanguage} onChange={(event) => setForm((current) => ({ ...current, preferredLanguage: event.target.value as "en" | "es" }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal"><option value="en">EN</option><option value="es">ES</option></select></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Outreach notes <span className="font-normal text-slate-400">optional</span><textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-md border border-slate-300 p-3 font-normal" /></label>
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={submit} disabled={pending || form.fullName.trim().length < 2 || (!form.phone.trim() && !form.email.trim())} className="min-h-11 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Saving..." : "Save lead"}</button></footer>
        </section>
      </div>, document.body) : null}
  </>;
}

function LeadGenerationBar({ department }: { department: 1 | 2 | 3 }) {
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    if (!/^\d{5}$/.test(zipCode)) {
      setNotice("Enter a five-digit ZIP code.");
      return;
    }
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, zipCode }),
      });
      const payload = await response.json() as { ok?: boolean; added?: number; error?: string };
      if (!response.ok || !payload.ok) {
        setNotice(payload.error || "Lead search is temporarily unavailable.");
        return;
      }
      const added = payload.added ?? 0;
      setNotice(added ? `${added} new leads added.` : "No new verified business contacts were found.");
      router.refresh();
    } catch {
      setNotice("Lead search is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return <section className="mt-2 rounded-md border border-slate-200 bg-white p-2" aria-label={`Generate ${leadDepartmentLabel(department)} leads`}>
    <div className="grid gap-2 sm:grid-cols-[8rem_auto_minmax(0,1fr)] sm:items-center">
      <label className="relative"><span className="sr-only">ZIP code</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, "").slice(0, 5))} onKeyDown={(event) => { if (event.key === "Enter") void generate(); }} inputMode="numeric" autoComplete="postal-code" placeholder="ZIP code" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-sm font-semibold outline-none focus:border-[#0071e3]" /></label>
      <button type="button" onClick={() => void generate()} disabled={pending || zipCode.length !== 5} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{pending ? "Finding leads…" : "Generate 50 leads"}</button>
      <p className={`truncate text-[10px] font-semibold ${notice?.includes("unavailable") || notice?.startsWith("Enter") ? "text-rose-700" : "text-slate-500"}`}>{notice || "Public business contacts only. Nothing is contacted automatically."}</p>
    </div>
  </section>;
}

export function LeadDepartmentDirectory({ leads, conversations, senderName, activeDepartment }: { leads: OutreachLeadRecord[]; conversations: Record<string, DirectoryConversationEntry[]>; senderName: string; activeDepartment: LeadDepartment }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counts = Object.fromEntries(LEAD_DEPARTMENTS.map((department) => [department.value, leads.filter((lead) => effectiveLeadDepartment(lead) === department.value).length]));
  const visibleLeads = leads.filter((lead) => effectiveLeadDepartment(lead) === activeDepartment);

  function selectDepartment(department: LeadDepartment) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "leads");
    params.set("department", String(department));
    router.push(`/admin/users?${params.toString()}`);
  }

  return <section aria-label="Lead departments">
    <nav className="flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Lead departments">
      {LEAD_DEPARTMENTS.map((department) => <button key={department.value} type="button" onClick={() => selectDepartment(department.value)} aria-pressed={activeDepartment === department.value} className={`inline-flex h-9 min-w-max flex-1 items-center justify-center gap-1.5 rounded px-2.5 text-[11px] font-bold transition ${activeDepartment === department.value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><span>{department.label}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] ${activeDepartment === department.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[department.value] || 0}</span></button>)}
    </nav>
    {activeDepartment <= 3 ? <LeadGenerationBar department={activeDepartment as 1 | 2 | 3} /> : null}
    <div className="mt-2"><OutreachLeadDirectory leads={visibleLeads} conversations={conversations} senderName={senderName} /></div>
  </section>;
}

export function OutreachLeadDirectory({ leads, conversations, senderName }: { leads: OutreachLeadRecord[]; conversations: Record<string, DirectoryConversationEntry[]>; senderName: string }) {
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

  if (!leads.length) return <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">No leads in this department.</p>;

  return <section className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Leads">
    {leads.map((lead) => <article key={lead.id} className="min-w-0 px-2.5 py-2">
      <div className="grid min-w-0 gap-2 sm:flex sm:items-center">
        <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1.5"><EditOutreachLead lead={lead}>{lead.full_name}</EditOutreachLead>{lead.company_name && lead.company_name !== lead.full_name ? <span className="hidden truncate text-[11px] text-slate-400 sm:inline">· {lead.company_name}</span> : null}</div><p className="truncate text-[10px] text-slate-500">{[lead.phone, lead.email].filter(Boolean).join(" · ") || "Contact details needed"}</p></div>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:shrink-0"><select aria-label={`Department for ${lead.full_name}`} value={effectiveLeadDepartment(lead)} disabled={pending} onChange={(event) => run(() => updateOutreachLeadRelationshipAction({ id: lead.id, relationshipLevel: Number(event.target.value) }))} className="h-8 min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold sm:w-[7.75rem] sm:flex-none">{LEAD_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select><select aria-label={`Status for ${lead.full_name}`} defaultValue={lead.status} disabled={pending} onChange={(event) => run(() => updateOutreachLeadStatusAction({ id: lead.id, status: event.target.value }))} className="hidden h-8 w-[6.75rem] rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold sm:block"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="not_interested">Not interested</option></select><ContactActions name={lead.full_name} phone={lead.phone} email={lead.email} senderName={senderName} showWelcomePackageButton /><button type="button" disabled={pending} onClick={() => window.confirm(`Remove ${lead.full_name} from leads?`) && run(() => deleteOutreachLeadAction(lead.id))} aria-label={`Remove ${lead.full_name}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
      </div>
      <details className="mt-1.5 border-t border-slate-100 pt-1.5"><summary className="cursor-pointer text-[10px] font-bold text-[#0066cc]">Details &amp; history</summary><div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.8fr)]">{lead.notes ? <p className="rounded bg-slate-50 px-2.5 py-2 text-[11px] leading-5 text-slate-600">{lead.notes}</p> : <p className="text-[11px] text-slate-400">No notes.</p>}<div><div className="mb-2 flex items-center gap-2 sm:hidden"><select aria-label={`Mobile status for ${lead.full_name}`} defaultValue={lead.status} disabled={pending} onChange={(event) => run(() => updateOutreachLeadStatusAction({ id: lead.id, status: event.target.value }))} className="h-8 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="not_interested">Not interested</option></select><select aria-label={`Language for ${lead.full_name}`} defaultValue={lead.preferred_language} disabled={pending} onChange={(event) => run(() => updateClientLanguageAction({ id: lead.id, target: "lead", language: event.target.value }))} className="h-8 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold"><option value="en">EN</option><option value="es">ES</option></select></div><ContactConversation entries={conversations[lead.id] ?? []} historyHref={`/admin/communications?channel=all&q=${encodeURIComponent(lead.phone || lead.email || lead.full_name)}${lead.phone || lead.email ? `&thread=${encodeURIComponent(lead.phone || lead.email || "")}` : ""}`} /></div></div></details>
    </article>)}
    {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </section>;
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
    {leads.length ? leads.map((lead) => <article key={lead.id} className="min-w-0 border-t border-slate-100 px-3 py-3">
      <div className="grid min-w-0 gap-2">
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{lead.full_name}</p><span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#0066cc]">{leadGroupLabel(effectiveLeadDepartment(lead))}</span></div><p className="truncate text-xs text-slate-500">{lead.company_name || lead.email || lead.phone}</p>{lead.notes ? <p className="mt-1 text-xs leading-5 text-slate-600">{lead.notes}</p> : null}</div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <select aria-label={`Group for ${lead.full_name}`} defaultValue={lead.relationship_level} disabled={pending} onChange={(event) => run(() => updateOutreachLeadRelationshipAction({ id: lead.id, relationshipLevel: Number(event.target.value) }))} className="h-9 w-[8.5rem] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold">{LEAD_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}</select>
          <select aria-label={`Language for ${lead.full_name}`} defaultValue={lead.preferred_language} disabled={pending} onChange={(event) => run(() => updateClientLanguageAction({ id: lead.id, target: "lead", language: event.target.value }))} className="h-9 w-16 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold"><option value="en">EN</option><option value="es">ES</option></select>
          <select aria-label={`Status for ${lead.full_name}`} defaultValue={lead.status} disabled={pending} onChange={(event) => run(() => updateOutreachLeadStatusAction({ id: lead.id, status: event.target.value }))} className="h-9 w-[8.5rem] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="not_interested">Not interested</option></select>
          <EditOutreachLead lead={lead} /><ContactActions name={lead.full_name} phone={lead.phone} email={lead.email} showWelcomePackageButton /><button type="button" disabled={pending} onClick={() => window.confirm(`Remove ${lead.full_name} from leads?`) && run(() => deleteOutreachLeadAction(lead.id))} aria-label={`Remove ${lead.full_name}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No outreach leads yet. Add the first person Carlos should contact.</p>}
    {error ? <p className="m-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
  </details>;
}

export function ClientLanguageSelect({ id, name, language }: { id: string; name: string; language: "en" | "es" }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return <div className="grid justify-items-end gap-1"><select aria-label={`Language for ${name}`} defaultValue={language} disabled={pending} onChange={(event) => startTransition(async () => { setError(null); const result = await updateClientLanguageAction({ id, target: "client", language: event.target.value }); if (!result.ok) setError(result.error); })} className="h-9 w-16 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold"><option value="en">EN</option><option value="es">ES</option></select>{error ? <span className="text-right text-[10px] font-semibold text-rose-600">{error}</span> : null}</div>;
}
