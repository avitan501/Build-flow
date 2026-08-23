"use client"

import { Search } from "lucide-react"
import { useState } from "react"

import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { materialReviewReasons, materialReviewStatus, materialReviewSummary, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"

const STATUS_STYLE = {
  ready: { label: "Ready", badge: "bg-emerald-100 text-emerald-800" },
  check: { label: "Check", badge: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", badge: "bg-rose-100 text-rose-800" },
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
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600"><span><strong className="text-emerald-700">{summary.ready}</strong> ready</span><span><strong className="text-amber-700">{summary.check}</strong> check</span><span><strong className="text-rose-700">{summary.missing}</strong> missing</span></div>
    <p className="mt-2 text-xs text-slate-500">Only yellow and red items need attention before supplier pricing.</p>
    <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{items.map((item) => { const status = materialReviewStatus(item); const style = STATUS_STYLE[status]; const reasons = materialReviewReasons(item); const isOpen = priceItemId === item.id; return <article key={item.id} className="min-w-0 py-3"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-bold">{item.name}</h3><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>{style.label}</span></div><p className="mt-1 break-words text-xs leading-5 text-slate-600">{details(item)}</p></div><strong className="shrink-0 text-sm tabular-nums text-slate-950">{item.quantity} {item.unit || "each"}</strong></div>{reasons.length ? <ul className="mt-2 grid gap-1 text-xs font-semibold text-rose-700">{reasons.map((reason) => <li key={reason}>Missing: {reason}</li>)}</ul> : null}<button type="button" onClick={() => setPriceItemId(isOpen ? null : item.id)} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Check price</button>{isOpen ? <MaterialPriceCheck query={materialSearchQuery(item)} department={item.department} onClose={() => setPriceItemId(null)} /> : null}</article> })}</div>
  </>
}
