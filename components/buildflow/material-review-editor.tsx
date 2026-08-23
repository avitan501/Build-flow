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

export function MaterialReviewEditor({ requestId, item }: { requestId: string; item: ReviewableMaterialItem }) {
  const router = useRouter()
  const recommendation = materialReviewRecommendation(item)
  const [choices, setChoices] = useState<Record<string, string>>(() => Object.fromEntries(recommendation.choices.map((choice) => [choice.field, choice.recommended])))
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    setFeedback("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", requestId)
      formData.set("itemId", item.id)
      formData.set("name", item.name)
      formData.set("quantity", String(item.quantity))
      formData.set("unit", item.unit || "")
      formData.set("dimensions", choices.dimensions || metadataText(item, "dimensions"))
      formData.set("thickness", choices.thickness || metadataText(item, "thickness"))
      formData.set("details", metadataText(item, "request_details"))
      formData.set("markReady", String(recommendation.resolvesAllReasons))
      const result = await updateOrganizedMaterialItemAction(formData)
      setFeedback(result.ok ? "Saved." : result.error)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  return <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-amber-50 px-2.5 py-2">
    <div className="min-w-44 flex-1"><p className="text-xs font-bold text-slate-950">{recommendation.label}</p><p className="text-[10px] leading-4 text-slate-500">{recommendation.note}</p></div>
    {recommendation.choices.map((choice) => <label key={choice.field} className="grid min-w-32 gap-0.5 text-[10px] font-bold text-slate-600">{choice.label}<select value={choices[choice.field]} onChange={(event) => setChoices((current) => ({ ...current, [choice.field]: event.target.value }))} className="h-8 rounded-md border border-amber-300 bg-white px-2 text-xs font-semibold text-slate-950">{choice.options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
    {recommendation.choices.length ? <button type="button" onClick={save} disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{pending ? "Saving" : "Apply"}</button> : null}
    {feedback ? <p role="status" className="w-full text-[10px] font-semibold text-slate-700">{feedback}</p> : null}
  </div>
}
