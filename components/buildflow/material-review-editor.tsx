"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateOrganizedMaterialItemAction } from "@/app/owner/materials/requests/actions"
import { materialReviewRecommendation } from "@/lib/material-review-recommendations"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"

function metadataText(item: ReviewableMaterialItem, key: string) {
  return typeof item.metadata?.[key] === "string" ? String(item.metadata[key]) : ""
}

function initialChoice(item: ReviewableMaterialItem, field: string, recommended: string, allowedValues: string[]) {
  if (field === "quantity") return String(item.quantity)
  const metadataKey = field === "productType" ? "product_type" : field === "screwLength" ? "screw_length" : field
  const savedValue = metadataText(item, metadataKey)
  return allowedValues.includes(savedValue) ? savedValue : recommended
}

export function MaterialReviewEditor({ requestId, item }: { requestId: string; item: ReviewableMaterialItem }) {
  const router = useRouter()
  const recommendation = materialReviewRecommendation(item)
  const [choices, setChoices] = useState<Record<string, string>>(() => Object.fromEntries(recommendation.choices.map((choice) => [choice.field, initialChoice(item, choice.field, choice.recommended, choice.options.map((option) => option.value))])))
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    setFeedback("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", requestId)
      formData.set("itemId", item.id)
      formData.set("name", item.name)
      formData.set("quantity", choices.quantity || String(item.quantity))
      formData.set("unit", item.unit || "")
      formData.set("dimensions", choices.dimensions || metadataText(item, "dimensions"))
      formData.set("thickness", choices.thickness || metadataText(item, "thickness"))
      formData.set("productType", choices.productType || metadataText(item, "product_type"))
      formData.set("screwLength", choices.screwLength || metadataText(item, "screw_length"))
      formData.set("details", metadataText(item, "request_details"))
      formData.set("markReady", String(recommendation.resolvesAllReasons))
      const result = await updateOrganizedMaterialItemAction(formData)
      setFeedback(result.ok ? "Saved." : result.error)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  return <div className="mt-2 rounded-md bg-amber-50 p-2">
    <div className="mb-1.5 flex items-center justify-between gap-2"><p className="text-[11px] font-bold text-slate-950">{recommendation.label}</p><span className="text-[9px] font-semibold text-slate-500">AI confidence</span></div>
    <div className="grid grid-cols-2 items-end gap-1.5 sm:flex sm:flex-wrap">
    {recommendation.choices.map((choice) => <label key={choice.field} className="grid min-w-0 gap-0.5 text-[9px] font-bold text-slate-600 sm:min-w-32">{choice.label}<select aria-label={choice.label} value={choices[choice.field]} onChange={(event) => setChoices((current) => ({ ...current, [choice.field]: event.target.value }))} className="h-8 min-w-0 rounded-md border border-amber-300 bg-white px-1.5 text-[11px] font-semibold text-slate-950">{choice.options.map((option) => <option key={option.value} value={option.value}>{option.value} · {option.confidence}%</option>)}</select></label>)}
    {recommendation.choices.length ? <button type="button" onClick={save} disabled={pending} className="col-span-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-50 sm:col-span-1"><Check className="h-3.5 w-3.5" />{pending ? "Saving" : "Apply"}</button> : null}
    </div>
    {feedback ? <p role="status" className="w-full text-[10px] font-semibold text-slate-700">{feedback}</p> : null}
  </div>
}
