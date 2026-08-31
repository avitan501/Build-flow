"use client"

import { Check, Copy, Search, Sparkles } from "lucide-react"
import { useState } from "react"

import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { MaterialReviewEditor } from "@/components/buildflow/material-review-editor"
import { OrganizeMaterialListButton } from "@/components/buildflow/organize-material-list-button"
import { type RequestSupplierComparisonItem, type RequestSupplierComparisonSupplier } from "@/components/buildflow/request-supplier-comparison"
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

function comparisonWords(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 1))
}

function matchingComparisonItem(item: ReviewableMaterialItem, candidates: RequestSupplierComparisonItem[]) {
  const requestText = `${item.name} ${itemDetails(item)}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ")
  const requestWords = comparisonWords(requestText)
  return candidates
    .map((candidate) => {
      const candidateText = `${candidate.description} ${candidate.specification || ""}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ")
      if (candidateText === requestText) return { candidate, score: 10 }
      if (candidateText.includes(requestText) || requestText.includes(candidateText)) return { candidate, score: 5 }
      const candidateWords = comparisonWords(candidateText)
      const overlap = [...candidateWords].filter((word) => requestWords.has(word)).length
      return { candidate, score: overlap / Math.max(candidateWords.size, requestWords.size, 1) }
    })
    .sort((left, right) => right.score - left.score)[0]?.candidate ?? null
}

