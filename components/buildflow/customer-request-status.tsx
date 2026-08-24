"use client"

import { BadgeDollarSign, Check, ClipboardList, MessageCircleQuestion, Truck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateRequestStatusAction } from "@/app/preview-admin/workflow-actions"
import { quoteRequestProgressIndex, type QuoteRequestStatus } from "@/lib/quote-requests"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"

const stages: Array<{ status: QuoteRequestStatus; label: string }> = [
  { status: "draft", label: "Request Created" },
  { status: "submitted", label: "Under Review" },
  { status: "in_review", label: "Waiting for Client Approval" },
  { status: "quoted", label: "Payment Received · Waiting for Supplier Delivery" },
  { status: "closed", label: "Request Completed" },
]

const nextAction: Record<QuoteRequestStatus, string> = {
  draft: "Submit the request for review",
  submitted: "Review and confirm the material list",
  in_review: "Prepare pricing and wait for client approval",
  quoted: "Coordinate supplier delivery",
  closed: "No action required",
}

const workflowStages = [
  { id: "received", label: "Review request", icon: ClipboardList, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "pricing", label: "Supplier pricing", icon: BadgeDollarSign, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { id: "approval", label: "Client approval", icon: MessageCircleQuestion, tone: "border-violet-200 bg-violet-50 text-violet-700" },
  { id: "delivery", label: "Payment & delivery", icon: Truck, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
] as const

export function CustomerRequestStatus({ requestId, status, currentStage, updatedAt, assignedTo }: { requestId: string; status: QuoteRequestStatus; currentStage: ManagerPipelineStage; updatedAt: string; assignedTo: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const currentIndex = quoteRequestProgressIndex(status)
  const workflowIndex = workflowStages.findIndex((stage) => stage.id === currentStage)

  function updateStatus(nextStatus: QuoteRequestStatus) {
    if (nextStatus === status) return
    startTransition(async () => {
      setMessage(null)
      const result = await updateRequestStatusAction({ requestId, status: nextStatus })
      if (!result.ok) return setMessage(result.error)
      setMessage("Request status updated.")
      router.refresh()
    })
  }

  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3" aria-labelledby="request-status-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Manager workflow</p>
        <h2 id="request-status-heading" className="mt-0.5 text-base font-bold">Request status</h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-600">Next: {nextAction[status]}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500"><div><dt>Assigned</dt><dd className="font-semibold text-slate-800">{assignedTo}</dd></div><div><dt>Updated</dt><dd className="font-semibold text-slate-800">{new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd></div></dl>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {workflowStages.map((stage, index) => { const Icon = stage.icon; const active = stage.id === currentStage; const complete = index < workflowIndex; return <div key={stage.id} className={`flex min-h-12 items-center gap-2 rounded-md border px-2.5 ${active ? stage.tone : "border-slate-200 bg-white text-slate-500"}`} aria-current={active ? "step" : undefined}><span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : active ? stage.tone : "border-slate-200 bg-slate-50"}`}>{complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="text-xs font-bold leading-4">{stage.label}</span></div> })}
      </div>
      <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer font-semibold text-[#0066cc]">Change request status</summary><div className="mt-2 flex flex-wrap gap-2">{stages.map((stage, index) => { const active = stage.status === status; const complete = index < currentIndex; return <button key={stage.status} type="button" disabled={isPending} onClick={() => updateStatus(stage.status)} aria-pressed={active} className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-left text-xs font-semibold disabled:opacity-60 ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : null}{stage.label}</button> })}</div></details>
      {message ? <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{message}</p> : null}
    </section>
  )
}
