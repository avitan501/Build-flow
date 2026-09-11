"use client"

import { Check, Circle, MoreHorizontal, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useState, useTransition } from "react"

import { updateRequestWorkflowStepAction } from "@/app/owner/materials/requests/actions"

export function RequestWorkflowStatusButton({ requestId, step, completed }: { requestId: string; step: 1 | 2 | 3 | 4; completed: boolean }) {
  const router = useRouter()
  const [isComplete, setIsComplete] = useState(completed)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function toggleComplete() {
    if (isComplete && !window.confirm(`Reopen Step ${step}?`)) return
    const nextComplete = !isComplete
    setError("")
    startTransition(async () => {
      try {
        const result = await updateRequestWorkflowStepAction({ requestId, step, completed: nextComplete })
        if (!result.ok) { setError(result.error); return }
        setIsComplete(nextComplete)
        router.refresh()
      } catch {
        setError("Could not save. Refresh and try again.")
      }
    })
  }

  return <div className="relative" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <button type="button" onClick={toggleComplete} disabled={pending} aria-pressed={isComplete} aria-label={`Step ${step}: ${isComplete ? "Done. Reopen" : "In progress. Complete"}`} className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold disabled:opacity-50 ${isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>
      {isComplete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{pending ? "Saving…" : isComplete ? "Done" : "In progress"}
    </button>
    {error ? <div role="alert" className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-950 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-1 sm:w-60"><p>{error}</p><button type="button" onClick={() => setError("")} className="ml-auto mt-2 block min-h-11 px-2 font-bold">Close</button></div> : null}
  </div>
}

export function RequestWorkflowStepToggle({ requestId, step, completed, className, allowManualCompletion = true, statusLabel, children }: { requestId: string; step: 1 | 2 | 3 | 4; completed: boolean; className: string; allowManualCompletion?: boolean; statusLabel?: string; children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="relative z-30 flex items-center gap-1" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    {allowManualCompletion ? <RequestWorkflowStatusButton key={`${requestId}:${step}:${completed}`} requestId={requestId} step={step} completed={completed} /> : <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${className}`}>{statusLabel || (completed ? "Done" : "In progress")}</span>}
    {children ? <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={`Step ${step} tools`} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button> : null}
    {menuOpen ? <><button type="button" aria-label="Close tools" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 sm:hidden" /><div role="dialog" aria-label={`Step ${step} tools`} className="fixed inset-x-0 bottom-0 z-50 grid gap-1 rounded-t-2xl border border-slate-200 bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-11 sm:z-auto sm:w-52 sm:rounded-lg sm:p-1.5">
      <div className="mb-1 flex items-center justify-between px-2 sm:hidden"><p className="text-sm font-black text-[#12263f]">Step {step} tools</p><button type="button" onClick={() => setMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200" aria-label="Close tools"><X className="h-4 w-4" /></button></div>
      {children}
    </div></> : null}
  </div>
}
