import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpenCheck, CheckCircle2, ChevronLeft, ClipboardCheck, MessageSquareText, Search, ShieldCheck } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"
import { addConstructionKnowledgeAction, addOrderStandardAction, deleteConstructionKnowledgeAction, setConstructionKnowledgeEnabledAction, updateConstructionKnowledgeAction } from "./actions"

type KnowledgeRow = {
  id: string
  fact: string
  category: string
  source_path: string
  enabled: boolean
  reviewed_at: string
  updated_at: string
}

const QUESTION_STOP_WORDS = new Set(["a", "an", "and", "are", "can", "do", "for", "how", "i", "in", "is", "it", "of", "on", "or", "should", "the", "to", "we", "what", "when", "with"])

function questionTerms(question: string) {
  return [...new Set(question.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 1 && !QUESTION_STOP_WORDS.has(term)) ?? [])]
}

function guidanceForQuestion(question: string, knowledge: KnowledgeRow[]) {
  const terms = questionTerms(question)
  if (!terms.length) return []
  return knowledge
    .filter((entry) => entry.enabled)
    .map((entry) => {
      const searchable = `${entry.category} ${entry.fact}`.toLowerCase()
      const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0)
      return { entry, score }
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || Date.parse(right.entry.reviewed_at || right.entry.updated_at) - Date.parse(left.entry.reviewed_at || left.entry.updated_at))
    .slice(0, 3)
    .map((match) => match.entry)
}

