"use client"

import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"

import { updateRequestSubstepAction } from "@/app/owner/materials/requests/actions"
import { REQUEST_WORKFLOW_SUBSTEPS, requestWorkflowSubsteps, type RequestWorkflowStepNumber, type RequestWorkflowSubstepId } from "@/lib/request-workflow-substeps"

export function RequestSubstepFunnel({
  requestId,
  step,
  currentSubstep,
}: {
  requestId: string
  step: RequestWorkflowStepNumber
  currentSubstep: RequestWorkflowSubstepId
}) {
  const router = useRouter()
  const substeps = requestWorkflowSubsteps(step)
  const [selected, setSelected] = useOptimistic(currentSubstep)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const selectedGlobalIndex = REQUEST_WORKFLOW_SUBSTEPS.findIndex((substep) => substep.id === selected)
  const selectedLabel = REQUEST_WORKFLOW_SUBSTEPS.find((substep) => substep.id === selected)?.label || "Not started"

  function selectSubstep(substep: (typeof substeps)[number]) {
    if (substep.id === selected || pending) return
    const substepIndex = REQUEST_WORKFLOW_SUBSTEPS.findIndex((candidate) => candidate.id === substep.id)
    const reopen = selectedGlobalIndex >= 0 && substepIndex < selectedGlobalIndex
    setError("")
    startTransition(async () => {
      setSelected(substep.id)
      const result = await updateRequestSubstepAction({ requestId, substep: substep.id, reopen })
      if (!result.ok) {
        setSelected(currentSubstep)
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const controls = <>
    <div className="flex snap-x gap-1 overflow-x-auto pb-0.5">
      {substeps.map((substep, index) => {
        const globalIndex = REQUEST_WORKFLOW_SUBSTEPS.findIndex((candidate) => candidate.id === substep.id)
        const active = substep.id === selected
        const complete = selectedGlobalIndex >= 0 && globalIndex < selectedGlobalIndex
        return <button
          key={substep.id}
          type="button"
          onClick={() => selectSubstep(substep)}
          disabled={pending}
          aria-pressed={active}
          title={complete ? `Reopen from ${substep.label}. Existing work is kept; no message is sent` : `${substep.label} — update workflow status only; no message is sent`}
          className={`inline-flex min-h-10 snap-start items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2.5 text-[10px] font-black transition disabled:cursor-wait disabled:opacity-60 ${active ? "border-slate-950 bg-slate-950 text-white" : complete ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}
        >
          {complete ? <RotateCcw className="h-3 w-3" aria-hidden="true" /> : <span className="text-[9px] tabular-nums">{index + 1}</span>}
          {substep.label}
        </button>
      })}
    </div>
    {error ? <p className="mt-1 text-[10px] font-bold text-rose-700" role="alert">{error}</p> : null}
  </>

  return <>
    <details className="group/substeps border-b border-slate-200 bg-slate-50/70 sm:hidden" aria-label={`Step ${step} progress`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>Current status: <span className="text-slate-950">{selectedLabel}</span></span>
        <span className="text-[10px] font-black text-[#0066cc] group-open/substeps:hidden">Change status</span>
        <span className="hidden text-[10px] font-black text-[#0066cc] group-open/substeps:inline">Close</span>
      </summary>
      <div className="border-t border-slate-200 px-2 py-2">{controls}</div>
    </details>
    <div className="hidden border-b border-slate-200 bg-slate-50/70 px-2 py-2 sm:block" aria-label={`Step ${step} progress`}>{controls}</div>
  </>
}
