"use client"

import { Check } from "lucide-react"
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

  function selectSubstep(substep: (typeof substeps)[number]) {
    if (substep.id === selected || pending) return
    setError("")
    startTransition(async () => {
      setSelected(substep.id)
      const result = await updateRequestSubstepAction({ requestId, substep: substep.id })
      if (!result.ok) {
        setSelected(currentSubstep)
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return <div className="border-b border-slate-200 bg-slate-50/70 px-2 py-2" aria-label={`Step ${step} progress`}>
    <div className="flex snap-x gap-1 overflow-x-auto pb-0.5">
      {substeps.map((substep, index) => {
        const globalIndex = REQUEST_WORKFLOW_SUBSTEPS.findIndex((candidate) => candidate.id === substep.id)
        const active = substep.id === selected
        const complete = selectedGlobalIndex >= 0 && globalIndex < selectedGlobalIndex
        const regression = complete
        return <button
          key={substep.id}
          type="button"
          onClick={() => selectSubstep(substep)}
          disabled={pending || regression}
          aria-pressed={active}
          title={regression ? `${substep.label} is already complete` : `${substep.label} — update workflow status only; no message is sent`}
          className={`inline-flex min-h-10 snap-start items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2.5 text-[10px] font-black transition disabled:cursor-default ${active ? "border-slate-950 bg-slate-950 text-white" : complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 disabled:opacity-60"}`}
        >
          {complete ? <Check className="h-3 w-3" /> : <span className="text-[9px] tabular-nums">{index + 1}</span>}
          {substep.label}
        </button>
      })}
    </div>
    {error ? <p className="mt-1 text-[10px] font-bold text-rose-700" role="alert">{error}</p> : null}
  </div>
}
