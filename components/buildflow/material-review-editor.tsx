"use client"

import { Check, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateOrganizedMaterialItemAction } from "@/app/owner/materials/requests/actions"
import { materialReviewRecommendation } from "@/lib/material-review-recommendations"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"

function metadataText(item: ReviewableMaterialItem, key: string) {
  return typeof item.metadata?.[key] === "string" ? String(item.metadata[key]) : ""
}

export function MaterialReviewEditor({ requestId, item }: { requestId: string; item: ReviewableMaterialItem }) {
  const router = useRouter()
  const recommendation = materialReviewRecommendation(item)
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit || "",
    dimensions: metadataText(item, "dimensions"),
    thickness: metadataText(item, "thickness"),
    details: metadataText(item, "request_details"),
  })
  const [markReady, setMarkReady] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function useRecommendation() {
    setValues((current) => ({ ...current, ...recommendation.patch }))
    setMarkReady(Object.keys(recommendation.patch).length > 0)
    setOpen(true)
  }

  function save() {
    setFeedback("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", requestId)
      formData.set("itemId", item.id)
      Object.entries(values).forEach(([key, value]) => formData.set(key, value))
      formData.set("markReady", String(markReady))
      const result = await updateOrganizedMaterialItemAction(formData)
      setFeedback(result.ok ? "Saved." : result.error)
      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2.5">
    <p className="text-xs font-bold text-slate-950">{recommendation.label}</p>
    <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{recommendation.note}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {Object.keys(recommendation.patch).length ? <button type="button" onClick={useRecommendation} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />Use recommendation</button> : null}
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-xs font-bold text-slate-800"><Pencil className="h-3.5 w-3.5" />{open ? "Close" : "Change"}</button>
    </div>
    {open ? <div className="mt-3 grid gap-2 border-t border-amber-200 pt-3 sm:grid-cols-2">
      <label className="grid gap-1 text-[11px] font-bold text-slate-600 sm:col-span-2">Item<input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-950" /></label>
      <label className="grid gap-1 text-[11px] font-bold text-slate-600">Quantity<input type="number" min="0.01" step="any" value={values.quantity} onChange={(event) => setValues({ ...values, quantity: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-950" /></label>
      <label className="grid gap-1 text-[11px] font-bold text-slate-600">Unit<input value={values.unit} onChange={(event) => setValues({ ...values, unit: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-950" /></label>
      <label className="grid gap-1 text-[11px] font-bold text-slate-600">Size<input value={values.dimensions} onChange={(event) => setValues({ ...values, dimensions: event.target.value })} placeholder="Example: 4 x 8 ft." className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-950" /></label>
      <label className="grid gap-1 text-[11px] font-bold text-slate-600">Thickness<input value={values.thickness} onChange={(event) => setValues({ ...values, thickness: event.target.value })} placeholder="Example: 1/2 in." className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-950" /></label>
      <label className="grid gap-1 text-[11px] font-bold text-slate-600 sm:col-span-2">Details<textarea rows={2} value={values.details} onChange={(event) => setValues({ ...values, details: event.target.value })} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-normal text-slate-950" /></label>
      <label className="flex min-h-9 items-center gap-2 text-xs font-bold text-slate-800 sm:col-span-2"><input type="checkbox" checked={markReady} onChange={(event) => setMarkReady(event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />I checked this item. Mark it ready for supplier pricing.</label>
      <button type="button" onClick={save} disabled={pending} className="min-h-9 rounded-md bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2">{pending ? "Saving..." : "Save changes"}</button>
      {feedback ? <p role="status" className="text-xs font-semibold text-slate-700 sm:col-span-2">{feedback}</p> : null}
    </div> : null}
  </div>
}
