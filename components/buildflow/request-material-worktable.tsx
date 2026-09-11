"use client"

import { ChevronDown, Copy, ExternalLink, FileText, Layers3, MoreHorizontal, Route, Search, Sparkles } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { openRequestPricingComparisonAction } from "@/app/admin/supplier-quotes/actions"
import { addDiscoveredSupplierNetworkAction } from "@/app/admin/supplier-network/actions"
import { moveRequestItemDepartmentAction, saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { MaterialOrganizationStatus } from "@/components/buildflow/material-organization-status"
import { MaterialReviewEditor } from "@/components/buildflow/material-review-editor"
import { RequestMaterialIdentity } from "@/components/buildflow/request-material-identity"
import { OrganizeMaterialListButton } from "@/components/buildflow/organize-material-list-button"
import { OriginalRequestItemEditor } from "@/components/buildflow/original-request-item-editor"
import { RequestAttachmentUploader } from "@/components/buildflow/request-attachment-uploader"
import { RequestAttachmentSourceControl } from "@/components/buildflow/request-attachment-source-control"
import { RequestSubstepFunnel } from "@/components/buildflow/request-substep-funnel"
import { RequestWorkflowStatusButton } from "@/components/buildflow/request-workflow-step-toggle"
import { RequestSupplierRouteEditor, type RequestRouteSupplier } from "@/components/buildflow/request-supplier-route-editor"
import { type RequestSupplierComparisonItem, type RequestSupplierComparisonSupplier } from "@/components/buildflow/request-supplier-comparison"
import { cleanMaterialRequestDetails, materialQuantity, materialReviewReasons, materialReviewStatus, materialSalesUnit, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"
import { realPhotoForMaterialCategory } from "@/lib/material-photo-catalog"
import { requestItemFieldSummary } from "@/lib/request-item-fields"
import { isRequestIntakePlaceholder } from "@/lib/request-intake-placeholder"
import type { SupplierDiscoveryCandidate } from "@/lib/supplier-discovery"
import { supplierIdentityKeys } from "@/lib/supplier-identity"
import type { RequestWorkflowSubstepId } from "@/lib/request-workflow-substeps"

export type RequestWorktableComparison = {
  id: string
  title: string
  href: string
  items: RequestSupplierComparisonItem[]
  suppliers: RequestSupplierComparisonSupplier[]
}

function itemDetails(item: ReviewableMaterialItem) {
  const metadata = item.metadata ?? {}
  const requestDetails = cleanMaterialRequestDetails(metadata.request_details)
  return [...new Set([...requestItemFieldSummary(metadata), requestDetails].filter(Boolean))].join(" · ")
}

function isRawFreeTextContainer(item: ReviewableMaterialItem) {
  return isRequestIntakePlaceholder(item)
}

function copyText(items: ReviewableMaterialItem[]) {
  return items.map((item) => [
    `${materialQuantity(item)} ${materialSalesUnit(item)}`,
    item.name,
    itemDetails(item),
  ].filter(Boolean).join(" | ")).join("\n")
}

function similarItemGroupLabel(item: ReviewableMaterialItem) {
  const department = item.department?.trim()
  if (department) return department.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

  const name = item.name.toLocaleLowerCase()
  const groups = [
    ["Plumbing", ["valve", "meter", "pipe", "fitting", "faucet", "toilet", "drain", "strainer", "pressure zone"]],
    ["Electrical", ["wire", "breaker", "outlet", "switch", "panel", "fixture"]],
    ["Flooring", ["floor", "vinyl", "tile", "carpet", "underlayment"]],
    ["Framing", ["lumber", "stud", "joist", "plywood", "osb"]],
    ["Drywall", ["drywall", "sheetrock", "compound", "corner bead"]],
    ["Paint", ["paint", "primer", "stain", "coating"]],
  ] as const
  return groups.find(([, keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[0] ?? "Other materials"
}

function supplierRouteSummary(metadata: Record<string, unknown> | null | undefined) {
  return Array.isArray(metadata?.supplier_route_names)
    ? metadata.supplier_route_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())).join(" · ")
    : ""
}

function itemReferencePhoto(item: ReviewableMaterialItem) {
  const name = item.name.toLocaleLowerCase()
  const productReferences = [
    { keywords: ["reduced-pressure-zone", "reduced pressure zone", "rpz", "backflow"], imageUrl: "/images/materials/request-reference/rpz-assembly.webp" },
    { keywords: ["capped test tee", "test tee"], imageUrl: "/images/materials/request-reference/capped-test-tee.webp" },
    { keywords: ["outlet control valve", "outlet valve"], imageUrl: "/images/materials/request-reference/outlet-control-valve.webp" },
    { keywords: ["inlet control valve", "inlet valve"], imageUrl: "/images/materials/request-reference/inlet-control-valve.webp" },
    { keywords: ["water meter", "mach 10"], imageUrl: "/images/materials/request-reference/water-meter.webp" },
    { keywords: ["strainer"], imageUrl: "/images/materials/request-reference/y-strainer.webp" },
  ]
  const productReference = productReferences.find((entry) => entry.keywords.some((keyword) => name.includes(keyword)))
  if (productReference) return { ...realPhotoForMaterialCategory("Plumbing"), imageUrl: productReference.imageUrl }

  const group = similarItemGroupLabel(item)
  const category = group === "Framing" ? "Lumber" : group === "Paint" || group === "Other materials" ? "Materials" : group
  return realPhotoForMaterialCategory(category)
}

type RequestWorktableAttachment = {
  id: string
  item_id?: string | null
  file_name: string
  file_type?: string | null
  url: string | null
}

function itemPhoto(item: ReviewableMaterialItem, attachments: RequestWorktableAttachment[]) {
  const metadata = item.metadata ?? {}
  const verifiedImageUrl = typeof metadata.verified_product_image_url === "string" ? metadata.verified_product_image_url.trim() : ""
  if (verifiedImageUrl && metadata.product_image_verified === true) {
    return { imageUrl: verifiedImageUrl, label: "VERIFIED", description: "Verified manufacturer product image" }
  }

  const sourceItemId = typeof metadata.source_item_id === "string" ? metadata.source_item_id : ""
  const clientImage = attachments.find((attachment) =>
    Boolean(attachment.url)
    && Boolean(attachment.file_type?.startsWith("image/"))
    && (attachment.item_id === item.id || Boolean(sourceItemId && attachment.item_id === sourceItemId)))
  if (clientImage?.url) {
    return { imageUrl: clientImage.url, label: "CLIENT", description: `Client attachment: ${clientImage.file_name}` }
  }

  return { imageUrl: itemReferencePhoto(item).imageUrl, label: "REF", description: "Reference only — verify the exact product before ordering" }
}

export function RequestMaterialWorktable({
  requestId,
  originalItems,
  organizedItems,
  defaultZipCode = "11516",
  organizationStatus,
  organizationCompletedLabel,
  currentSubstep,
  supplierComparisons,
  suppliers,
  attachments,
  stepCompleted = false,
}: {
  requestId: string
  originalItems: ReviewableMaterialItem[]
  organizedItems: ReviewableMaterialItem[]
  defaultZipCode?: string
  organizationStatus: string
  organizationCompletedLabel?: string
  currentSubstep: RequestWorkflowSubstepId
  supplierComparisons: RequestWorktableComparison[]
  suppliers: RequestRouteSupplier[]
  attachments: RequestWorktableAttachment[]
  stepCompleted?: boolean
}) {
  const router = useRouter()
  const [savedItems, setSavedItems] = useState<Record<string, ReviewableMaterialItem>>({})
  const [dirtyRoutes, setDirtyRoutes] = useState<Record<string, boolean>>({})
  const routingBusy = Object.values(dirtyRoutes).some(Boolean)
  function routeDirty(key: string, dirty: boolean) {
    setDirtyRoutes((current) => current[key] === dirty ? current : { ...current, [key]: dirty })
  }
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const [copied, setCopied] = useState<"original" | "ai" | null>(null)
  const [copyNotice, setCopyNotice] = useState("")
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [batchSuppliers, setBatchSuppliers] = useState<string[]>([])
  const [batchFeedback, setBatchFeedback] = useState("")
  const [discoveryZip, setDiscoveryZip] = useState(defaultZipCode)
  const [discoveryResults, setDiscoveryResults] = useState<SupplierDiscoveryCandidate[]>([])
  const [discoveryError, setDiscoveryError] = useState("")
  const [discoveryPending, setDiscoveryPending] = useState(false)
  const [comparisonFeedback, setComparisonFeedback] = useState("")
  const [groupSimilar, setGroupSimilar] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([])
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [moveFeedback, setMoveFeedback] = useState("")
  const [batchPending, startBatchTransition] = useTransition()
  const [comparisonPending, startComparisonTransition] = useTransition()
  const [movePending, startMoveTransition] = useTransition()
  const sourceItems = originalItems
  const rawDraft = sourceItems.find(isRawFreeTextContainer) ?? null
  const rawDraftText = rawDraft ? String(rawDraft.metadata?.request_details ?? "").replace(/\\n/g, "\n").trim() : ""
  const draftChanged = rawDraft?.metadata?.ai_organization_status === "draft_changed"
  const organizationInProgress = ["queued", "processing", "retrying"].includes(organizationStatus)
  const aiItems = organizedItems.map((item) => savedItems[item.id] ?? item)
  const representedSourceIds = new Set(aiItems.map((item) => typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : "").filter(Boolean))
  const comparisonSources = aiItems.length
    ? sourceItems.filter((item) => !isRawFreeTextContainer(item))
    : sourceItems
  const aiCoversEverySource = comparisonSources.every((item) => representedSourceIds.has(item.id))
  const items = aiItems.length
    ? [...aiItems, ...originalItems.filter((item) => !representedSourceIds.has(item.id) && !isRawFreeTextContainer(item))]
    : originalItems.filter((item) => !isRawFreeTextContainer(item))
  const originalById = new Map(sourceItems.map((item) => [item.id, item]))
  const rows = items.map((item) => {
    const sourceItemId = typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : ""
    const hasAi = item.metadata?.ai_organized === true
    const sourceItem = hasAi ? originalById.get(sourceItemId) ?? null : item
    return { item, sourceItem, hasAi }
  })
  const missingItemCount = rows.filter(({ item }) => materialReviewStatus(item) !== "ready" && materialReviewReasons(item).length > 0).length
  const rowGroups = groupSimilar
    ? [...rows.reduce((groups, row) => {
      const label = similarItemGroupLabel(row.item)
      groups.set(label, [...(groups.get(label) ?? []), row])
      return groups
    }, new Map<string, typeof rows>()).entries()].map(([label, groupedRows]) => ({ label, rows: groupedRows }))
    : [{ label: "All items", rows }]
  const orderedSuppliers = useMemo(() => [...suppliers].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true })), [suppliers])
  const departmentOptions = [...new Set(["Unassigned", "Plumbing", "Electrical", "Flooring", "Framing", "Drywall", "Paint", "Other materials", ...rowGroups.map((group) => group.label)])]

  function moveItemToDepartment(item: ReviewableMaterialItem, department: string) {
    if (!department || similarItemGroupLabel(item) === department || movePending || routingBusy) return
    setMoveFeedback("")
    startMoveTransition(async () => {
      const result = await moveRequestItemDepartmentAction({ requestId, itemId: item.id, department })
      if (!result.ok) {
        setMoveFeedback(result.error)
        return
      }
      setSavedItems((current) => ({ ...current, [item.id]: { ...item, department: result.department } }))
      setMoveFeedback(`${item.name} moved to ${result.department}.`)
      setDraggedItemId(null)
      router.refresh()
    })
  }

  function applyBatchRoute() {
    if (routingBusy) return
    const names = [...new Set(batchSuppliers.map((name) => name.trim()).filter(Boolean))]
    setBatchFeedback("")
    startBatchTransition(async () => {
      const selectedDiscovered = discoveryResults.filter((supplier) => names.includes(supplier.name))
      for (const supplier of selectedDiscovered) {
        const selectedItems = rows.filter(({ item }) => selectedRouteIds.includes(item.id)).map(({ item }) => item)
        const result = await addDiscoveredSupplierNetworkAction({
          name: supplier.name,
          url: supplier.url,
          summary: supplier.summary,
          department: selectedItems.map(similarItemGroupLabel).filter((value, index, all) => all.indexOf(value) === index).join(", ").slice(0, 100) || "Building materials",
          zipCode: discoveryZip,
          reviewConfirmed: true,
        })
        if (!result.ok) { setBatchFeedback(result.error); return }
      }
      const result = await saveRequestItemSupplierRouteAction({ requestId, itemIds: selectedRouteIds, supplierNames: names, mode: "batch", expectedRouteRevisions: Object.fromEntries(rows.filter(({ item }) => selectedRouteIds.includes(item.id)).map(({ item }) => [item.id, Number(item.metadata?.supplier_route_revision ?? 0)])) })
      if (!result.ok) { setBatchFeedback(result.error); return }
      setSelectedRouteIds([])
      setBatchSuppliers([])
      setDiscoveryResults([])
      setBatchFeedback("Supplier route saved.")
      router.refresh()
    })
  }

  function toggleBatchSupplier(name: string) {
    setBatchSuppliers((current) => current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name])
  }

  async function discoverFiveSuppliers() {
    if (!/^\d{5}$/.test(discoveryZip)) {
      setDiscoveryError("Enter a valid 5-digit ZIP code.")
      return
    }
    const selectedItems = rows.filter(({ item }) => selectedRouteIds.includes(item.id)).map(({ item }) => item)
    if (!selectedItems.length) {
      setDiscoveryError("Select at least one material item first.")
      return
    }
    setDiscoveryPending(true)
    setDiscoveryError("")
    setDiscoveryResults([])
    try {
      const department = selectedItems.map((item) => `${similarItemGroupLabel(item)}: ${item.name}`).join(", ").slice(0, 100)
      const alreadyRequested = rows.flatMap(({ item }) => Array.isArray(item.metadata?.supplier_route_names) ? item.metadata.supplier_route_names.filter((name): name is string => typeof name === "string") : [])
      const excludeIdentities = [...new Set([...alreadyRequested, ...batchSuppliers].flatMap((name) => supplierIdentityKeys({ name })))]
      const response = await fetch("/api/admin/suppliers/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, zipCode: discoveryZip, excludeIdentities, provider: "primary", limit: 5 }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; suppliers?: SupplierDiscoveryCandidate[]; fallbackAvailable?: boolean }
      if (!response.ok || !payload.ok) {
        setDiscoveryError(payload.fallbackAvailable ? `${payload.error || "Search unavailable"} Exa was not used because it requires your approval.` : payload.error || "Supplier search is temporarily unavailable.")
        return
      }
      setDiscoveryResults(payload.suppliers ?? [])
      if (!(payload.suppliers ?? []).length) setDiscoveryError("No new verified supplier candidates were found after duplicate checks.")
    } catch {
      setDiscoveryError("Supplier search is temporarily unavailable.")
    } finally {
      setDiscoveryPending(false)
    }
  }

  function openSynchronizedComparison(comparisonId: string) {
    if (routingBusy) {
      setComparisonFeedback("Finish saving supplier choices before opening comparison.")
      return
    }
    setComparisonFeedback("")
    startComparisonTransition(async () => {
      const result = await openRequestPricingComparisonAction(requestId, comparisonId)
      if (!result.ok) {
        setComparisonFeedback(result.error)
        return
      }
      router.push(`/admin/quote-comparison/${result.data.comparisonId}`)
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

  function toggleExpandedItem(itemId: string) {
    if (routingBusy) return
    setExpandedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])
  }

  function selectGroup(itemIds: string[]) {
    if (routingBusy) return
    setSelectedRouteIds((current) => itemIds.every((id) => current.includes(id))
      ? current.filter((id) => !itemIds.includes(id))
      : [...new Set([...current, ...itemIds])])
  }

  return (
    <section className="relative mt-3 rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="request-items-heading">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Step 1</p>
          <h2 id="request-items-heading" tabIndex={-1} className="scroll-mt-24 truncate text-base font-bold">Request items</h2>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
        <RequestWorkflowStatusButton key={`${requestId}:${stepCompleted}`} requestId={requestId} step={1} completed={stepCompleted} />
        <details className="group relative shrink-0">
          <summary className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Request tools"><MoreHorizontal className="h-4 w-4" /></summary>
          <div className="absolute right-0 top-[calc(100%+.4rem)] z-40 grid w-[min(24rem,calc(100vw-2rem))] gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Request tools</p>
            <div className="flex flex-wrap gap-2"><OriginalRequestItemEditor requestId={requestId} mode="add" />{!rawDraft ? organizationInProgress ? <MaterialOrganizationStatus status={organizationStatus} /> : <>{organizationStatus === "failed" ? <MaterialOrganizationStatus status="failed" /> : null}<OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} compact /></> : null}</div>
            {items.length ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => copyList("original")} disabled={!sourceItems.length} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 disabled:opacity-40"><Copy className="h-3.5 w-3.5" />{copied === "original" ? "Copied" : "Copy original"}</button><button type="button" onClick={() => copyList("ai")} disabled={!organizedItems.length || !aiCoversEverySource} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 text-[10px] font-bold text-[#0066cc] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"><Copy className="h-3.5 w-3.5" />{copied === "ai" ? "Copied" : "Copy AI"}</button></div> : null}
            <div className="border-t border-slate-100 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><FileText className="h-3.5 w-3.5" />Client request files <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{attachments.length}</span></div>
                <RequestAttachmentUploader requestId={requestId} compact />
              </div>
              {attachments.length ? <div className="mt-2 grid max-h-36 gap-1.5 overflow-y-auto">{attachments.map((file) => <div key={file.id} className="flex min-w-0 items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1">
                {file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate px-1 text-[10px] font-bold text-[#0066cc]">{file.file_name}</a> : <span className="min-w-0 flex-1 truncate px-1 text-[10px] font-bold text-slate-500">{file.file_name}</span>}
                <RequestAttachmentSourceControl requestId={requestId} attachmentId={file.id} currentSource="client" />
              </div>)}</div> : <p className="mt-2 text-[10px] text-slate-500">No files received from the client.</p>}
              <p className="mt-1 text-[9px] text-slate-400">Supplier quotes and supplier photos belong in Step 2.</p>
            </div>
          </div>
        </details>
        </div>
      </div>

      {!rawDraft || aiItems.length > 0 ? <RequestSubstepFunnel requestId={requestId} step={1} currentSubstep={currentSubstep} /> : null}

      {rawDraft ? <div data-testid="original-request-draft" className="border-b border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-500">Original list</p><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${draftChanged ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{draftChanged ? "AI needs refresh" : "Saved"}</span></div><p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-700">{rawDraftText || "The request is in the attached photo or document."}</p></div><OriginalRequestItemEditor requestId={requestId} item={rawDraft} buttonLabel="Edit original" /></div>
        {attachments.length ? <div className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-0.5" aria-label="Request photos and documents">{attachments.slice(0, 4).map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="max-w-44 shrink-0 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="max-w-44 shrink-0 truncate rounded-md bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500">{file.file_name}</span>)}</div> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">{organizationInProgress ? <MaterialOrganizationStatus status={organizationStatus} /> : !aiItems.length || draftChanged || organizationStatus === "failed" ? <><p className="text-xs text-slate-600">{organizationStatus === "failed" ? "Your original is safe. Splitting did not finish." : "Split into products, quantities and sizes."}</p><OrganizeMaterialListButton requestId={requestId} refresh={organizedItems.length > 0} compact /></> : <p className="text-xs font-semibold text-emerald-700">{aiItems.length} products extracted</p>}</div>
      </div> : null}

      {!rawDraft && sourceItems.length ? <details className="group border-b border-slate-200 bg-slate-50/70">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 sm:px-4"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-500">Original list · {sourceItems.length} items</p><p className="truncate text-[10px] text-slate-500">Open to compare with the AI-organized version.</p></div><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" /></summary>
        <div className="grid gap-1 border-t border-slate-200 px-3 py-2 sm:px-4">{sourceItems.map((sourceItem, index) => <OriginalRequestItemEditor key={sourceItem.id} requestId={requestId} item={sourceItem} trigger="content"><div className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1"><span className="w-5 shrink-0 text-[9px] font-bold text-slate-400">#{index + 1}</span><span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-800">{sourceItem.name}</span><span className="shrink-0 text-[10px] font-semibold text-slate-500">{materialQuantity(sourceItem)} {materialSalesUnit(sourceItem)}</span></div></OriginalRequestItemEditor>)}</div>
      </details> : null}

      {organizationCompletedLabel && aiItems.length > 0 && !organizationInProgress ? <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-semibold text-slate-400">Last AI review: {organizationCompletedLabel} ET</p> : null}
      {aiItems.length ? <div className="flex flex-col gap-2 border-b border-sky-100 bg-sky-50/55 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5"><Sparkles className="h-4 w-4 shrink-0 text-[#b8860b]" /><div className="min-w-0"><p className="text-xs font-extrabold text-slate-900">AI split {aiItems.length} items{missingItemCount ? <span className="text-amber-700"> · {missingItemCount} missing details</span> : <span className="text-emerald-700"> · ready to route</span>}</p><p className="truncate text-[10px] text-slate-500">Review, edit, then send each group to the right supplier.</p></div></div>
        <div className="flex gap-1.5"><button type="button" onClick={() => setExpandedItemIds(rows.filter(({ item }) => materialReviewStatus(item) !== "ready" && materialReviewReasons(item).length > 0).map(({ item }) => item.id))} disabled={!missingItemCount} className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 disabled:opacity-40">Review missing</button><button type="button" disabled={routingBusy} aria-pressed={groupSimilar} onClick={() => setGroupSimilar((value) => !value)} className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-bold ${groupSimilar ? "border-sky-300 bg-sky-100 text-[#0066cc]" : "border-slate-200 bg-white text-slate-700"}`}><Layers3 className="h-3.5 w-3.5" />Group similar</button></div>
      </div> : null}
      <p className="sr-only" role="status" aria-live="polite">{copyNotice}</p>
      {moveFeedback ? <p role="status" className={`border-b px-3 py-1.5 text-[10px] font-bold ${moveFeedback.includes("could not") || moveFeedback.includes("valid") ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{moveFeedback}</p> : null}
      {selectedRouteIds.length ? <div className="grid gap-2 border-b border-sky-200 bg-sky-50 p-3">
        <div className="flex items-center justify-between"><span className="text-xs font-bold text-sky-900">{selectedRouteIds.length} products selected</span><button type="button" disabled={routingBusy} onClick={() => setSelectedRouteIds([])} className="min-h-11 px-2 text-xs font-bold text-sky-800">Clear selection</button></div>
        <RequestSupplierRouteEditor key={`${requestId}:batch:${[...selectedRouteIds].sort().join(",")}`} requestId={requestId} mode="batch" onDirtyChange={(dirty) => routeDirty("batch", dirty)} itemIds={selectedRouteIds} metadata={rows.find(({ item }) => item.id === selectedRouteIds[0])?.item.metadata} itemRouteVersions={Object.fromEntries(rows.filter(({ item }) => selectedRouteIds.includes(item.id)).map(({ item }) => [item.id, Number(item.metadata?.supplier_route_revision ?? 0)]))} suppliers={orderedSuppliers} />
        <details className="group sm:col-span-4"><summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-sky-200 bg-white px-2.5 text-[10px] font-bold text-[#0066cc]"><Sparkles className="h-3.5 w-3.5" />Generate 5 suppliers<ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary><div className="mt-1.5 grid gap-2 rounded-md border border-sky-200 bg-white p-2"><div className="flex gap-1.5"><input aria-label="Supplier search ZIP code" inputMode="numeric" maxLength={5} value={discoveryZip} onChange={(event) => setDiscoveryZip(event.target.value.replace(/\D/g, "").slice(0, 5))} className="h-9 w-24 rounded-md border border-slate-300 px-2 text-xs font-bold" /><button type="button" onClick={discoverFiveSuppliers} disabled={discoveryPending} className="h-9 rounded-md bg-slate-950 px-3 text-[10px] font-bold text-white disabled:opacity-50">{discoveryPending ? "Finding…" : "Generate 5"}</button><p className="self-center text-[9px] text-slate-500">Matches selected items. Existing and previously requested suppliers are removed.</p></div>{discoveryResults.length ? <fieldset className="grid gap-1" aria-label="Review generated suppliers">{discoveryResults.map((supplier) => <label key={supplier.identity} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2"><input type="checkbox" checked={batchSuppliers.includes(supplier.name)} onChange={() => toggleBatchSupplier(supplier.name)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-slate-800">{supplier.name}</span><span className="block truncate text-[9px] text-slate-500">{supplier.summary || supplier.domain}</span></span><a href={supplier.url} target="_blank" rel="noreferrer" aria-label={`Open source for ${supplier.name}`} className="inline-flex h-8 w-8 items-center justify-center text-[#0066cc]"><ExternalLink className="h-3.5 w-3.5" /></a></label>)}</fieldset> : null}{discoveryError ? <p role="alert" className="text-[10px] font-bold text-rose-700">{discoveryError}</p> : null}<p className="text-[9px] text-slate-400">New suppliers are added only after confirmation. No messages are sent.</p>{discoveryResults.length ? <button type="button" onClick={applyBatchRoute} disabled={batchPending || !batchSuppliers.length} className="min-h-11 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40">Add selected suppliers</button> : null}</div></details>
        {batchFeedback ? <p role="status" className="text-xs font-semibold text-slate-700">{batchFeedback}</p> : null}
      </div> : null}

      {items.length ? (
        <div className="grid gap-3 bg-slate-50/70 p-2.5 sm:p-3" aria-label="AI organized request items">
          {rowGroups.map((group) => {
            const groupIds = group.rows.map(({ item }) => item.id)
            const allSelected = groupIds.every((id) => selectedRouteIds.includes(id))
            const groupExpanded = expandedGroups.includes(group.label)
            const visibleRows = groupExpanded ? group.rows : group.rows.slice(0, 3)
            return <section key={group.label} onDragOver={(event) => { if (draggedItemId) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); const row = rows.find(({ item }) => item.id === draggedItemId); if (row) moveItemToDepartment(row.item, group.label) }} className={`overflow-hidden rounded-lg border bg-white transition ${draggedItemId ? "border-sky-300" : "border-slate-200"}`}>
              {groupSimilar ? <header className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3"><div className="flex min-w-0 items-center gap-2"><Layers3 className="h-3.5 w-3.5 text-[#0066cc]" /><p className="truncate text-[11px] font-extrabold text-slate-800">{group.label}</p><span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200">{group.rows.length}</span>{draggedItemId ? <span className="text-[9px] font-bold text-[#0066cc]">Drop here</span> : null}</div><button type="button" disabled={routingBusy} onClick={() => selectGroup(groupIds)} className="h-8 rounded-md px-2 text-[10px] font-bold text-[#0066cc]">{allSelected ? "Clear group" : "Select group"}</button></header> : null}
              {groupSimilar ? <div className="border-b border-slate-100 px-3 py-2"><RequestSupplierRouteEditor key={`${requestId}:group:${group.label}`} requestId={requestId} mode="group" onDirtyChange={(dirty) => routeDirty(`group:${group.label}`, dirty)} groupMetadata={group.rows.find(({ item }) => item.metadata?.supplier_route_group_key === group.label.toLowerCase() && item.metadata?.supplier_route_group_default)?.item.metadata} groupKey={group.label} itemIds={groupIds} metadata={group.rows[0]?.item.metadata} itemRouteVersions={Object.fromEntries(group.rows.map(({ item }) => [item.id, Number(item.metadata?.supplier_route_revision ?? 0)]))} suppliers={orderedSuppliers} /></div> : null}
              <div className="divide-y divide-slate-100">{visibleRows.map(({ item, sourceItem, hasAi }, index) => {
                const reasons = materialReviewReasons(item)
                const missing = materialReviewStatus(item) !== "ready" && reasons.length > 0
                const expanded = expandedItemIds.includes(item.id)
                const priceOpen = priceItemId === item.id
                const allFields = requestItemFieldSummary(item.metadata)
                const details = allFields.slice(0, 4)
                const generalNotes = cleanMaterialRequestDetails(item.metadata?.request_details)
                const routeSummary = supplierRouteSummary(item.metadata)
                const routeLabel = item.metadata?.supplier_route_mode === "group" && item.metadata?.supplier_route_group_key === similarItemGroupLabel(item).toLowerCase() ? "Group suppliers" : routeSummary ? "Custom suppliers" : ""
                const photo = itemPhoto(item, attachments)
                return <article key={item.id} draggable={groupSimilar && !movePending && !routingBusy} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedItemId(item.id) }} onDragEnd={() => setDraggedItemId(null)} className={draggedItemId === item.id ? "opacity-50" : ""}>
                  <div className="grid min-h-14 grid-cols-[2.5rem_3rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-2 py-2 sm:grid-cols-[2.5rem_2rem_3rem_minmax(13rem,1.4fr)_minmax(10rem,1fr)_8rem_minmax(12rem,1fr)_2.5rem] sm:px-3">
                    <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center"><input type="checkbox" disabled={routingBusy} aria-label={`Select ${item.name}`} checked={selectedRouteIds.includes(item.id)} onChange={(event) => setSelectedRouteIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /></label>
                    <span className="hidden text-[10px] font-bold tabular-nums text-slate-400 sm:block">#{index + 1}</span>
                    <span title={photo.description} className="relative inline-flex h-10 w-12 overflow-hidden rounded-md border border-slate-200 bg-white"><Image src={photo.imageUrl} alt={photo.description} fill sizes="48px" unoptimized={photo.label !== "REF"} className="object-cover" /><span className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-px text-center text-[6px] font-black tracking-wide text-white">{photo.label}</span></span>
                    <div className="min-w-0"><RequestMaterialIdentity name={item.name} quantity={`${materialQuantity(item)} ${materialSalesUnit(item)}`} metadata={item.metadata} /><div className="mt-1 flex min-w-0 flex-wrap items-center gap-1"><OriginalRequestItemEditor requestId={requestId} item={item} itemKind={hasAi ? "organized" : "original"} buttonLabel="Details" /><span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold sm:hidden ${missing ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{missing ? `${reasons.length} missing` : "Ready"}</span>{routeLabel ? <span className="text-[9px] font-semibold text-sky-700 sm:hidden" title={routeSummary}>{routeLabel}</span> : null}</div></div>
                    <div className="hidden min-w-0 gap-1 overflow-hidden sm:flex">{details.slice(0, 2).map((detail) => <span key={detail} title={detail} className="max-w-36 truncate rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">{detail}</span>)}</div>
                    <span className={`hidden justify-self-start rounded-md px-2 py-1 text-[9px] font-extrabold sm:inline-flex ${missing ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>{missing ? `${reasons.length} missing` : "Ready"}</span>
                    <button type="button" onClick={() => toggleExpandedItem(item.id)} title={routeSummary || "Choose supplier route"} className="hidden min-w-0 items-center gap-1.5 rounded-md border border-slate-200 px-2 py-2 text-left text-[10px] font-bold text-slate-700 sm:flex"><Route className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" /><span className="truncate">{routeLabel || "Choose supplier"}</span></button>
                    <button type="button" onClick={() => toggleExpandedItem(item.id)} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Open"} ${item.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
                  </div>
                  {expanded ? <div className="border-t border-slate-100 bg-slate-50/45 p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.8fr)_minmax(16rem,.8fr)]">
                      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500">Item details</p><div className="flex items-center gap-1"><select aria-label={`Move ${item.name} to department`} value={similarItemGroupLabel(item)} onChange={(event) => moveItemToDepartment(item, event.target.value)} disabled={movePending} className="h-9 max-w-32 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700"><option value={similarItemGroupLabel(item)}>Move group…</option>{departmentOptions.filter((department) => department !== similarItemGroupLabel(item)).map((department) => <option key={department} value={department}>{department}</option>)}</select><OriginalRequestItemEditor requestId={requestId} item={item} itemKind={hasAi ? "organized" : "original"} buttonLabel="Edit details" /></div></div><p className="text-sm font-bold text-slate-900">{materialQuantity(item)} {materialSalesUnit(item)} · {item.name}</p>{allFields.length ? <div className="mt-2 flex flex-wrap gap-1.5">{allFields.map((field) => <span key={field} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">{field}</span>)}</div> : <p className="mt-1 text-[11px] text-slate-400">Add size, brand, color, shipping, or another field.</p>}{generalNotes ? <div className="mt-2 rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-200"><p className="text-[8px] font-extrabold uppercase tracking-wide text-slate-400">General notes</p><p className="mt-0.5 whitespace-pre-line text-[10px] leading-4 text-slate-600">{generalNotes}</p></div> : null}<p className="mt-1.5 text-[9px] font-semibold text-slate-400">Image: {photo.description}</p><button type="button" onClick={() => setPriceItemId(priceOpen ? null : item.id)} aria-expanded={priceOpen} className="mt-2 inline-flex h-8 items-center gap-1 text-[10px] font-bold text-[#0066cc]"><Search className="h-3.5 w-3.5" />Online prices</button>{priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(item)} department={item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceItemId(null)} /> : null}</div>
                      <div><p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500">AI review</p>{missing ? <><div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">{reason}</span>)}</div><div className="mt-2"><MaterialReviewEditor requestId={requestId} item={item} onSaved={(savedItem) => setSavedItems((current) => ({ ...current, [savedItem.id]: savedItem }))} /></div></> : <p className="text-[11px] font-semibold text-emerald-700">Nothing is missing. This item is ready.</p>}{sourceItem ? <OriginalRequestItemEditor requestId={requestId} item={sourceItem} trigger="content"><div className="mt-3 rounded-md border border-slate-200 bg-white p-2"><p className="text-[9px] font-bold uppercase text-slate-400">From original request</p><p className="mt-1 line-clamp-2 text-[10px] text-slate-600">{sourceItem.name}{itemDetails(sourceItem) ? ` · ${itemDetails(sourceItem)}` : ""}</p></div></OriginalRequestItemEditor> : null}</div>
                      <div><p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500">Suppliers for this product</p><RequestSupplierRouteEditor key={`${requestId}:item:${item.id}`} requestId={requestId} itemId={item.id} onDirtyChange={(dirty) => routeDirty(`item:${item.id}`, dirty)} groupMetadata={group.rows.find(({ item }) => item.metadata?.supplier_route_group_key === group.label.toLowerCase() && item.metadata?.supplier_route_group_default)?.item.metadata} groupKey={similarItemGroupLabel(item)} itemIds={[item.id]} metadata={item.metadata} itemRouteVersions={{ [item.id]: Number(item.metadata?.supplier_route_revision ?? 0) }} suppliers={orderedSuppliers} /></div>
                    </div>
                  </div> : null}
                </article>
              })}</div>
              {group.rows.length > 3 ? <button type="button" disabled={routingBusy} onClick={() => setExpandedGroups((current) => current.includes(group.label) ? current.filter((label) => label !== group.label) : [...current, group.label])} aria-expanded={groupExpanded} className="flex h-9 w-full items-center justify-center gap-1 border-t border-slate-100 bg-slate-50/70 text-[10px] font-bold text-[#0066cc]">{groupExpanded ? "Show less" : `Show ${group.rows.length - 3} more`}<ChevronDown className={`h-3.5 w-3.5 transition ${groupExpanded ? "rotate-180" : ""}`} /></button> : null}
            </section>
          })}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-slate-500">{rawDraft ? "Your products will appear here. Then choose suppliers by group." : "Add a list or a product to get started."}</p>
      )}

      {supplierComparisons.length ? <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">{supplierComparisons.map((comparison) => <button key={comparison.id} type="button" onClick={() => openSynchronizedComparison(comparison.id)} disabled={comparisonPending} title={comparison.title} className="inline-flex min-h-10 items-center rounded-lg border border-sky-200 bg-white px-3 text-left text-xs font-bold text-[#0066cc] disabled:opacity-50">{comparisonPending ? "Syncing comparison…" : `Open comparison · ${comparison.id.slice(0, 8).toUpperCase()}`}</button>)}{comparisonFeedback ? <span className="text-xs font-bold text-rose-700">{comparisonFeedback}</span> : null}</div> : null}
    </section>
  )
}