function price(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function quoteDate(value?: string | null) {
  if (!value) return "Date not provided"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
  const [copied, setCopied] = useState<"original" | "ai" | null>(null)
  const sourceItems = originalItems
  const baseItems = organizedItems.length ? organizedItems : originalItems
  const items = baseItems.map((item) => savedItems[item.id] ?? item)
  const originalById = new Map(sourceItems.map((item) => [item.id, item]))
  const seenSourceIds = new Set<string>()
  const rows = items.map((item, itemIndex) => {
    const sourceItemId = typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : ""
    const sourceItem = originalById.get(sourceItemId) ?? sourceItems[itemIndex] ?? item
    const showSource = !seenSourceIds.has(sourceItem.id)
    seenSourceIds.add(sourceItem.id)
    return { item, sourceItem, showSource }
  })
  const supplierColumns = supplierComparisons.flatMap((comparison) =>
    comparison.suppliers.map((supplier) => ({ comparison, supplier })),
  )

  async function copyList(kind: "original" | "ai") {
    try {
      await navigator.clipboard.writeText(copyText(kind === "original" ? sourceItems : items))
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
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
          {sourceItems.length ? <button type="button" onClick={() => copyList("original")} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700">{copied === "original" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied === "original" ? "Copied" : "Copy original"}</button> : null}
          {items.length ? <button type="button" onClick={() => copyList("ai")} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 text-xs font-bold text-[#0066cc]">{copied === "ai" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied === "ai" ? "Copied" : "Copy AI"}</button> : null}
          {organizationStatus !== "processing" ? <OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} /> : <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-50 px-3 text-xs font-bold text-sky-800"><Sparkles className="h-4 w-4 animate-pulse" />Generating AI…</span>}
        </div>
      </div>

      {organizationCompletedLabel ? <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold text-slate-400">Last AI review: {organizationCompletedLabel} ET</p> : null}

      {items.length ? (
        <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable request, AI, and supplier comparison">
          <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: `${680 + Math.max(supplierColumns.length, 1) * 200}px` }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
                <th className="sticky left-0 z-20 w-56 bg-slate-50 px-3 py-2.5 shadow-[6px_0_10px_-10px_rgba(15,23,42,.35)]">Original request · Quantity &amp; item</th>
                <th className="w-56 border-l border-slate-200 px-3 py-2.5">AI organized</th>
                <th className="w-56 border-l border-slate-200 px-3 py-2.5">Missing info / notes</th>
                {supplierColumns.length ? supplierColumns.map(({ comparison, supplier }) => (
                  <th key={`${comparison.id}-${supplier.id}`} className="w-56 border-l border-slate-200 px-3 py-2.5 normal-case tracking-normal text-slate-800">
                    <a href={comparison.href} className="block truncate text-xs font-bold text-[#0066cc]">{supplier.name}</a>
                    <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{quoteDate(supplier.quoteDate || supplier.checkedAt)} · {supplier.deliveryLabel || (Number(supplier.deliveryCharge) > 0 ? `${price(Number(supplier.deliveryCharge))} delivery` : "Delivery not stated")}</span>
                  </th>
                )) : <th className="w-56 border-l border-slate-200 px-3 py-2.5">Supplier quote</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ item, sourceItem, showSource }) => {
                const status = materialReviewStatus(item)
                const reasons = materialReviewReasons(item)
                const missing = status !== "ready" && reasons.length > 0
                const priceOpen = priceItemId === item.id
                return (
                  <tr key={item.id} className="align-top">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3 shadow-[6px_0_10px_-10px_rgba(15,23,42,.35)]">
                      {showSource ? <><p className="text-sm font-extrabold tabular-nums text-slate-950">{materialQuantity(sourceItem)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(sourceItem)}</span></p><p className="text-sm font-bold text-slate-950">{sourceItem.name}</p>{itemDetails(sourceItem) ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{itemDetails(sourceItem)}</p> : null}</> : <p className="text-xs font-semibold text-slate-400">Same original item</p>}
                    </td>
                    <td className="border-l border-slate-100 px-3 py-3">
                      <p className="text-sm font-extrabold tabular-nums text-slate-950">{materialQuantity(item)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(item)}</span></p>
                      <p className="text-sm font-bold text-slate-950">{item.name}</p>
                      {itemDetails(item) ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{itemDetails(item)}</p> : null}
                      <button type="button" onClick={() => setPriceItemId(priceOpen ? null : item.id)} className="mt-1 inline-flex min-h-7 items-center gap-1 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Online prices</button>
                      {priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}
                    </td>
                    <td className={`border-l border-slate-100 px-3 py-3 ${missing ? "bg-amber-50/70" : ""}`}>
                      {missing ? (
                        <div>
                          <div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-white px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{reason}</span>)}</div>
                          <div className="mt-2"><span className="sr-only">Ask AI</span><MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /></div>
                        </div>
                      ) : <span aria-label="No missing information — Ready" className="sr-only">Ready</span>}
                    </td>
                    {supplierColumns.length ? supplierColumns.map(({ comparison, supplier }) => {
                      const comparisonItem = matchingComparisonItem(item, comparison.items)
                      const observation = comparisonItem ? supplier.prices.find((entry) => entry.itemId === comparisonItem.id) : null
                      const available = Boolean(observation && observation.available !== false && observation.unitPrice !== null)
                      return <td key={`${comparison.id}-${supplier.id}`} className="border-l border-slate-100 px-3 py-3 align-top">
                        {available ? <div><p className="text-base font-extrabold tabular-nums text-slate-950">{price(Number(observation?.unitPrice))}</p><p className="text-[10px] font-semibold text-slate-500">per {observation?.unit || comparisonItem?.unit || materialSalesUnit(item)}</p>{observation?.notes ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{observation.notes}</p> : null}</div> : <div><p className="text-xs font-bold text-amber-800">Not quoted</p><p className="mt-0.5 text-[10px] text-slate-500">No matched price yet</p></div>}
                      </td>
                    }) : <td className="border-l border-slate-100 px-3 py-3"><p className="text-xs font-bold text-slate-500">No supplier quote yet</p><p className="mt-0.5 text-[10px] text-slate-400">Add one from Documents</p></td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No request items found.</p>
      )}

      {supplierComparisons.length ? <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">{supplierComparisons.map((comparison) => <a key={comparison.id} href={comparison.href} className="text-xs font-bold text-[#0066cc]">Open full comparison · {comparison.title}</a>)}</div> : null}
    </section>
  )
}
