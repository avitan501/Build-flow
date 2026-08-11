"use client"

import { Check, Copy, Download, FileText, WandSparkles } from "lucide-react"
import { useActionState, useState } from "react"

import { convertEstimateAction, type EstimateConverterState } from "@/app/admin/ai-tools/estimate-converter/actions"

const initialState: EstimateConverterState = { status: "idle", message: "", output: "" }
const inputClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"

export function EstimateConverterTool() {
  const [state, action, pending] = useActionState(convertEstimateAction, initialState)
  const [copied, setCopied] = useState(false)

  async function copyOutput() {
    await navigator.clipboard.writeText(state.output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function downloadOutput() {
    const url = URL.createObjectURL(new Blob([state.output], { type: "text/plain;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "avantia-proposal-request.txt"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <form action={action} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white"><WandSparkles className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Source estimate</h2><p className="mt-1 text-sm text-slate-500">Paste the estimate or upload a searchable PDF, TXT, or CSV.</p></div></div>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Estimate file <span className="text-xs font-normal text-slate-500">Optional when text is pasted</span><input name="sourceFile" type="file" accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv" className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-semibold file:text-white" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Estimate text<textarea name="sourceText" rows={10} maxLength={120000} placeholder="Paste the material estimate, scope, quantities, and specifications." className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold text-slate-800">Original company name<input name="originalCompany" placeholder="Name to remove" className={inputClass} /></label><label className="grid gap-1.5 text-sm font-semibold text-slate-800">Original client name<input name="originalClient" placeholder="Name to remove" className={inputClass} /></label></div>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Project label <span className="text-xs font-normal text-slate-500">Do not enter the client’s name</span><input name="projectLabel" placeholder="Example: Cedarhurst renovation" className={inputClass} /></label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"><input name="hidePrices" type="checkbox" defaultChecked className="h-4 w-4 accent-[#0071e3]" />Hide the original estimate prices</label>
        <button disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-50"><WandSparkles className="h-4 w-4" />{pending ? "Converting…" : "Prepare proposal request"}</button>
        {state.message ? <p role="status" className={`rounded-lg border px-3 py-2 text-sm font-medium ${state.status === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</p> : null}
      </form>

      <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Avantia output</p><h2 className="mt-1 text-lg font-bold text-slate-950">Proposal request</h2></div>{state.output ? <div className="flex gap-2"><button type="button" onClick={copyOutput} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button><button type="button" onClick={downloadOutput} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"><Download className="h-4 w-4" />Download</button></div> : null}</div>
        {state.output ? <textarea aria-label="Converted proposal request" readOnly value={state.output} rows={28} className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-xs leading-6 text-slate-800" /> : <div className="mt-5 flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center"><FileText className="h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Your cleaned proposal request will appear here.</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Always review measurements, quantities, and scope before sending it to a supplier.</p></div>}
      </section>
    </div>
  )
}