export default async function ConstructionKnowledgePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; question?: string }> }) {
  const params = await searchParams
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.owner) redirect("/")

  const { data, error } = await supabase
    .from("aura_ai_reply_knowledge")
    .select("id,fact,category,source_path,enabled,reviewed_at,updated_at")
    .order("reviewed_at", { ascending: false })
    .limit(200)
    .returns<KnowledgeRow[]>()
  const knowledge = data ?? []
  const question = String(params.question || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const guidance = question ? guidanceForQuestion(question, knowledge) : []

  return <main className="min-h-screen bg-[#f5f6f8] px-3 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/ai-tools" className="inline-flex items-center gap-1 text-xs font-bold text-sky-700"><ChevronLeft className="h-4 w-4" />Manager Tools</Link>
      <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
        <div className="flex items-start gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500"><BookOpenCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Owner only</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Construction Knowledge</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review the stable construction facts Avantia may use in customer replies. This uses the existing AI knowledge store—there is no duplicate database.</p></div></div>
      </header>

      {params.saved ? <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Construction knowledge saved.</p> : null}
      {params.error || error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">The knowledge could not be saved. Check the fact and its source, then try again.</p> : null}

      <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="text-sm font-bold text-amber-950">Stable, reviewed facts only</h2><p className="mt-1 text-xs leading-5 text-amber-900">Do not enter live price, current stock, guaranteed delivery, or project-specific claims here. Keep those in the catalog or request workflow for manager confirmation.</p></div></div></section>

      <section className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="ask-construction-ai">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MessageSquareText className="h-5 w-5" /></span><div><h2 id="ask-construction-ai" className="font-bold text-slate-950">Ask Construction AI</h2><p className="mt-1 text-xs leading-5 text-slate-500">Ask one work question. The answer uses active, reviewed facts from this page only.</p></div></div>
        <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="construction-question" className="sr-only">One construction question</label>
          <input id="construction-question" name="question" defaultValue={question} required maxLength={300} placeholder="Example: What should we ask when a customer needs a dumpster?" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950" />
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white"><Search className="h-4 w-4" />Get guidance</button>
        </form>
        {question ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-sky-700">Approved guidance</p>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{question}</h3>
          {guidance.length ? <ul className="mt-3 space-y-3">{guidance.map((entry) => <li key={entry.id} className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm"><p>{entry.fact}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.category} · {entry.source_path}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">No approved standard answers this yet. Add or review an Order Standard below before the customer AI uses it.</p>}
        </div> : null}
      </section>

      <section id="order-standards" className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="order-standards-title">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><ClipboardCheck className="h-5 w-5" /></span><div><h2 id="order-standards-title" className="font-bold text-slate-950">Order Standards</h2><p className="mt-1 text-xs leading-5 text-slate-500">Turn a repeat order into a clear playbook: when it applies, the useful options, the next questions, and what still needs confirmation.</p></div></div>

        <details className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-indigo-950">Dumpster / container example</summary>
          <div className="grid gap-3 border-t border-indigo-200 px-4 py-4 text-xs leading-5 text-indigo-950 sm:grid-cols-2">
            <div><p className="font-bold">Relevant options</p><p className="mt-1">10, 15, 20, 30, or 40 yard container; mixed construction debris; clean concrete or dirt; roofing debris; household cleanout.</p></div>
            <div><p className="font-bold">Questions that matter</p><p className="mt-1">Debris type, size or estimated amount, full delivery address, needed date, placement location, and pickup or swap timing.</p></div>
            <div><p className="font-bold">Confirm before finalizing</p><p className="mt-1">Restricted materials, weight limits, truck access, street permit needs, delivery window, pickup timing, and current price.</p></div>
            <div><p className="font-bold">Short reply example</p><p className="mt-1">Yes—we can help with a dumpster. What are you throwing out, what size do you need, and what is the delivery address?</p></div>
          </div>
        </details>

        <form action={addOrderStandardAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Standard name<input name="standardName" required maxLength={100} defaultValue="Dumpster / container request" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700">Source path or HTTPS URL<input name="sourcePath" required maxLength={500} defaultValue="/admin/ai-tools/construction-knowledge#order-standards" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Use when<textarea name="customerNeed" required maxLength={300} rows={2} defaultValue="A customer asks for a dumpster, debris container, container delivery, pickup, or swap." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Relevant options<textarea name="options" maxLength={500} rows={3} defaultValue="10, 15, 20, 30, or 40 yard container; mixed construction debris; clean concrete or dirt; roofing debris; household cleanout." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Ask only unresolved questions<textarea name="questions" required maxLength={500} rows={3} defaultValue="What material is going in it? What size do you need, or how much debris is there? What is the full delivery address? When should it arrive? Where should it be placed? When should it be picked up or swapped?" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Confirm before finalizing<textarea name="confirmations" required maxLength={400} rows={3} defaultValue="Restricted materials, weight limits, truck access, street permit needs, delivery window, pickup timing, and current price." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Short customer reply example<textarea name="sampleReply" required maxLength={300} rows={2} defaultValue="Yes—we can help with a dumpster. What are you throwing out, what size do you need, and what is the delivery address?" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <div className="flex items-center justify-between gap-3 sm:col-span-2"><p className="max-w-xl text-[10px] leading-4 text-slate-500">Saving creates one active order-standard fact in the existing AI knowledge store. Review the generated fact below and pause it any time.</p><button type="submit" className="h-10 shrink-0 rounded-lg bg-indigo-700 px-4 text-xs font-bold text-white">Save order standard</button></div>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-bold text-slate-950">Add a reviewed fact</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Add a website path or authoritative HTTPS source so the fact can be checked later.</p>
        <form action={addConstructionKnowledgeAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Category<input name="category" required maxLength={80} placeholder="drywall" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700">Source path or HTTPS URL<input name="sourcePath" required maxLength={500} placeholder="/shop/sheet-rock" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Reviewed fact<textarea name="fact" required maxLength={2000} rows={3} placeholder="Write one clear fact the AI can safely use." className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6" /></label>
          <div className="flex justify-end sm:col-span-2"><button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white">Add approved fact</button></div>
        </form>
      </section>

      <section className="mt-4 space-y-3" aria-label="Reviewed construction knowledge">
        {knowledge.length ? knowledge.map((entry) => <article key={entry.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${entry.enabled ? "border-emerald-200" : "border-slate-200 opacity-75"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-700">{entry.category}</span><span className="text-[10px] font-bold text-slate-500">{entry.enabled ? "Active" : "Paused"}</span></div><div className="flex gap-3"><form action={setConstructionKnowledgeEnabledAction}><input type="hidden" name="knowledgeId" value={entry.id} /><input type="hidden" name="enabled" value={entry.enabled ? "false" : "true"} /><button type="submit" className="text-[11px] font-bold text-sky-700">{entry.enabled ? "Pause" : "Enable"}</button></form><form action={deleteConstructionKnowledgeAction}><input type="hidden" name="knowledgeId" value={entry.id} /><button type="submit" className="text-[11px] font-bold text-rose-700">Remove</button></form></div></div>
          <form action={updateConstructionKnowledgeAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="knowledgeId" value={entry.id} />
            <label className="text-xs font-bold text-slate-700">Category<input name="category" required maxLength={80} defaultValue={entry.category} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-700">Source<input name="sourcePath" required maxLength={500} defaultValue={entry.source_path} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Fact<textarea name="fact" required maxLength={2000} rows={3} defaultValue={entry.fact} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6" /></label>
            <div className="flex items-center justify-between gap-3 sm:col-span-2"><span className="text-[10px] text-slate-500">Last reviewed {new Date(entry.reviewed_at || entry.updated_at).toLocaleDateString("en-US")}</span><button type="submit" className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800">Save changes</button></div>
          </form>
        </article>) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No reviewed facts yet. AI will rely on the conversation, catalog matches, and safety fallback.</p>}
      </section>
    </div>
  </main>
}
