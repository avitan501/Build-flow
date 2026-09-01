"use client"

import { Check, Copy, FileText, Route, Search, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { MaterialReviewEditor } from "@/components/buildflow/material-review-editor"
import { OrganizeMaterialListButton } from "@/components/buildflow/organize-material-list-button"
import { OriginalRequestItemEditor } from "@/components/buildflow/original-request-item-editor"
import { RequestAttachmentUploader } from "@/components/buildflow/request-attachment-uploader"
import { RequestSupplierRouteEditor, type RequestRouteSupplier } from "@/components/buildflow/request-supplier-route-editor"
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

export function RequestMaterialWorktable({
  requestId,
  originalItems,
  organizedItems,
  defaultZipCode = "11516",
  organizationStatus,
  organizationCompletedLabel,
  supplierComparisons,
  suppliers,
  attachments,
}: {
  requestId: string
  originalItems: ReviewableMaterialItem[]
  organizedItems: ReviewableMaterialItem[]
  defaultZipCode?: string
  organizationStatus: string
  organizationCompletedLabel?: string
  supplierComparisons: RequestWorktableComparison[]
  suppliers: RequestRouteSupplier[]
  attachments: Array<{ id: string; file_name: string; url: string | null }>
}) {
  const router = useRouter()
  const [savedItems, setSavedItems] = useState<Record<string, ReviewableMaterialItem>>({})
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const [copied, setCopied] = useState<"original" | "ai" | null>(null)
  const [copyNotice, setCopyNotice] = useState("")
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [batchSupplier, setBatchSupplier] = useState("")
  const [batchManual, setBatchManual] = useState("")
  const [batchFeedback, setBatchFeedback] = useState("")
  const [batchPending, startBatchTransition] = useTransition()
  const sourceItems = originalItems
  const aiItems = organizedItems.map((item) => savedItems[item.id] ?? item)
  const representedSourceIds = new Set(aiItems.map((item) => typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : "").filter(Boolean))
  const aiCoversEverySource = sourceItems.every((item) => representedSourceIds.has(item.id))
  const items = aiItems.length ? [...aiItems, ...originalItems.filter((item) => !representedSourceIds.has(item.id))] : originalItems
  const originalById = new Map(sourceItems.map((item) => [item.id, item]))
  const seenSourceIds = new Set<string>()
  const rows = items.map((item) => {
    const sourceItemId = typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : ""
    const hasAi = item.metadata?.ai_organized === true
    const sourceItem = hasAi ? originalById.get(sourceItemId) ?? null : item
    const sourceKey = sourceItem?.id || `unlinked-${item.id}`
    const showSource = !seenSourceIds.has(sourceKey)
    seenSourceIds.add(sourceKey)
    return { item, sourceItem, showSource, hasAi }
  })

  function applyBatchRoute() {
    const names = [...new Set([batchSupplier, ...batchManual.split(",")].map((name) => name.trim()).filter(Boolean))]
    setBatchFeedback("")
    startBatchTransition(async () => {
      const result = await saveRequestItemSupplierRouteAction({ requestId, itemIds: selectedRouteIds, supplierNames: names })
      if (!result.ok) { setBatchFeedback(result.error); return }
      setSelectedRouteIds([])
      setBatchSupplier("")
      setBatchManual("")
      setBatchFeedback("Supplier route saved.")
      router.refresh()
    })
  }

  async function copyList(kind: "original" | "ai") {
    setCopyNotice("")
    try {
      await navigator.clipboard.writeText(copyText(kind === "original" ? sourceItems : aiItems))
      setCopied(kind)
      setCopyNotice(kind === "original" ? "Original request copied." : "AI organized list copied.")
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
      setCopyNotice("Could not copy. Try again.")
    }
  }

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="request-items-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Step 1 · Request workspace</p>
          <h2 id="request-items-heading" className="text-lg font-bold">Request items</h2>
          <p className="text-xs text-slate-500">Quantity, item details, and only the information still missing.</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <OriginalRequestItemEditor requestId={requestId} mode="add" />
          {organizationStatus !== "processing" ? <OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} /> : <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-50 px-3 text-xs font-bold text-sky-800"><Sparkles className="h-4 w-4 animate-pulse" />Generating AI…</span>}
        </div>
      </div>

      {organizationCompletedLabel ? <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold text-slate-400">Last AI review: {organizationCompletedLabel} ET</p> : null}
      <details className="border-b border-slate-200 bg-slate-50/70"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold text-slate-700 sm:px-4"><span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-[#0066cc]" />Documents &amp; photos</span><span className="text-[10px] text-slate-400">{attachments.length} attached · Open</span></summary><div className="border-t border-slate-200 bg-white"><RequestAttachmentUploader requestId={requestId} compact />{attachments.length ? <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">{attachments.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{file.file_name}</span>)}</div> : null}</div></details>
      <p className="sr-only" role="status" aria-live="polite">{copyNotice}</p>
      {items.length ? <p className="border-b border-slate-100 px-3 py-1.5 text-right text-[10px] font-bold text-[#0066cc] sm:hidden">Swipe to compare →</p> : null}
      {items.length ? <div className="border-b border-sky-100 bg-sky-50/60 p-2"><div className="max-w-md"><RequestSupplierRouteEditor requestId={requestId} itemIds={items.map((item) => item.id)} suppliers={suppliers} applyToAll /></div></div> : null}
      {selectedRouteIds.length ? <div className="grid gap-2 border-b border-sky-200 bg-sky-50 p-2 sm:grid-cols-[auto_12rem_minmax(10rem,1fr)_auto] sm:items-center"><span className="text-[10px] font-bold text-sky-900">Route {selectedRouteIds.length} selected</span><select value={batchSupplier} onChange={(event) => setBatchSupplier(event.target.value)} className="h-9 rounded-md border border-sky-200 bg-white px-2 text-[11px] font-semibold"><option value="">Choose supplier…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select><input value={batchManual} onChange={(event) => setBatchManual(event.target.value)} placeholder="Or type supplier names" className="h-9 rounded-md border border-sky-200 px-2 text-[11px]" /><button type="button" onClick={applyBatchRoute} disabled={batchPending || (!batchSupplier && !batchManual.trim())} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-[#0071e3] px-3 text-[11px] font-bold text-white disabled:opacity-40"><Route className="h-3.5 w-3.5" />Apply</button>{batchFeedback ? <p className="text-[10px] font-bold text-rose-700 sm:col-span-4">{batchFeedback}</p> : null}</div> : null}

      {items.length ? (
        <div className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3]" tabIndex={0} aria-label="Scrollable request, AI, and supplier comparison">
          <table className="w-full min-w-[58rem] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
                <th className="z-20 w-60 bg-slate-50 px-3 py-2 md:sticky md:left-0 md:shadow-[6px_0_10px_-10px_rgba(15,23,42,.35)]">
                  <div className="flex items-center justify-between gap-2"><span>Original request</span>{sourceItems.length ? <button type="button" onClick={() => copyList("original")} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold normal-case tracking-normal text-slate-700" aria-label="Copy original request column">{copied === "original" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}{copied === "original" ? "Copied" : "Copy"}</button> : null}</div>
                </th>
                <th className="w-60 border-l border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2"><span>AI organized</span>{organizedItems.length ? <button type="button" onClick={() => copyList("ai")} disabled={!aiCoversEverySource} title={aiCoversEverySource ? "Copy the AI organized column" : "Complete AI organization for every original item first"} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 text-[10px] font-bold normal-case tracking-normal text-[#0066cc] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" aria-label="Copy AI organized column">{copied === "ai" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}{copied === "ai" ? "Copied" : aiCoversEverySource ? "Copy" : "Incomplete"}</button> : null}</div>
                </th>
                <th className="w-52 border-l border-slate-200 px-3 py-2.5">Missing info / AI notes</th>
                <th className="w-60 border-l border-slate-200 px-3 py-2.5">Supplier route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ item, sourceItem, showSource, hasAi }) => {
                const status = materialReviewStatus(item)
                const reasons = materialReviewReasons(item)
                const missing = status !== "ready" && reasons.length > 0
                const priceOpen = priceItemId === item.id
                return (
                  <tr key={item.id} className="align-top">
                    <td className="z-10 bg-white px-3 py-3 md:sticky md:left-0 md:shadow-[6px_0_10px_-10px_rgba(15,23,42,.35)]">
                      {sourceItem && showSource ? <><div className="mb-1 flex items-center justify-between gap-2"><label className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500"><input type="checkbox" checked={selectedRouteIds.includes(item.id)} onChange={(event) => setSelectedRouteIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} />Route</label><OriginalRequestItemEditor requestId={requestId} item={sourceItem} /></div><p className="text-sm font-extrabold tabular-nums text-slate-950">{materialQuantity(sourceItem)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(sourceItem)}</span></p><p className="text-sm font-bold text-slate-950">{sourceItem.name}</p>{itemDetails(sourceItem) ? <p title={itemDetails(sourceItem)} className="mt-0.5 line-clamp-4 cursor-help text-xs leading-5 text-slate-500">{itemDetails(sourceItem)}</p> : null}</> : sourceItem ? <p className="text-xs font-semibold text-slate-400">Same original item</p> : <p className="text-xs font-semibold text-amber-700">Original link unavailable</p>}
                    </td>
                    <td className="border-l border-slate-100 px-3 py-3">
                      {hasAi ? <><p className="text-sm font-extrabold tabular-nums text-slate-950">{materialQuantity(item)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(item)}</span></p><p className="text-sm font-bold text-slate-950">{item.name}</p>{itemDetails(item) ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{itemDetails(item)}</p> : null}<button type="button" onClick={() => setPriceItemId(priceOpen ? null : item.id)} className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Online prices</button>{priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}</> : <p className="text-xs font-semibold text-slate-400">Not organized yet</p>}
                    </td>
                    <td className={`border-l border-slate-100 px-3 py-3 ${missing ? "bg-amber-50/70" : ""}`}>
                      {missing ? (
                        <div>
                          <div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-white px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{reason}</span>)}</div>
                          <div className="mt-2"><span className="sr-only">Ask AI</span><MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /></div>
                        </div>
                      ) : <span aria-label="No missing information — Ready" className="sr-only">Ready</span>}
                    </td>
                    <td className="border-l border-slate-100 px-2 py-2"><RequestSupplierRouteEditor requestId={requestId} itemId={item.id} metadata={item.metadata} suppliers={suppliers} /></td>
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
