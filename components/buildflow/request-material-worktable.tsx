"use client"

import { Check, ChevronDown, Copy, FileText, Route, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { MaterialOrganizationStatus } from "@/components/buildflow/material-organization-status"
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

function supplierRouteVersion(metadata: Record<string, unknown> | null | undefined) {
  return JSON.stringify([metadata?.supplier_route_names ?? [], metadata?.supplier_route_notes ?? {}])
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
  const [expandedMobileSections, setExpandedMobileSections] = useState<string[]>([])
  const [batchPending, startBatchTransition] = useTransition()
  const sourceItems = originalItems
  const organizationInProgress = ["queued", "processing", "retrying"].includes(organizationStatus)
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
  const orderedSuppliers = useMemo(() => [...suppliers].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true })), [suppliers])

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

  function toggleMobileSection(sectionId: string) {
    setExpandedMobileSections((current) => current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId])
  }

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="request-items-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Step 1 · Request workspace</p>
          <h2 id="request-items-heading" className="text-lg font-bold">Request items</h2>
          <p className="text-xs text-slate-500">Quantity, item details, and only the information still missing.</p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <OriginalRequestItemEditor requestId={requestId} mode="add" />
          <details className="group relative">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]"><FileText className="h-3.5 w-3.5" />Documents <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{attachments.length}</span></summary>
            <div className="absolute right-0 top-[calc(100%+.4rem)] z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"><RequestAttachmentUploader requestId={requestId} compact />{attachments.length ? <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border-t border-slate-100 pt-2">{attachments.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{file.file_name}</span>)}</div> : <p className="mt-2 text-[10px] text-slate-500">No documents attached.</p>}</div>
          </details>
          {organizationInProgress ? <MaterialOrganizationStatus status={organizationStatus} /> : <>{organizationStatus === "failed" ? <MaterialOrganizationStatus status="failed" /> : null}<OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} compact /></>}
        </div>
      </div>

      {organizationCompletedLabel ? <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold text-slate-400">Last AI review: {organizationCompletedLabel} ET</p> : null}
      <p className="sr-only" role="status" aria-live="polite">{copyNotice}</p>
      {items.length ? <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50/70 p-2 sm:hidden"><button type="button" onClick={() => copyList("original")} disabled={!sourceItems.length} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 disabled:opacity-40" aria-label="Copy original request column">{copied === "original" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied === "original" ? "Copied" : "Copy original"}</button><button type="button" onClick={() => copyList("ai")} disabled={!organizedItems.length || !aiCoversEverySource} title={aiCoversEverySource ? "Copy the AI organized column" : "Complete AI organization for every original item first"} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-[11px] font-bold text-[#0066cc] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" aria-label="Copy AI organized column">{copied === "ai" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied === "ai" ? "Copied" : aiCoversEverySource ? "Copy AI" : "AI incomplete"}</button></div> : null}
      {selectedRouteIds.length ? <div className="grid gap-2 border-b border-sky-200 bg-sky-50 p-3 sm:grid-cols-[auto_12rem_minmax(10rem,1fr)_auto] sm:items-center sm:p-2"><span className="text-xs font-bold text-sky-900 sm:text-[10px]">Route {selectedRouteIds.length} selected</span><select value={batchSupplier} onChange={(event) => setBatchSupplier(event.target.value)} className="h-11 rounded-md border border-sky-200 bg-white px-2 text-xs font-semibold sm:h-9 sm:text-[11px]"><option value="">Choose supplier…</option>{orderedSuppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select><input value={batchManual} onChange={(event) => setBatchManual(event.target.value)} placeholder="Or type supplier names" className="h-11 rounded-md border border-sky-200 px-2 text-xs sm:h-9 sm:text-[11px]" /><button type="button" onClick={applyBatchRoute} disabled={batchPending || (!batchSupplier && !batchManual.trim())} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-40 sm:h-9 sm:text-[11px]"><Route className="h-3.5 w-3.5" />Apply</button>{batchFeedback ? <p className="text-[10px] font-bold text-rose-700 sm:col-span-4">{batchFeedback}</p> : null}</div> : null}

      {items.length ? (
        <div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3] sm:overflow-x-auto sm:overscroll-x-contain" tabIndex={0} aria-label="Request, AI, and supplier comparison">
          <table className="block w-full border-collapse text-left sm:table sm:min-w-[58rem] sm:table-fixed">
            <thead className="hidden sm:table-header-group">
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
            <tbody className="block space-y-3 bg-slate-100/70 p-3 sm:table-row-group sm:divide-y sm:divide-slate-100 sm:space-y-0 sm:bg-transparent sm:p-0">
              {rows.map(({ item, sourceItem, showSource, hasAi }) => {
                const status = materialReviewStatus(item)
                const reasons = materialReviewReasons(item)
                const missing = status !== "ready" && reasons.length > 0
                const priceOpen = priceItemId === item.id
                const originalSectionId = `mobile-original-${item.id}`
                const missingSectionId = `mobile-missing-${item.id}`
                const originalExpanded = expandedMobileSections.includes(originalSectionId)
                const missingExpanded = expandedMobileSections.includes(missingSectionId)
                return (
                  <tr key={item.id} className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:table-row sm:overflow-visible sm:rounded-none sm:border-0 sm:align-middle sm:shadow-none">
                    <td className="order-2 block border-t border-slate-100 bg-white p-0 sm:table-cell sm:px-3 sm:py-1.5 md:sticky md:left-0 md:z-10 md:shadow-[6px_0_10px_-10px_rgba(15,23,42,.35)]">
                      <button type="button" onClick={() => toggleMobileSection(originalSectionId)} aria-expanded={originalExpanded} aria-controls={originalSectionId} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left sm:hidden"><span><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Original request</span><span className="line-clamp-1 text-xs font-semibold text-slate-700">{sourceItem?.name ?? "Original link unavailable"}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${originalExpanded ? "rotate-180" : ""}`} /></button>
                      <div id={originalSectionId} className={`${originalExpanded ? "block" : "hidden"} border-t border-slate-100 px-3 py-3 ${showSource ? "sm:block" : "sm:hidden"} sm:border-0 sm:p-0`}>
                        {sourceItem ? <><div className={`mb-0.5 items-center justify-between gap-2 ${showSource ? "sm:flex" : "sm:hidden"}`}><label className="hidden items-center gap-1 text-[9px] font-bold text-slate-500 sm:inline-flex"><input type="checkbox" checked={selectedRouteIds.includes(item.id)} onChange={(event) => setSelectedRouteIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} />Route</label><span className="text-[9px] font-semibold text-slate-400">Click item to edit</span></div><OriginalRequestItemEditor requestId={requestId} item={sourceItem} trigger="content"><div className="p-1 sm:p-0"><p className="text-sm font-extrabold tabular-nums text-slate-950">{materialQuantity(sourceItem)} <span className="text-xs font-semibold text-slate-500">{materialSalesUnit(sourceItem)}</span></p><p className="text-sm font-bold leading-4 text-slate-950">{sourceItem.name}</p>{itemDetails(sourceItem) ? <p title={itemDetails(sourceItem)} className="mt-0.5 line-clamp-2 cursor-help text-xs leading-4 text-slate-500">{itemDetails(sourceItem)}</p> : null}</div></OriginalRequestItemEditor></> : <p className="text-xs font-semibold text-amber-700">Original link unavailable</p>}
                      </div>
                      {sourceItem && !showSource ? <p className="hidden text-xs font-semibold text-slate-400 sm:block">Same original item</p> : null}
                    </td>
                    <td className="order-1 block px-3 py-3 sm:table-cell sm:border-l sm:border-slate-100 sm:py-1.5">
                      <div className="mb-2 flex min-h-11 items-center justify-between gap-3 sm:hidden"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[.08em] ${hasAi ? "bg-sky-50 text-[#0066cc]" : "bg-slate-100 text-slate-500"}`}>{hasAi ? "AI organized" : "Awaiting AI"}</span><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 text-xs font-bold text-slate-700"><input type="checkbox" checked={selectedRouteIds.includes(item.id)} onChange={(event) => setSelectedRouteIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} className="h-5 w-5 rounded border-slate-300 accent-[#0071e3]" />Route</label></div>
                      {hasAi ? <><OriginalRequestItemEditor requestId={requestId} item={item} itemKind="organized" trigger="content"><div className="p-1 sm:p-0"><p className="text-xl font-extrabold tabular-nums text-slate-950 sm:text-sm">{materialQuantity(item)} <span className="text-sm font-semibold text-slate-500 sm:text-xs">{materialSalesUnit(item)}</span></p><p className="mt-0.5 text-base font-bold leading-5 text-slate-950 sm:mt-0 sm:text-sm sm:leading-4">{item.name}</p>{itemDetails(item) ? <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-0.5 sm:line-clamp-2 sm:leading-4">{itemDetails(item)}</p> : null}</div></OriginalRequestItemEditor><button type="button" onClick={() => setPriceItemId(priceOpen ? null : item.id)} aria-expanded={priceOpen} className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc] sm:min-h-6 sm:text-[11px]"><Search className="h-3.5 w-3.5" />Online prices</button>{priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}</> : <p className="text-xs font-semibold text-slate-400">Not organized yet</p>}
                    </td>
                    <td aria-label={!missing ? "No missing information — Ready" : undefined} className={`order-3 block border-t border-slate-100 p-0 sm:table-cell sm:border-l sm:px-3 sm:py-1.5 ${missing ? "bg-amber-50/70" : ""}`}>
                      <button type="button" onClick={() => toggleMobileSection(missingSectionId)} aria-expanded={missingExpanded} aria-controls={missingSectionId} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left sm:hidden"><span className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Missing info / AI notes</span><span className={`inline-flex items-center gap-1 text-[10px] font-bold ${missing ? "text-amber-800" : "text-emerald-700"}`}>{missing ? `${reasons.length} to review` : "Ready"}<ChevronDown className={`h-4 w-4 transition-transform ${missingExpanded ? "rotate-180" : ""}`} /></span></button>
                      {missing ? (
                        <div id={missingSectionId} className={`${missingExpanded ? "block" : "hidden"} border-t border-amber-100 px-3 py-3 sm:block sm:border-0 sm:p-0`}>
                          <div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-white px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{reason}</span>)}</div>
                          <div className="mt-2 max-sm:[&_button]:min-h-11 max-sm:[&_label]:min-h-11 max-sm:[&_select]:min-h-11"><span className="sr-only">Ask AI</span><MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /></div>
                        </div>
                      ) : <div id={missingSectionId} className={`${missingExpanded ? "block" : "hidden"} border-t border-slate-100 px-3 py-3 text-xs font-semibold text-emerald-700 sm:hidden`}>No missing information. This item is ready.</div>}
                    </td>
                    <td className="order-4 block border-t border-slate-100 px-3 py-3 sm:table-cell sm:border-l sm:px-2 sm:py-1.5"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500 sm:hidden">Supplier route</p><div className="max-sm:[&_button]:min-h-11 max-sm:[&_input:not([type])]:min-h-11 max-sm:[&_label]:min-h-11 max-sm:[&_select]:min-h-11"><RequestSupplierRouteEditor key={`${item.id}-${supplierRouteVersion(item.metadata)}`} requestId={requestId} itemId={item.id} itemIds={items.map((requestItem) => requestItem.id)} metadata={item.metadata} suppliers={orderedSuppliers} /></div></td>
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
