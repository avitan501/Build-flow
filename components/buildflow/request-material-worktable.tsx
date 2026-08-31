"use client"

import { Check, Copy, Search, Sparkles } from "lucide-react"
import { useState } from "react"

import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { MaterialReviewEditor } from "@/components/buildflow/material-review-editor"
import { OrganizeMaterialListButton } from "@/components/buildflow/organize-material-list-button"
import { RequestSupplierComparison, type RequestSupplierComparisonItem, type RequestSupplierComparisonSupplier } from "@/components/buildflow/request-supplier-comparison"
import { cleanMaterialRequestDetails, materialQuantity, materialReviewReasons, materialReviewStatus, materialSalesUnit, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"

export type RequestWorktableComparison = {
  id: string
  title: string
  href: string
  items: RequestSupplierComparisonItem[]
  suppliers: RequestSupplierComparisonSupplier[]
}

function itemDetails(item: ReviewableMaterialItem) {
  const metadata = item.metadata ?? {}
  const productType = typeof metadata.product_type === "string" ? metadata.product_type : ""
  const dimensions = typeof metadata.dimensions === "string" ? metadata.dimensions : ""
  const thickness = typeof metadata.thickness === "string" ? metadata.thickness : ""
  const screwLength = typeof metadata.screw_length === "string" ? metadata.screw_length : ""
  const requestDetails = cleanMaterialRequestDetails(metadata.request_details)
  return [productType, dimensions, thickness, screwLength && `Length: ${screwLength}`, requestDetails].filter(Boolean).join(" · ")
}

function copyText(items: ReviewableMaterialItem[]) {
  return items.map((item) => [
    `${materialQuantity(item)} ${materialSalesUnit(item)}`,
    item.name,
    itemDetails(item),
  ].filter(Boolean).join(" | ")).join("\n")
}

export function RequestMaterialWorktable({
  requestId,
  originalItems,
  organizedItems,
  defaultZipCode = "11516",
  organizationStatus,
  organizationCompletedLabel,
  supplierComparisons,
}: {
  requestId: string
  originalItems: ReviewableMaterialItem[]
  organizedItems: ReviewableMaterialItem[]
  defaultZipCode?: string
  organizationStatus: string
  organizationCompletedLabel?: string
  supplierComparisons: RequestWorktableComparison[]
}) {
  const [savedItems, setSavedItems] = useState<Record<string, ReviewableMaterialItem>>({})
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const baseItems = organizedItems.length ? organizedItems : originalItems
  const items = baseItems.map((item) => savedItems[item.id] ?? item)

  async function copyList() {
    try {
      await navigator.clipboard.writeText(copyText(items))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="request-items-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Request workspace</p>
          <h2 id="request-items-heading" className="text-lg font-bold">Request items</h2>
          <p className="text-xs text-slate-500">Quantity, item details, and only the information still missing.</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {items.length ? <button type="button" onClick={copyList} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button> : null}
          {organizationStatus !== "processing" ? <OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} /> : <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-50 px-3 text-xs font-bold text-sky-800"><Sparkles className="h-4 w-4 animate-pulse" />Generating AI…</span>}
        </div>
      </div>

      {organizationCompletedLabel ? <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold text-slate-400">Last AI review: {organizationCompletedLabel} ET</p> : null}

      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
                <th className="w-28 px-3 py-2.5">Quantity</th>
                <th className="px-3 py-2.5">Item details</th>
                <th className="w-[42%] px-3 py-2.5">Missing info / AI notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const status = materialReviewStatus(item)
                const reasons = materialReviewReasons(item)
                const missing = status !== "ready" && reasons.length > 0
                const priceOpen = priceItemId === item.id
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3 text-sm font-bold tabular-nums text-slate-950">{materialQuantity(item)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(item)}</span></td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-slate-950">{item.name}</p>
                      {itemDetails(item) ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{itemDetails(item)}</p> : null}
                      <button type="button" onClick={() => setPriceItemId(priceOpen ? null : item.id)} className="mt-1 inline-flex min-h-7 items-center gap-1 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Online prices</button>
                      {priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}
                    </td>
                    <td className={`px-3 py-3 ${missing ? "bg-amber-50/70" : ""}`}>
                      {missing ? (
                        <div>
                          <div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-white px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{reason}</span>)}</div>
                          <div className="mt-2"><span className="sr-only">Ask AI</span><MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /></div>
                        </div>
                      ) : <span aria-label="No missing information — Ready" className="sr-only">Ready</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No request items found.</p>
      )}

      {supplierComparisons.map((comparison) => (
        <div key={comparison.id} className="border-t border-slate-200 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{comparison.title}</h3><a href={comparison.href} className="text-xs font-bold text-[#0066cc]">Full comparison</a></div>
          <RequestSupplierComparison items={comparison.items} suppliers={comparison.suppliers} />
        </div>
      ))}
    </section>
  )
}
