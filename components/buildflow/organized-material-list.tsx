"use client"

import { Check, Copy, Search } from "lucide-react"
import { useState } from "react"

import { MaterialReviewEditor } from "@/components/buildflow/material-review-editor"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { materialQuantity, materialReviewReasons, materialReviewStatus, materialReviewSummary, materialSalesUnit, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"

const STATUS_STYLE = {
  ready: { label: "Ready", badge: "bg-emerald-100 text-emerald-800" },
  check: { label: "Check", badge: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", badge: "bg-rose-100 text-rose-800" },
} as const

function details(item: ReviewableMaterialItem) {
  const dimensions = typeof item.metadata?.dimensions === "string" ? item.metadata.dimensions : ""
  const thickness = typeof item.metadata?.thickness === "string" ? item.metadata.thickness : ""
  const productType = typeof item.metadata?.product_type === "string" ? item.metadata.product_type : ""
  const screwLength = typeof item.metadata?.screw_length === "string" ? item.metadata.screw_length : ""
  const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details : ""
  return [productType, dimensions, thickness, screwLength && `Length: ${screwLength}`, requestDetails].filter(Boolean).join(" · ") || "Details not specified"
}

function copyText(items: ReviewableMaterialItem[]) {
  return items.map((item) => [
    `${materialQuantity(item)} ${materialSalesUnit(item)}`,
    item.name,
    details(item) === "Details not specified" ? "" : details(item),
  ].filter(Boolean).join(" | ")).join("\n")
}

export function OrganizedMaterialList({ requestId, items, defaultZipCode = "11516" }: { requestId: string; items: ReviewableMaterialItem[]; defaultZipCode?: string }) {
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedItems, setSavedItems] = useState<Record<string, ReviewableMaterialItem>>({})
  const visibleItems = items.map((item) => savedItems[item.id] ?? item)
  const summary = materialReviewSummary(visibleItems)

  async function copyList() {
    try {
      await navigator.clipboard.writeText(copyText(visibleItems))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return <>
    <div className="mt-3 flex items-center justify-between gap-3"><div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600"><span><strong className="text-emerald-700">{summary.ready}</strong> ready</span><span><strong className="text-amber-700">{summary.check}</strong> check</span><span><strong className="text-rose-700">{summary.missing}</strong> missing</span></div><button type="button" onClick={copyList} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-800">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy list"}</button></div>
    <p className="mt-1 text-[10px] text-slate-500">Review yellow and red items before supplier pricing.</p>
    <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">{visibleItems.map((item) => { const status = materialReviewStatus(item); const style = STATUS_STYLE[status]; const reasons = materialReviewReasons(item); const isOpen = priceItemId === item.id; return <article key={item.id} className="min-w-0 py-2"><div className="flex min-w-0 items-start gap-2"><strong className="w-20 shrink-0 text-xs tabular-nums text-slate-950">{materialQuantity(item)} {materialSalesUnit(item)}</strong><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="break-words text-xs font-bold">{item.name}</h3><span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${style.badge}`}>{style.label}</span></div><p className="mt-0.5 break-words text-[11px] leading-4 text-slate-600">{details(item)}</p></div></div>{reasons.length ? <div className="mt-1.5 flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">{reason}</span>)}</div> : null}{status !== "ready" ? <MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /> : null}<button type="button" onClick={() => setPriceItemId(isOpen ? null : item.id)} className="mt-1 inline-flex min-h-7 items-center gap-1.5 text-[11px] font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Check price</button>{isOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}</article> })}</div>
  </>
}
