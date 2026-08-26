"use client"

import { BadgeDollarSign, Check, ChevronDown, ClipboardList, ListChecks, MessageSquareText, RotateCcw } from "lucide-react"
import { useState, useTransition } from "react"

import { updateRequestWorkflowStepAction } from "@/app/owner/materials/requests/actions"

type WorkflowStepStatus = "complete" | "active" | "upcoming"
type WorkflowStepIcon = "review" | "organize" | "pricing" | "reply"

const icons = {
  review: ClipboardList,
  organize: ListChecks,
  pricing: BadgeDollarSign,
  reply: MessageSquareText,
} as const

const statusStyles: Record<WorkflowStepStatus, { number: string; label: string; status: string }> = {
  complete: {
    number: "border-[#17304f] bg-[#17304f] text-[#e7c36d]",
    label: "Done",
    status: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  active: {
    number: "border-[#cda548] bg-[#fffaf0] text-[#17304f]",
    label: "In progress",
    status: "border-[#ead59e] bg-[#fffaf0] text-[#72551b]",
  },
  upcoming: {
    number: "border-slate-200 bg-slate-50 text-slate-500",
    label: "Not started",
    status: "border-slate-200 bg-white text-slate-500",
  },
}

export function workflowStepCardClass() {
  return "group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
}

export function RequestWorkflowStepHeader({
  requestId,
  step,
  title,
  detail,
  status,
  icon,
}: {
  requestId: string
  step: 1 | 2 | 3 | 4
  title: string
  detail: string
  status: WorkflowStepStatus
  icon: WorkflowStepIcon
}) {
  const Icon = icons[icon]
  const [manualStatus, setManualStatus] = useState<WorkflowStepStatus | null>(null)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const displayStatus = manualStatus ?? status
  const styles = statusStyles[displayStatus]

  function toggleComplete() {
    const completed = displayStatus !== "complete"
    const previous = manualStatus
    setError("")
    setManualStatus(completed ? "complete" : "active")
    startTransition(async () => {
      const result = await updateRequestWorkflowStepAction({ requestId, step, completed })
      if (!result.ok) {
        setManualStatus(previous)
        setError(result.error)
      }
    })
  }

  return (
    <>
      <summary className={`flex min-h-[5.5rem] cursor-pointer list-none items-center gap-3 border-l-[3px] px-4 py-3.5 pr-16 sm:gap-4 sm:px-5 sm:pr-40 ${displayStatus === "active" ? "border-l-[#cda548]" : displayStatus === "complete" ? "border-l-[#17304f]" : "border-l-transparent"}`}>
        <span className={`relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-2xl font-black tabular-nums ${styles.number}`} aria-label={`Step ${step}`}>
          {step}
          {displayStatus === "complete" ? <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-700 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#8b6a27]">Step {step} of 4</span>
          <span className="mt-1 flex items-center gap-2 text-base font-black tracking-[-0.01em] text-[#12263f] sm:text-lg"><Icon className="h-4 w-4 shrink-0 text-[#8b6a27]" />{title}</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 sm:text-sm">{detail}</span>
          {error ? <span className="mt-1 block text-xs font-semibold text-rose-700" role="alert">{error}</span> : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <button type="button" onClick={toggleComplete} disabled={pending} className={`absolute right-12 top-7 hidden min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition hover:border-[#cda548] disabled:opacity-50 sm:inline-flex ${styles.status}`} aria-label={displayStatus === "complete" ? `Reopen step ${step}` : `Mark step ${step} done`}>
        {displayStatus === "complete" ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {pending ? "Saving" : displayStatus === "complete" ? "Reopen" : "Mark done"}
      </button>
      <button type="button" onClick={toggleComplete} disabled={pending} className={`absolute right-11 top-7 inline-flex h-9 w-9 items-center justify-center rounded-full border sm:hidden ${styles.status}`} aria-label={displayStatus === "complete" ? `Reopen step ${step}` : `Mark step ${step} done`}>
        {displayStatus === "complete" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </button>
    </>
  )
}
