"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateRequestStatusAction } from "@/app/preview-admin/workflow-actions"
import { quoteRequestProgressIndex, type QuoteRequestStatus } from "@/lib/quote-requests"

const stages: Array<{ status: QuoteRequestStatus; label: string }> = [
  { status: "draft", label: "Request Created" },
  { status: "submitted", label: "Under Review" },
  { status: "in_review", label: "Waiting for Client Approval" },
  { status: "quoted", label: "Request Completed" },
]

export function CustomerRequestStatus({ requestId, status }: { requestId: string; status: QuoteRequestStatus }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const currentIndex = quoteRequestProgressIndex(status)

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
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="request-status-heading">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Manager workflow</p>
        <h2 id="request-status-heading" className="mt-1 text-lg font-bold">Request status</h2>
        <p className="mt-1 text-sm text-slate-500">Choose the stage the customer should see in their project.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => {
          const active = stage.status === status || (status === "closed" && stage.status === "quoted")
          const complete = index < currentIndex
          return (
            <button
              key={stage.status}
              type="button"
              disabled={isPending}
              onClick={() => updateStatus(stage.status)}
              aria-pressed={active}
              className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition disabled:opacity-60 ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${active ? "border-white bg-white text-slate-950" : complete ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
              <span>{stage.label}</span>
            </button>
          )
        })}
      </div>
      {message ? <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{message}</p> : null}
    </section>
  )
}
