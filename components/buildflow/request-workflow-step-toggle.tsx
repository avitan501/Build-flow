"use client"

import { Check, RotateCcw } from "lucide-react"
import { useState, useTransition } from "react"

import { updateRequestWorkflowStepAction } from "@/app/owner/materials/requests/actions"

export function RequestWorkflowStepToggle({ requestId, step, completed, className }: { requestId: string; step: 1 | 2 | 3 | 4; completed: boolean; className: string }) {
  const [isComplete, setIsComplete] = useState(completed)
  const [pending, startTransition] = useTransition()

  function toggleComplete() {
    const nextComplete = !isComplete
    setIsComplete(nextComplete)
    startTransition(async () => {
      const result = await updateRequestWorkflowStepAction({ requestId, step, completed: nextComplete })
      if (!result.ok) setIsComplete(!nextComplete)
    })
  }

  const label = isComplete ? "Reopen" : "Mark done"
  return (
    <>
      <button type="button" onClick={toggleComplete} disabled={pending} className={`absolute right-12 top-7 hidden min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition hover:border-[#cda548] disabled:opacity-50 sm:inline-flex ${className}`} aria-label={`${label} step ${step}`}>
        {isComplete ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {pending ? "Saving" : label}
      </button>
      <button type="button" onClick={toggleComplete} disabled={pending} className={`absolute right-11 top-7 inline-flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-50 sm:hidden ${className}`} aria-label={`${label} step ${step}`}>
        {isComplete ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </button>
    </>
  )
}
