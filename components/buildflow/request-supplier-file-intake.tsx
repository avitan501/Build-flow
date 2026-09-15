"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadSupplierQuoteAction } from "@/app/admin/supplier-quotes/actions"

export function RequestSupplierFileIntake({ requestId, attachmentId }: { requestId: string; attachmentId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  return <div><button type="button" disabled={pending} className="inline-flex min-h-10 items-center rounded-lg border border-sky-200 px-2 text-[10px] font-bold text-[#0066cc] disabled:opacity-50" onClick={() => startTransition(async () => {
    setError("")
    try {
      const data = new FormData()
      data.set("requestAttachmentId", attachmentId); data.set("requestId", requestId); data.set("linkMode", "request"); data.set("supplierId", "auto"); data.set("department", "Others")
      const result = await uploadSupplierQuoteAction(data)
      if (!result.ok) { setError(result.error); return }
      router.push(`/admin/supplier-quotes/${result.data.quoteId}`)
    } catch { setError("Could not read this quote. Check stored quotes before trying again.") }
  })}>{pending ? "Reading…" : "Read supplier quote"}</button>{error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : null}</div>
}
