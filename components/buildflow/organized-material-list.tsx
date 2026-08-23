"use client"

import { Search } from "lucide-react"
import { useState } from "react"

import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { materialReviewReasons, materialReviewStatus, materialReviewSummary, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"

const STATUS_STYLE = {
  ready: { label: "Ready", badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" },
  check: { label: "Check", badge: "bg-amber-100 text-amber-800", border: "border-amber-200" },
  missing: { label: "Missing", badge: "bg-rose-100 text-rose-800", border: "border-rose-200" },
} as const

function details(item: ReviewableMaterialItem) {
  const dimensions = typeof item.metadata?.dimensions === "string" ? item.metadata.dimensions : ""
  const thickness = typeof item.metadata?.thickness === "string" ? item.metadata.thickness : ""
  const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details : ""
  return [dimensions && `Size: ${dimensions}`, thickness && `Thickness: ${thickness}`, requestDetails].filter(Boolean).join(" · ") || "No additional details"
}

export function OrganizedMaterialList({ items }: { items: ReviewableMaterialItem[] }) {
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const summary = materialReviewSummary(items)

  return <>
    <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center"><div className="px-2 py-2"><strong className="block text-base text-emerald-700">{summary.ready}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Ready</span></div><div className="border-x border-slate-200 px-2 py-2"><strong className="block text-base text-amber-700">{summary.check}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Check</span></div><div className="px-2 py-2"><strong className="block text-base text-rose-700">{summary.missing}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Missing</span></div></div>
    <p className="mt-2 text-xs text-slate-500">Only yellow and red items need attention before supplier pricing.</p>
    <div className="mt-3 grid gap-2 sm:hidden">{items.map((item) => { const status = materialReviewStatus(item); const style = STATUS_STYLE[status]; const reasons = materialReviewReasons(item); const isOpen = priceItemId === item.id; return <article key={item.id} className={`min-w-0 rounded-lg border bg-white p-3 ${style.border}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-bold">{item.name}</h3><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>{style.label}</span></div><span className="shrink-0 rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white tabular-nums">{item.quantity} {item.unit || "each"}</span></div><p className="mt-2 break-words text-xs leading-5 text-slate-600">{details(item)}</p>{reasons.length ? <ul className="mt-2 grid gap-1 text-xs font-semibold text-rose-700">{reasons.map((reason) => <li key={reason}>Missing: {reason}</li>)}</ul> : null}<button type="button" onClick={() => setPriceItemId(isOpen ? null : item.id)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Check price</button>{isOpen ? <MaterialPriceCheck query={materialSearchQuery(item)} department={item.department} onClose={() => setPriceItemId(null)} /> : null}</article> })}</div>
    <div className="mt-3 hidden overflow-hidden rounded-lg border border-slate-200 sm:block"><table className="w-full table-fixed border-collapse text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="w-28 px-3 py-2.5">Quantity</th><th className="w-[28%] px-3 py-2.5">Item</th><th className="px-3 py-2.5">Size and details</th><th className="w-28 px-3 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-slate-200">{items.map((item) => { const status = materialReviewStatus(item); const style = STATUS_STYLE[status]; const reasons = materialReviewReasons(item); const isOpen = priceItemId === item.id; return <tr key={item.id} className="align-top"><td className="bg-slate-50 px-3 py-3 font-bold tabular-nums">{item.quantity} {item.unit || "each"}</td><td className="break-words px-3 py-3 font-semibold">{item.name}</td><td className="break-words px-3 py-3 leading-5 text-slate-600"><p>{details(item)}</p>{reasons.length ? <p className="mt-1 text-xs font-semibold text-rose-700">Missing: {reasons.join(" · ")}</p> : null}{isOpen ? <MaterialPriceCheck query={materialSearchQuery(item)} department={item.department} onClose={() => setPriceItemId(null)} /> : null}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>{style.label}</span><button type="button" onClick={() => setPriceItemId(isOpen ? null : item.id)} className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Price</button></td></tr> })}</tbody></table></div>
  </>
}
