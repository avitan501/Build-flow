"use client"

import Link from "next/link"
import { CheckCircle2, Save } from "lucide-react"
import { useState, useTransition, type FormEvent } from "react"

import { quickAddOutreachLeadAction, type QuickLeadInput } from "@/app/admin/ai-tools/quick-add-lead/actions"

const EMPTY_LEAD: QuickLeadInput = { fullName: "", companyName: "", phone: "", email: "", source: "", status: "new", followUpDate: "", note: "", rawText: "" }
const inputClass = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"

export function MobileQuickAddLead() {
  const [lead, setLead] = useState(EMPTY_LEAD)
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string; duplicateId?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function change<K extends keyof QuickLeadInput>(key: K, value: QuickLeadInput[K]) {
    setLead((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(null)
    startTransition(async () => {
      const response = await quickAddOutreachLeadAction(lead)
      if (!response.ok) {
        setResult({ kind: "error", message: response.error, duplicateId: response.duplicateId })
        return
      }
      setLead(EMPTY_LEAD)
      setResult({ kind: "success", message: "Lead saved. It is now available in the existing lead directory." })
    })
  }

  return <form onSubmit={submit} className="mx-auto grid w-full max-w-xl gap-4 pb-28" aria-label="Quick add lead">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Name<input autoComplete="name" required value={lead.fullName} onChange={(event) => change("fullName", event.target.value)} className={inputClass} /></label>
        <label className="grid gap-1.5 text-sm font-bold">Company <span className="font-normal text-slate-400">optional</span><input autoComplete="organization" value={lead.companyName} onChange={(event) => change("companyName", event.target.value)} className={inputClass} /></label>
        <label className="grid gap-1.5 text-sm font-bold">Source <span className="font-normal text-slate-400">optional</span><input list="lead-source-options" value={lead.source} onChange={(event) => change("source", event.target.value)} placeholder="Referral, jobsite…" className={inputClass} /><datalist id="lead-source-options"><option value="Referral" /><option value="Phone call" /><option value="Text / WhatsApp" /><option value="Email" /><option value="Website" /><option value="Jobsite" /></datalist></label>
        <label className="grid gap-1.5 text-sm font-bold">Phone<input type="tel" inputMode="tel" autoComplete="tel" value={lead.phone} onChange={(event) => change("phone", event.target.value)} className={inputClass} /></label>
        <label className="grid gap-1.5 text-sm font-bold">Email<input type="email" inputMode="email" autoComplete="email" value={lead.email} onChange={(event) => change("email", event.target.value)} className={inputClass} /></label>
        <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Enter a phone number or email. The existing lead directory is checked before anything is saved.</p>
        <label className="grid gap-1.5 text-sm font-bold">Status<select value={lead.status} onChange={(event) => change("status", event.target.value)} className={inputClass}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="not_interested">Not interested</option></select></label>
        <label className="grid gap-1.5 text-sm font-bold">Follow-up <span className="font-normal text-slate-400">optional</span><input type="date" value={lead.followUpDate} onChange={(event) => change("followUpDate", event.target.value)} className={inputClass} /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Short note <span className="font-normal text-slate-400">optional</span><textarea rows={2} maxLength={500} value={lead.note} onChange={(event) => change("note", event.target.value)} placeholder="What they need or the next action" className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-base leading-6 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Paste raw text <span className="font-normal text-slate-400">optional</span><textarea rows={4} maxLength={700} value={lead.rawText} onChange={(event) => change("rawText", event.target.value)} placeholder="Paste the original text, business card text, or call notes" className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-base leading-6 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
      </div>
    </section>

    {result ? <div role={result.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm font-semibold ${result.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{result.kind === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}{result.message}{result.duplicateId ? <Link href="/admin/users?view=leads" className="ml-2 underline">Open leads</Link> : null}</div> : null}

    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-12px_35px_rgba(15,23,42,.12)] backdrop-blur sm:static sm:rounded-xl sm:border sm:p-3 sm:shadow-sm">
      <button type="submit" disabled={pending || !lead.fullName.trim() || (!lead.phone.trim() && !lead.email.trim())} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-5 w-5" />{pending ? "Checking and saving…" : "Check duplicate & save lead"}</button>
    </div>
  </form>
}
