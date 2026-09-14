"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveReviewedRequestItemAction } from "@/app/owner/materials/requests/item-edit-actions"
import { materialReviewReasons, materialReviewStatus, materialSearchQuery, type ReviewableMaterialItem } from "@/lib/client-material-review"
import { materialReviewRecommendation } from "@/lib/material-review-recommendations"
import { hasIncomingItemRevision, nextUnresolvedItem, readItemResume } from "@/lib/request-item-continuity"
import { requestItemFieldSummary } from "@/lib/request-item-fields"
import { OriginalRequestItemEditor } from "@/components/buildflow/original-request-item-editor"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { moveRequestItemDepartmentAction } from "@/app/owner/materials/requests/actions"

type ProductVersion = { item: ReviewableMaterialItem; source: ReviewableMaterialItem | null; revision: string }

export function RequestItemReviewList({ requestId, actorId, products, defaultZipCode = "11516" }: { requestId: string; actorId: string; products: ProductVersion[]; defaultZipCode?: string }) {
  const router = useRouter()
  const resumeKey = `avantia:step1-position:v1:${actorId}:${requestId}`
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [field, setField] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState<ProductVersion | null>(null)
  const [pendingVersion, setLatest] = useState<ProductVersion | null>(null)
  const [baselineRevision, setBaselineRevision] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [priceOpen, setPriceOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const busy = useRef(false)
  const restored = useRef(false)
  const panel = useRef<HTMLDivElement>(null)
  const current = products.find(({ item }) => item.id === selectedId) || null
  const latest = pendingVersion || (current && reviewed && hasIncomingItemRevision(current.revision, reviewed.revision, baselineRevision) ? current : null)
  const needsAttention = products.filter(({ item }) => materialReviewStatus(item) !== "ready" && materialReviewReasons(item).length)

  useEffect(() => {
    if (restored.current) return
    const frame = requestAnimationFrame(() => {
      restored.current = true
      let position = null
      try { position = readItemResume(localStorage.getItem(resumeKey), products.map(({ item }) => item.id)) } catch { /* optional browser storage */ }
      const id = position?.itemId || nextUnresolvedItem(products.map(({ item }) => item))
      const product = products.find(({ item }) => item.id === id) || null
      setSelectedId(id); setField(position?.field || null); setReviewed(product); setBaselineRevision(product?.revision || null)
    })
    return () => cancelAnimationFrame(frame)
  }, [resumeKey, products])

  useEffect(() => {
    if (!selectedId || !restored.current) return
    // Only IDs and question keys; never store request text, PDFs, prices or notes here.
    try { localStorage.setItem(resumeKey, JSON.stringify({ itemId: selectedId, field })) } catch { /* optional */ }
  }, [resumeKey, selectedId, field])

  function openProduct(id: string) {
    if (busy.current) return
    setSelectedId(id); setField(null); setReceipt(null); setFeedback(""); setLatest(null); setPriceOpen(false)
    setReviewed(products.find(({ item }) => item.id === id) || null)
    setBaselineRevision(products.find(({ item }) => item.id === id)?.revision || null)
    requestAnimationFrame(() => panel.current?.focus())
  }

  function save(choiceField?: string, value?: string, undo = false) {
    if (!reviewed || reviewed.item.metadata?.ai_organized !== true || busy.current || latest) return
    busy.current = true
    setFeedback("")
    const submitted = reviewed
    startTransition(async () => {
      try {
        const result = await saveReviewedRequestItemAction({ requestId, itemId: submitted.item.id, revision: submitted.revision, field: choiceField, value, ...(undo && receipt ? { undoReceiptId: receipt } : {}) })
        if (!result.ok) {
          setFeedback(result.error)
          if ("conflict" in result && result.conflict) setLatest({ item: result.item, source: result.source, revision: result.revision })
          return
        }
        setReviewed({ item: result.item, source: result.source, revision: result.revision })
        setReceipt(result.receiptId); setFeedback(undo ? "Edit undone" : "Saved")
        router.refresh()
      } catch { setFeedback("Not saved. Your existing product is unchanged. Try again.") }
      finally { busy.current = false }
    })
  }

  const shown = reviewed && reviewed.item.id === selectedId ? reviewed : current
  const recommendation = shown ? materialReviewRecommendation(shown.item) : null
  const choices = shown?.item.metadata?.ai_organized === true ? recommendation?.choices || [] : []
  const activeChoice = choices.find((choice) => choice.field === field) || choices[0]

  return <div className="@container w-full p-3 sm:p-4" data-testid="request-item-review-list">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-bold text-slate-900">Review your list</h3><p className="text-xs text-slate-500">{products.length} products{needsAttention.length ? ` · ${needsAttention.length} need details` : ""}</p></div>
      <button type="button" disabled={pending || !needsAttention.length} onClick={() => { const id = nextUnresolvedItem(products.map(({ item }) => item), selectedId); if (id) openProduct(id) }} className="min-h-11 rounded-lg border border-amber-200 px-3 text-xs font-bold text-amber-900 disabled:opacity-40">Next unresolved</button>
    </div>
    <div className="grid items-start gap-4 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
      <div className="order-2 min-w-0 overflow-hidden rounded-xl border border-slate-200 @3xl:order-1" aria-label="Request products">
        {products.map(({ item }) => <button key={item.id} type="button" disabled={pending} aria-pressed={selectedId === item.id} onClick={() => openProduct(item.id)} className={`flex min-h-16 w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 ${selectedId === item.id ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : "bg-white hover:bg-slate-50"}`}>
          <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{item.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{requestItemFieldSummary(item.metadata).join(" · ")}</span>{materialReviewStatus(item) !== "ready" && materialReviewReasons(item).length ? <span className="mt-1 block text-xs font-semibold text-amber-800">{materialReviewReasons(item)[0]}</span> : null}</span>
          <span className="max-w-28 shrink-0 break-words text-right text-xs font-bold text-slate-700">{item.quantity} {item.unit || "unit needed"}</span>
        </button>)}
      </div>
      <div ref={panel} tabIndex={-1} className="order-1 min-w-0 rounded-xl border border-slate-200 bg-white p-3 focus:outline-none @3xl:order-2 @3xl:sticky @3xl:top-24" aria-label="Current product review">
        {shown ? <>
          <h4 className="text-sm font-bold">{shown.item.name}</h4>
          <p className="mt-1 text-xs text-slate-600">{requestItemFieldSummary(shown.item.metadata).join(" · ")}</p>
          {latest ? <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3" role="alert">
            <p className="text-xs font-bold text-amber-950">This product or its original source changed.</p>
            <div className="mt-2 grid gap-2 text-xs"><div><span className="font-bold">You were reviewing</span><p>{shown.item.name} · {shown.item.quantity} {shown.item.unit}</p><p>{requestItemFieldSummary(shown.item.metadata).join(" · ")}</p></div><div><span className="font-bold">Latest saved version</span><p>{latest.item.name} · {latest.item.quantity} {latest.item.unit}</p><p>{requestItemFieldSummary(latest.item.metadata).join(" · ")}</p>{latest.source ? <details className="mt-1"><summary className="cursor-pointer font-bold">Latest original source</summary><p className="max-h-40 overflow-auto whitespace-pre-wrap">{String(latest.source.metadata?.request_details || latest.source.name)}</p></details> : null}</div></div>
            <button type="button" onClick={() => { setReviewed(latest); setBaselineRevision(current?.revision || latest.revision); setLatest(null); setReceipt(null); setFeedback(""); setField(null); router.refresh() }} className="mt-2 min-h-11 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white">Review latest version</button>
          </div> : <>
            {activeChoice ? <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <label className="grid gap-2 text-sm font-bold text-amber-950">{activeChoice.label}<select key={`${shown.revision}:${activeChoice.field}`} aria-label={activeChoice.label} defaultValue="" disabled={pending} onFocus={() => setField(activeChoice.field)} onChange={(event) => { setField(activeChoice.field); save(activeChoice.field, event.target.value) }} className="min-h-11 w-full rounded-lg border border-amber-300 bg-white px-2 text-sm text-slate-950"><option value="" disabled>Choose…</option>{activeChoice.options.filter((option) => option.value !== "Other / confirm").map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}</select></label>
              {choices.length > 1 ? <button type="button" disabled={pending} onClick={() => setField(choices[(choices.indexOf(activeChoice) + 1) % choices.length].field)} className="mt-1 min-h-11 text-xs font-bold text-amber-900">Next question · {choices.length} remaining</button> : null}
              <button type="button" disabled={pending} onClick={() => { const id = nextUnresolvedItem(products.map(({ item }) => item), selectedId); if (id) openProduct(id) }} className="min-h-11 text-xs font-semibold text-slate-600">Leave unresolved for now</button>
            </div> : <p className="mt-3 text-xs text-slate-600">{materialReviewReasons(shown.item).join(" · ") || "No missing details flagged."}</p>}
            <div className="mt-2 flex items-center justify-between gap-2"><p role="status" className="text-xs text-slate-600">{pending ? "Saving…" : feedback || (shown.item.metadata?.ai_organized === true ? "Answers save automatically" : "Edit details, then save your changes.")}</p>{receipt && shown.item.metadata?.ai_organized === true ? <button type="button" disabled={pending} onClick={() => save(undefined, undefined, true)} className="min-h-11 px-2 text-xs font-bold text-[#0066cc]">Undo edit</button> : null}</div>
            <OriginalRequestItemEditor requestId={requestId} item={shown.item} itemKind={shown.item.metadata?.ai_organized === true ? "organized" : "original"} revision={shown.revision} onReviewedSave={(result) => { setReviewed({ item: result.item, source: result.source, revision: result.revision }); setReceipt(result.receiptId); setFeedback("Saved") }} onOriginalSaved={() => { setReviewed(null); setBaselineRevision(null); setLatest(null); setReceipt(null); setFeedback("Saved"); }} buttonLabel="Edit details" />
            <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-slate-500">Product tools</summary>
              <label className="grid gap-1 text-xs text-slate-600">Product group<select aria-label="Product group" value={shown.item.department} disabled={pending} onChange={(event) => { const department = event.target.value; if (busy.current) return; busy.current = true; startTransition(async () => { try { const result = await moveRequestItemDepartmentAction({ requestId, itemId: shown.item.id, department }); setFeedback(result.ok ? "Group saved" : result.error); if (result.ok) router.refresh() } catch { setFeedback("Group was not saved.") } finally { busy.current = false } }) }} className="min-h-11 rounded-lg border bg-white px-2">{[...new Set([shown.item.department, "Unassigned", "Plumbing", "Electrical", "Flooring", "Framing", "Drywall", "Paint", "Other materials"])].filter(Boolean).map((department) => <option key={department}>{department}</option>)}</select></label>
              <button type="button" onClick={() => setPriceOpen(!priceOpen)} className="min-h-11 text-xs font-semibold text-[#0066cc]">Online prices</button>
              {priceOpen ? <MaterialPriceCheck requestId={requestId} query={materialSearchQuery(shown.item)} department={shown.item.department} defaultZipCode={defaultZipCode} onClose={() => setPriceOpen(false)} /> : null}
            </details>
          </>}
          {shown.source ? <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2"><summary className="min-h-9 cursor-pointer text-xs font-bold text-slate-600">Original source</summary><p className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">{String(shown.source.metadata?.request_details || shown.source.name)}</p></details> : null}
        </> : <p className="py-3 text-xs text-slate-500">Select a product to review its details.</p>}
      </div>
    </div>
  </div>
}
