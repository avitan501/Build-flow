"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Check, ChevronRight, FileUp, Search, ShieldCheck, X } from "lucide-react";

import {
  addAffiliateActivityAction,
  changeAffiliateStatusAction,
  confirmAffiliateUploadAction,
  createAffiliateUploadAction,
  saveAffiliateReadinessAction,
  toggleAffiliateChecklistAction,
  updateAffiliateProgramAction,
} from "@/app/admin/goals-progress/affiliate-actions";
import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_STATUSES,
  RETAILER_PRICE_DISCLAIMER,
  STATUS_STYLES,
  type AffiliateActivity,
  type AffiliateAttachment,
  type AffiliateChecklistItem,
  type AffiliateIntegration,
  type AffiliateProgram,
  type AffiliateStatus,
  type AffiliateTrackerSettings,
} from "@/lib/affiliate-tracker";
import { createClient } from "@/lib/supabase/client";

type Props = {
  programs: AffiliateProgram[];
  checklist: AffiliateChecklistItem[];
  activities: AffiliateActivity[];
  attachments: AffiliateAttachment[];
  integrations: AffiliateIntegration[];
  settings: AffiliateTrackerSettings;
};

const dateText = (value: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString() : "—";
const programSort = (priority: string) => priority === "A" ? 1 : priority === "B" ? 2 : 3;

function StatusBadge({ status }: { status: AffiliateStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>{status}</span>;
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return <div className={`min-w-0 border-l-2 px-3 py-1 ${accent ? "border-[#0071e3]" : "border-slate-200"}`}><p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p><p className="mt-0.5 truncate text-xl font-semibold tabular-nums">{value}</p></div>;
}

export function AffiliateProgramTracker({ programs, checklist, activities, attachments, integrations, settings }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [network, setNetwork] = useState("All");
  const [sort, setSort] = useState("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"programs" | "readiness">("programs");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = programs.find((item) => item.id === selectedId) ?? null;

  const networks = useMemo(() => [...new Set(programs.map((item) => item.affiliate_network))].sort(), [programs]);
  const filtered = useMemo(() => programs.filter((item) => {
    const search = query.trim().toLowerCase();
    return (!search || item.supplier_name.toLowerCase().includes(search))
      && (status === "All" || item.affiliate_status === status)
      && (priority === "All" || item.priority === priority)
      && (network === "All" || item.affiliate_network === network);
  }).sort((a, b) => {
    if (sort === "status") return a.affiliate_status.localeCompare(b.affiliate_status);
    if (sort === "commission") return (b.commission_max ?? -1) - (a.commission_max ?? -1);
    if (sort === "cookie") return (b.cookie_days ?? -1) - (a.cookie_days ?? -1);
    if (sort === "ease") return b.application_difficulty - a.application_difficulty;
    if (sort === "fit") return b.avantia_fit - a.avantia_fit;
    if (sort === "followup") return (a.next_follow_up_date ?? "9999").localeCompare(b.next_follow_up_date ?? "9999");
    if (sort === "updated") return b.updated_at.localeCompare(a.updated_at);
    return programSort(a.priority) - programSort(b.priority) || a.supplier_name.localeCompare(b.supplier_name);
  }), [programs, query, status, priority, network, sort]);

  const count = (name: AffiliateStatus) => programs.filter((item) => item.affiliate_status === name).length;
  const knownCommission = programs.filter((item) => item.commission_min !== null || item.commission_max !== null);
  const minCommission = knownCommission.length ? Math.min(...knownCommission.map((item) => item.commission_min ?? item.commission_max ?? 0)) : 0;
  const maxCommission = knownCommission.length ? Math.max(...knownCommission.map((item) => item.commission_max ?? item.commission_min ?? 0)) : 0;
  const nyCount = programs.filter((item) => /new york/i.test(item.new_york_access)).length;
  const integration = integrations[0];

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setMessage("");
    startTransition(async () => {
      const result = await operation();
      setMessage(result.ok ? success : result.error || "The update failed.");
    });
  };

  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="affiliate-goal-title">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
      <div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Carlos · Supplier program</p><h2 id="affiliate-goal-title" className="mt-1 text-xl font-semibold">Supplier Affiliate Program</h2><p className="mt-1 text-sm text-slate-600">Track applications, approvals, setup, and compliance in one owner-only workspace.</p></div>
      <div className="inline-flex rounded-md border border-slate-200 p-1 text-xs font-semibold"><button onClick={() => setPanel("programs")} className={`min-h-9 rounded px-3 ${panel === "programs" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Programs</button><button onClick={() => setPanel("readiness")} className={`min-h-9 rounded px-3 ${panel === "readiness" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Application readiness</button></div>
    </div>

    {panel === "readiness" ? <ReadinessPanel settings={settings} run={run} pending={isPending} /> : <>
      <div className="grid grid-cols-2 gap-y-4 border-b border-slate-200 p-4 sm:grid-cols-5 lg:grid-cols-10">
        <SummaryCard label="Total" value={programs.length} accent /><SummaryCard label="Not applied" value={count("Not Applied")} /><SummaryCard label="Applied" value={count("Applied")} /><SummaryCard label="In progress" value={count("In Progress")} /><SummaryCard label="Approved" value={count("Approved")} /><SummaryCard label="Set up" value={count("Set Up")} /><SummaryCard label="Rejected / paused" value={count("Rejected") + count("Paused")} /><SummaryCard label="Commission" value={`${minCommission}–${maxCommission}%`} /><SummaryCard label="New York" value={nyCount} /><SummaryCard label="Priority A" value={programs.filter((item) => item.priority === "A").length} />
      </div>

      {integration ? <div className="m-4 grid gap-3 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
        <div><div className="flex flex-wrap items-center gap-2"><strong>Lowe’s Developer/API Onboarding</strong><span className="rounded-full border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{integration.status}</span></div><p className="mt-1 text-slate-700">Submitted {dateText(integration.submitted_at)} · {integration.current_stage}. Waiting for Lowe’s review and Business Owner assignment.</p></div><p className="self-center text-xs font-semibold text-amber-900">Separate from affiliate application</p>
      </div> : null}

      <div className="grid gap-2 border-y border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(13rem,1fr)_repeat(4,minmax(8rem,auto))]">
        <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option>All</option>{AFFILIATE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option>All</option><option>A</option><option>B</option><option>C</option></select>
        <select value={network} onChange={(event) => setNetwork(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option>All</option>{networks.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="priority">Sort: priority</option><option value="status">Status</option><option value="commission">Commission</option><option value="cookie">Cookie duration</option><option value="ease">Application ease</option><option value="fit">AvantiaBuild fit</option><option value="followup">Next follow-up</option><option value="updated">Last updated</option></select>
      </div>

      <div className="divide-y divide-slate-100 sm:hidden">{filtered.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 p-3 text-left"><span className="flex h-7 w-7 items-center justify-center rounded bg-slate-950 text-xs font-bold text-white">{item.priority}</span><span className="min-w-0"><strong className="block truncate text-sm">{item.supplier_name}</strong><span className="block truncate text-xs text-slate-500">{item.category}</span></span><span className="flex items-center gap-1"><StatusBadge status={item.affiliate_status} /><ChevronRight className="h-4 w-4 text-slate-400" /></span></button>)}</div>
      <div className="hidden max-h-[38rem] overflow-auto sm:block"><table className="min-w-[3100px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase text-slate-600"><tr>{["Priority","Supplier Name","Affiliate Status","API/Developer Status","Category","New York Access","Affiliate Network","Published Commission","Cookie Window","Application Difficulty","Approval Outlook","AvantiaBuild Fit","Application URL","Application Date","Last Contact","Next Follow-Up","Approval Date","Setup Date","Assigned Owner","Next Action","Notes","Last Verified"].map((heading) => <th key={heading} className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2">{heading}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer border-b border-slate-100 hover:bg-sky-50"><td className="px-3 py-2 font-bold">{item.priority}</td><td className="sticky left-0 bg-white px-3 py-2 font-semibold">{item.supplier_name}</td><td className="px-3 py-2"><StatusBadge status={item.affiliate_status} /></td><td className="px-3 py-2">{item.api_status}</td><td className="max-w-64 px-3 py-2">{item.category}</td><td className="max-w-56 px-3 py-2">{item.new_york_access}</td><td className="px-3 py-2">{item.affiliate_network}</td><td className="px-3 py-2">{item.published_commission}</td><td className="px-3 py-2">{item.cookie_window}</td><td className="px-3 py-2">{item.application_difficulty}/5</td><td className="px-3 py-2">{item.approval_outlook}</td><td className="px-3 py-2">{item.avantia_fit}/5</td><td className="px-3 py-2 text-[#0066cc]">Open program</td><td className="px-3 py-2">{dateText(item.application_date)}</td><td className="px-3 py-2">{dateText(item.last_contact_date)}</td><td className="px-3 py-2">{dateText(item.next_follow_up_date)}</td><td className="px-3 py-2">{dateText(item.approval_date)}</td><td className="px-3 py-2">{dateText(item.setup_date)}</td><td className="px-3 py-2">{item.assigned_owner || "—"}</td><td className="max-w-64 px-3 py-2">{item.next_action}</td><td className="max-w-64 truncate px-3 py-2">{item.notes || "—"}</td><td className="px-3 py-2">{dateText(item.last_verified_date)}</td></tr>)}</tbody></table></div>
      <p className="px-4 py-2 text-xs text-slate-500">Showing {filtered.length} of {programs.length}. Swipe the desktop chart horizontally; tap any row for the complete record.</p>
    </>}
    {message ? <div className={`border-t px-4 py-3 text-sm font-semibold ${/failed|could not|required|complete every|invalid/i.test(message) ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</div> : null}
    {selected ? <ProgramDrawer program={selected} checklist={checklist.filter((item) => item.program_id === selected.id)} activities={activities.filter((item) => item.program_id === selected.id)} attachments={attachments.filter((item) => item.program_id === selected.id)} close={() => setSelectedId(null)} run={run} pending={isPending} /> : null}
  </section>;
}

function ReadinessPanel({ settings, run, pending }: { settings: AffiliateTrackerSettings; run: (op: () => Promise<{ ok: boolean; error?: string }>, success: string) => void; pending: boolean }) {
  const [readiness, setReadiness] = useState(settings.readiness);
  const [description, setDescription] = useState(settings.application_description);
  const [audience, setAudience] = useState(settings.audience_description);
  const [promotion, setPromotion] = useState(settings.promotion_description);
  const done = Object.values(readiness).filter(Boolean).length;
  return <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div><div className="flex items-center justify-between"><h3 className="font-semibold">Global readiness checklist</h3><span className="text-sm font-semibold tabular-nums">{done}/{Object.keys(readiness).length}</span></div><div className="mt-3 grid gap-1">{Object.entries(readiness).map(([label, checked]) => <label key={label} className="flex min-h-9 items-center gap-2 border-b border-slate-100 text-sm"><input type="checkbox" checked={checked} onChange={(event) => setReadiness((current) => ({ ...current, [label]: event.target.checked }))} className="h-4 w-4" />{label}</label>)}</div></div>
    <div><h3 className="font-semibold">Reusable application copy</h3><label className="mt-3 block text-xs font-semibold">Business description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label><label className="mt-3 block text-xs font-semibold">Audience<textarea value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label><label className="mt-3 block text-xs font-semibold">Promotion methods<textarea value={promotion} onChange={(event) => setPromotion(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label><button disabled={pending} onClick={() => run(() => saveAffiliateReadinessAction({ readiness, applicationDescription: description, audienceDescription: audience, promotionDescription: promotion }), "Application readiness saved.")} className="mt-3 min-h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Save readiness</button><div className="mt-5 space-y-2 border-l-2 border-[#0071e3] pl-3 text-xs leading-5 text-slate-600"><p><strong className="text-slate-900">Disclosure:</strong> {AFFILIATE_DISCLOSURE}</p><p><strong className="text-slate-900">Price notice:</strong> {RETAILER_PRICE_DISCLAIMER}</p></div></div>
  </div>;
}

function ProgramDrawer({ program, checklist, activities, attachments, close, run, pending }: { program: AffiliateProgram; checklist: AffiliateChecklistItem[]; activities: AffiliateActivity[]; attachments: AffiliateAttachment[]; close: () => void; run: (op: () => Promise<{ ok: boolean; error?: string }>, success: string) => void; pending: boolean }) {
  const [owner, setOwner] = useState(program.assigned_owner ?? "");
  const [nextAction, setNextAction] = useState(program.next_action);
  const [notes, setNotes] = useState(program.notes);
  const [requirements, setRequirements] = useState(program.application_requirements);
  const [restrictions, setRestrictions] = useState(program.program_restrictions);
  const [activityType, setActivityType] = useState<"note" | "contact" | "follow_up">("note");
  const [activity, setActivity] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [statusForm, setStatusForm] = useState<"Applied" | "Approved" | null>(null);
  const completed = checklist.filter((item) => item.completed).length;

  const changeStatus = (status: AffiliateStatus) => {
    if (status === "Applied" || status === "Approved") return setStatusForm(status);
    run(() => changeAffiliateStatusAction({ id: program.id, status }), `Status changed to ${status}.`);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const prepared = await createAffiliateUploadAction({ programId: program.id, fileName: file.name, mimeType: file.type, fileSize: file.size });
    if (!prepared.ok) return run(async () => prepared, "");
    const { error } = await createClient().storage.from("affiliate-confirmations").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false });
    if (error) return run(async () => ({ ok: false, error: "Could not upload the confirmation file." }), "");
    run(() => confirmAffiliateUploadAction({ programId: program.id, fileName: file.name, filePath: prepared.path, mimeType: file.type, fileSize: file.size }), "Confirmation uploaded.");
  };

  return <div className="fixed inset-0 z-50 bg-slate-950/45" role="dialog" aria-modal="true"><div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-white shadow-2xl">
    <div className="flex items-start justify-between border-b border-slate-200 p-4"><div><div className="flex flex-wrap items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white">{program.priority}</span><h3 className="text-xl font-semibold">{program.supplier_name}</h3><StatusBadge status={program.affiliate_status} /></div><p className="mt-1 text-sm text-slate-500">{program.category}</p></div><button onClick={close} aria-label="Close supplier details" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200"><X className="h-5 w-5" /></button></div>
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap gap-2"><a href={program.application_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Start application<ArrowUpRight className="h-4 w-4" /></a><a href={program.application_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Open program<ArrowUpRight className="h-4 w-4" /></a><select value="" onChange={(event) => event.target.value && changeStatus(event.target.value as AffiliateStatus)} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold"><option value="">Change status…</option>{AFFILIATE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <p className="mt-2 text-xs text-slate-500">Start application opens the official program in a new tab. AvantiaBuild never submits it automatically.</p>

      {statusForm ? <StatusForm program={program} status={statusForm} close={() => setStatusForm(null)} run={run} /> : null}
      <div className="mt-5 grid gap-3 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-3"><div><span className="text-xs text-slate-500">Network</span><strong className="block">{program.affiliate_network}</strong></div><div><span className="text-xs text-slate-500">Published commission</span><strong className="block">{program.published_commission}</strong></div><div><span className="text-xs text-slate-500">Cookie</span><strong className="block">{program.cookie_window}</strong></div><div><span className="text-xs text-slate-500">New York access</span><strong className="block">{program.new_york_access}</strong></div><div><span className="text-xs text-slate-500">Application ease</span><strong className="block">{program.application_difficulty}/5</strong></div><div><span className="text-xs text-slate-500">Fit</span><strong className="block">{program.avantia_fit}/5</strong></div></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Assigned owner<input value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Next action<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Application requirements<textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Program restrictions<textarea value={restrictions} onChange={(event) => setRestrictions(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label><label className="text-xs font-semibold sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" /></label></div>
      <button disabled={pending} onClick={() => run(() => updateAffiliateProgramAction({ id: program.id, assignedOwner: owner, nextAction, notes, requirements, restrictions }), "Supplier details saved.")} className="mt-3 min-h-10 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">Save details</button>

      <div className="mt-6 border-t border-slate-200 pt-5"><div className="flex items-center justify-between"><h4 className="font-semibold">Setup checklist</h4><span className="text-sm font-semibold">{completed}/{checklist.length}</span></div><div className="mt-2 grid gap-1 sm:grid-cols-2">{checklist.map((item) => <label key={item.id} className="flex min-h-9 items-center gap-2 border-b border-slate-100 text-xs"><input type="checkbox" checked={item.completed} onChange={(event) => run(() => toggleAffiliateChecklistAction({ id: item.id, completed: event.target.checked }), "Checklist updated.")} />{item.label}</label>)}</div>{completed !== checklist.length ? <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-700"><ShieldCheck className="h-4 w-4" />Set Up remains locked until all items are complete.</p> : <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" />Ready to mark Set Up.</p>}</div>

      <div className="mt-6 border-t border-slate-200 pt-5"><h4 className="font-semibold">Notes, contact, and follow-up</h4><div className="mt-2 grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_9rem]"><select value={activityType} onChange={(event) => setActivityType(event.target.value as typeof activityType)} className="h-10 rounded-md border border-slate-300 px-2 text-sm"><option value="note">Add note</option><option value="contact">Add contact</option><option value="follow_up">Follow-up</option></select><input value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="What happened?" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />{activityType === "follow_up" ? <input type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="h-10 rounded-md border border-slate-300 px-2 text-sm" /> : <button disabled={pending} onClick={() => run(() => addAffiliateActivityAction({ id: program.id, type: activityType, details: activity }), "Activity saved.")} className="h-10 rounded-md border border-slate-300 text-sm font-semibold">Save</button>}</div>{activityType === "follow_up" ? <button disabled={pending} onClick={() => run(() => addAffiliateActivityAction({ id: program.id, type: activityType, details: activity, followUpDate: followUp }), "Follow-up scheduled.")} className="mt-2 h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold">Schedule</button> : null}<div className="mt-3 max-h-44 overflow-y-auto divide-y divide-slate-100">{activities.map((item) => <div key={item.id} className="py-2 text-xs"><div className="flex justify-between gap-3"><strong>{item.title}</strong><span className="text-slate-400">{new Date(item.activity_date).toLocaleString()}</span></div>{item.details ? <p className="mt-1 text-slate-600">{item.details}</p> : null}</div>)}</div></div>

      <div className="mt-6 border-t border-slate-200 pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">Confirmation files</h4><p className="text-xs text-slate-500">PDF, PNG, JPG, or WebP. Maximum 10 MB.</p></div><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold"><FileUp className="h-4 w-4" />Upload confirmation<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} /></label></div><div className="mt-2 grid gap-2">{attachments.map((item) => <a key={item.id} href={item.signed_url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"><span className="truncate">{item.file_name}</span><ArrowUpRight className="h-4 w-4" /></a>)}</div></div>
    </div>
  </div></div>;
}

function StatusForm({ program, status, close, run }: { program: AffiliateProgram; status: "Applied" | "Approved"; close: () => void; run: (op: () => Promise<{ ok: boolean; error?: string }>, success: string) => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); const [email, setEmail] = useState(""); const [confirmation, setConfirmation] = useState(false); const [followUp, setFollowUp] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [commission, setCommission] = useState(program.approved_commission ?? ""); const [cookie, setCookie] = useState(program.cookie_window); const [methods, setMethods] = useState(""); const [network, setNetwork] = useState(program.affiliate_network); const [tracking, setTracking] = useState("");
  const [permissions, setPermissions] = useState({ feeds: false, links: false, api: false, images: false });
  return <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3"><div className="flex justify-between"><h4 className="font-semibold">Mark {status}</h4><button onClick={close}><X className="h-4 w-4" /></button></div>{status === "Applied" ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">Application date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Email used<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Suggested follow-up<input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="flex items-end gap-2 pb-3 text-xs font-semibold"><input type="checkbox" checked={confirmation} onChange={(e) => setConfirmation(e.target.checked)} />Submission confirmation received</label></div> : <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">Approval date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Approved commission<input value={commission} onChange={(e) => setCommission(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Cookie window<input value={cookie} onChange={(e) => setCookie(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Affiliate network<input value={network} onChange={(e) => setNetwork(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Promotional methods<input value={methods} onChange={(e) => setMethods(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><label className="text-xs font-semibold">Safe tracking/publisher ID<input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Never enter a password or secret" className="mt-1 h-10 w-full rounded border border-slate-300 px-2" /></label><div className="sm:col-span-2 flex flex-wrap gap-3 text-xs">{[["feeds","Product feeds"],["links","Deep links"],["api","API"],["images","Product images"]].map(([key,label]) => <label key={key} className="flex gap-1"><input type="checkbox" checked={permissions[key as keyof typeof permissions]} onChange={(e) => setPermissions((current) => ({ ...current, [key]: e.target.checked }))} />{label} allowed</label>)}</div></div>}<button onClick={() => { run(() => changeAffiliateStatusAction(status === "Applied" ? { id: program.id, status, applicationDate: date, applicationEmail: email, confirmationReceived: confirmation, followUpDate: followUp } : { id: program.id, status, approvalDate: date, approvedCommission: commission, cookieWindow: cookie, promotionalMethods: methods, affiliateNetwork: network, safeTrackingId: tracking, productFeedsAllowed: permissions.feeds, deepLinksAllowed: permissions.links, apiAllowed: permissions.api, productImagesAllowed: permissions.images }), `Status changed to ${status}.`); close(); }} className="mt-3 min-h-10 rounded bg-[#0071e3] px-4 text-sm font-semibold text-white">Confirm {status}</button></div>;
}
