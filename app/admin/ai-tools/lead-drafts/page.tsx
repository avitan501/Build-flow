import { Check, RotateCcw, X } from "lucide-react"
import Link from "next/link"

import { cancelAuraIntakeAction, confirmAuraIntakeAction, reviewTrustedSmsIntakeAction } from "@/app/owner/aura/actions"
import { requireOwnerAccess } from "@/lib/owner-access"
import { formatSiteDateTime } from "@/lib/site-date-time"

type LeadDraft = {
  id: string
  message_text: string | null
  status: string
  created_at: string
  proposal: {
    recordType?: string
    summary?: string
    contact?: { fullName?: string | null; phone?: string | null; email?: string | null; company?: string | null; notes?: string | null } | null
    lead?: { title?: string | null; description?: string | null; location?: string | null } | null
    missingInformation?: string[]
  }
}

function contactLine(draft: LeadDraft) {
  const contact = draft.proposal.contact
  return [contact?.fullName, contact?.company, contact?.phone, contact?.email].filter(Boolean).join(" · ") || "No contact identity extracted"
}

export default async function LeadDraftsPage() {
  const { supabase } = await requireOwnerAccess("/admin/ai-tools/lead-drafts")
  const { data, error } = await supabase.from("aura_intakes").select("id,message_text,status,created_at,proposal").in("status", ["needs_follow_up", "failed"]).order("created_at", { ascending: false }).limit(100).returns<LeadDraft[]>()
  const drafts = (data ?? []).filter((draft) => draft.proposal?.recordType === "lead")

  return <main className="min-h-screen bg-[#f5f5f7] px-3 py-4 text-slate-950 sm:px-6 sm:py-6"><div className="mx-auto max-w-3xl">
    <Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center text-sm font-bold text-[#0066cc]">← Manager Tools</Link>
    <header className="mt-2"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0066cc]">Exception inbox</p><h1 className="mt-1 text-3xl font-black">Leads — Needs Review</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A clear screenshot from David with a usable phone number becomes a NEW lead automatically and creates a follow-up for Carlos. Only unclear, incomplete, or duplicate contacts wait here. Nothing in this inbox sends a welcome message automatically.</p></header>

    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">Lead drafts could not be loaded.</p> : null}
    <section className="mt-5 grid gap-3" aria-label="Pending lead drafts">
      {drafts.map((draft) => <article key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-700">{draft.status.replaceAll("_", " ")}</p><h2 className="mt-1 text-lg font-black">{draft.proposal.lead?.title || draft.proposal.summary || "Possible lead"}</h2></div><time className="text-xs text-slate-500">{formatSiteDateTime(draft.created_at)}</time></div>
        <p className="mt-3 break-words rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-800">{contactLine(draft)}</p>
        {draft.proposal.lead?.description || draft.proposal.contact?.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{draft.proposal.lead?.description || draft.proposal.contact?.notes}</p> : null}
        {draft.message_text ? <details className="mt-3 rounded-xl border border-slate-200"><summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-bold text-slate-600">Original inbound text</summary><p className="whitespace-pre-wrap border-t border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700">{draft.message_text}</p></details> : null}
        {draft.proposal.missingInformation?.length ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Needs review:</strong> {draft.proposal.missingInformation.join(" · ")}</p> : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <form action={confirmAuraIntakeAction}><input type="hidden" name="intakeId" value={draft.id} /><button type="submit" disabled={draft.status === "failed"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Check className="h-4 w-4" />Confirm reviewed lead</button></form>
          <form action={reviewTrustedSmsIntakeAction}><input type="hidden" name="intakeId" value={draft.id} /><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"><RotateCcw className="h-4 w-4" />Run AI again</button></form>
          <form action={cancelAuraIntakeAction}><input type="hidden" name="intakeId" value={draft.id} /><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"><X className="h-4 w-4" />Not a lead</button></form>
        </div>
      </article>)}
      {!drafts.length && !error ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-black">Nothing needs review</h2><p className="mt-2 text-sm leading-6 text-slate-500">Clear screenshots from David are already added to the lead directory. Only missing, uncertain, or duplicate details appear here.</p></div> : null}
    </section>
  </div></main>
}
