"use client"

import { Check, MoreHorizontal, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateRequestWorkflowStepAction } from "@/app/owner/materials/requests/actions"

export function RequestWorkflowStepToggle({ requestId, step, completed, className }: { requestId: string; step: 1 | 2 | 3 | 4; completed: boolean; className: string }) {
  const router = useRouter()
  const [isComplete, setIsComplete] = useState(completed)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggleComplete() {
    if (isComplete && !window.confirm(`Reopen Step ${step}?`)) return
    const nextComplete = !isComplete
    setIsComplete(nextComplete)
    startTransition(async () => {
      const result = await updateRequestWorkflowStepAction({ requestId, step, completed: nextComplete })
      if (!result.ok) setIsComplete(!nextComplete)
      else router.refresh()
      setMenuOpen(false)
    })
  }

  const label = isComplete ? "Reopen" : "Mark done"
  return <div className="absolute right-11 top-7 z-30">
    <button type="button" onClick={() => setMenuOpen((open) => !open)} disabled={pending} aria-expanded={menuOpen} aria-label={`Step ${step} actions`} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-[#cda548] disabled:opacity-50 ${className}`}><MoreHorizontal className="h-4 w-4" /></button>
    {menuOpen ? <div className="absolute right-0 top-11 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"><button type="button" onClick={toggleComplete} disabled={pending} className="inline-flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isComplete ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}{pending ? "Saving…" : `${label} Step ${step}`}</button></div> : null}
  </div>
}
