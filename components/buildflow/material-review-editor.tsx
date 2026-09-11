"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { saveMaterialReviewChoiceAction } from "@/app/owner/materials/requests/actions"
import { materialReviewRecommendation } from "@/lib/material-review-recommendations"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"

export function MaterialReviewEditor({ requestId, item, onSaved }: { requestId: string; item: ReviewableMaterialItem; onSaved?: (item: ReviewableMaterialItem) => void }) {
  const router = useRouter()
  const [savedItem, setSavedItem] = useState(item)
  const recommendation = materialReviewRecommendation(savedItem)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState("")
  const [failed, setFailed] = useState<{ field: string; value: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const saving = useRef(false)

  function save(field: string, value: string) {
    if (!value || saving.current) return
    saving.current = true
    setChoices((current) => ({ ...current, [field]: value }))
    setFeedback("")
    setFailed(null)
    startTransition(async () => {
      try {
        const result = await saveMaterialReviewChoiceAction({ requestId, itemId: item.id, field, value })
        if (!result.ok) {
          setFailed({ field, value })
          setFeedback(result.error)
          return
        }
        setSavedItem(result.item)
        onSaved?.(result.item)
        setFeedback("Saved")
        router.refresh()
      } catch {
        setFailed({ field, value })
        setFeedback("Not saved. Try again.")
      } finally {
        saving.current = false
      }
    })
  }

  if (!recommendation.choices.length) return <p className="mt-2 text-xs text-slate-600">Use Details to review this item.</p>

  return <div className="mt-2 rounded-md bg-amber-50 p-2">
    <div className="grid grid-cols-2 items-end gap-1.5 sm:flex sm:flex-wrap">
      {recommendation.choices.map((choice) => <label key={choice.field} className="grid min-w-0 gap-0.5 text-[11px] font-bold text-slate-600 sm:min-w-32">{choice.label}<select aria-label={choice.label} disabled={pending} value={choices[choice.field] || ""} onChange={(event) => save(choice.field, event.target.value)} className="min-h-11 min-w-0 rounded-md border border-amber-300 bg-white px-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><option value="" disabled>Choose…</option>{choice.options.filter((option) => option.value !== "Other / confirm").map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}</select></label>)}
    </div>
    <p role="status" aria-live="polite" className={`mt-1 text-[11px] font-semibold ${failed ? "text-rose-700" : "text-slate-600"}`}>{pending ? "Saving…" : feedback || "Saves automatically"}</p>
    {failed ? <button type="button" onClick={() => save(failed.field, failed.value)} disabled={pending} className="mt-1 min-h-11 rounded-md border border-rose-300 bg-white px-3 text-xs font-bold text-rose-800">Retry save</button> : null}
  </div>
}
