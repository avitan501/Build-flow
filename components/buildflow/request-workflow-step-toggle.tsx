"use client"

import { Check, MoreHorizontal, RotateCcw, X } from "lucide-react"
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
    {menuOpen ? <><button type="button" aria-label="Close tools" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 sm:hidden" /><div role="dialog" aria-label={`Step ${step} tools`} className="fixed inset-x-0 bottom-0 z-50 grid gap-1 rounded-t-2xl border border-slate-200 bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-11 sm:z-auto sm:w-52 sm:rounded-lg sm:p-1.5">
      <div className="mb-1 flex items-center justify-between px-2 sm:hidden"><p className="text-sm font-black text-[#12263f]">Step {step} tools</p><button type="button" onClick={() => setMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200" aria-label="Close tools"><X className="h-4 w-4" /></button></div>
      {children}
      {allowManualCompletion ? <button type="button" onClick={toggleComplete} disabled={pending} className="inline-flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isComplete ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}{pending ? "Saving…" : `${label} Step ${step}`}</button> : null}
    </div></> : null}
  </div>
}
