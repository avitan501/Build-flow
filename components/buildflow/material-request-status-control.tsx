"use client"

import { Archive, Check, LoaderCircle, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateMaterialRequestStatusAction, type MaterialRequestStatus } from "@/app/owner/materials/requests/actions"

const STATUS_OPTIONS: Array<{ value: MaterialRequestStatus; label: string }> = [
  { value: "submitted", label: "New" },
  { value: "in_review", label: "In progress" },
  { value: "quoted", label: "Quote sent" },
  { value: "closed", label: "Closed" },
]

export function MaterialRequestStatusControl({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter()
  const normalizedStatus = STATUS_OPTIONS.some((option) => option.value === status) ? status as MaterialRequestStatus : "submitted"
  const [selected, setSelected] = useState<MaterialRequestStatus>(normalizedStatus)
  const [savedStatus, setSavedStatus] = useState<MaterialRequestStatus>(normalizedStatus)
  const [feedback, setFeedback] = useState("")
  const [feedbackError, setFeedbackError] = useState(false)
  const [pending, startTransition] = useTransition()

  function update(nextStatus: MaterialRequestStatus) {
    if (nextStatus === "closed" && savedStatus !== "closed" && !window.confirm("Close this material request? You can reopen it later.")) return
    setFeedback("")
    setFeedbackError(false)
    startTransition(async () => {
      const result = await updateMaterialRequestStatusAction({ requestId, status: nextStatus })
      if (!result.ok) {
        setFeedback(result.error)
        setFeedbackError(true)
        return
      }
      setSelected(nextStatus)
      setSavedStatus(nextStatus)
      setFeedback(nextStatus === "closed" ? "Request closed." : nextStatus === "in_review" && savedStatus === "closed" ? "Request reopened." : "Status updated.")
      router.refresh()
    })
  }

  return <div className="min-w-0 sm:w-52" onClick={(event) => event.stopPropagation()}>
    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Status
      <select value={selected} onChange={(event) => setSelected(event.target.value as MaterialRequestStatus)} disabled={pending} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-950 disabled:opacity-60">
        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <div className="mt-2 flex gap-2">
      {selected !== savedStatus ? <button type="button" onClick={() => update(selected)} disabled={pending} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button> : null}
      {savedStatus === "closed" ? <button type="button" onClick={() => update("in_review")} disabled={pending} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-60"><RotateCcw className="h-3.5 w-3.5" />Reopen</button> : <button type="button" onClick={() => update("closed")} disabled={pending} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"><Archive className="h-3.5 w-3.5" />Close</button>}
    </div>
    {feedback ? <p role="status" className={`mt-1.5 text-[10px] font-semibold ${feedbackError ? "text-rose-700" : "text-emerald-700"}`}>{feedback}</p> : null}
  </div>
}
