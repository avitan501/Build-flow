"use client"

import { ArrowLeftRight, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { classifyRequestAttachmentSourceAction, type RequestAttachmentSourceParty } from "@/app/owner/materials/requests/actions"

export function RequestAttachmentSourceControl({
  requestId,
  attachmentId,
  currentSource,
}: {
  requestId: string
  attachmentId: string
  currentSource: RequestAttachmentSourceParty
}) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const nextSource: RequestAttachmentSourceParty = currentSource === "client" ? "supplier" : "client"
  const label = nextSource === "supplier" ? "Move to supplier files" : "Move to client files"

  function moveFile() {
    if (pending) return
    setFeedback("")
    startTransition(async () => {
      const result = await classifyRequestAttachmentSourceAction({ requestId, attachmentId, sourceParty: nextSource })
      if (!result.ok) {
        setFeedback(result.error)
        return
      }
      router.refresh()
    })
  }

  return <div className="flex items-center gap-1">
    <button type="button" onClick={moveFile} disabled={pending} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 hover:border-sky-300 hover:text-[#0066cc] disabled:opacity-50" title={label} aria-label={label}>
      {pending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <ArrowLeftRight className="h-3 w-3" />}
      <span>{nextSource === "supplier" ? "Supplier" : "Client"}</span>
    </button>
    {feedback ? <span role="status" className="text-[9px] font-semibold text-rose-700">{feedback}</span> : null}
  </div>
}
