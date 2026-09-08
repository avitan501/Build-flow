"use client"

import { Check, MoreHorizontal, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useState, useTransition } from "react"

import { updateRequestWorkflowStepAction } from "@/app/owner/materials/requests/actions"

export function RequestWorkflowStepToggle({ requestId, step, completed, className, allowManualCompletion = true, children }: { requestId: string; step: 1 | 2 | 3 | 4; completed: boolean; className: string; allowManualCompletion?: boolean; children?: ReactNode }) {
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
  return <div className="absolute right-10 top-4 z-30" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => setMenuOpen((open) => !open)} disabled={pending} aria-expanded={menuOpen} aria-label={`Step ${step} tools`} className={`inline-flex h-10 items-center justify-center gap-1 rounded-full border px-2.5 text-[10px] font-black transition hover:border-[#cda548] disabled:opacity-50 ${className}`}><MoreHorizontal className="h-4 w-4" />Tools</button>
    {menuOpen ? <div className="absolute right-0 top-11 grid w-52 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
      {children}
      {allowManualCompletion ? <button type="button" onClick={toggleComplete} disabled={pending} className="inline-flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isComplete ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}{pending ? "Saving…" : `${label} Step ${step}`}</button> : null}
    </div> : null}
  </div>
}
