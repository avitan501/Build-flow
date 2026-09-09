"use client"

import { LoaderCircle, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateMaterialRequestStatusAction } from "@/app/owner/materials/requests/actions"

export function ArchivedRequestRestoreButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function restore() {
    setError("")
    startTransition(async () => {
      const result = await updateMaterialRequestStatusAction({ requestId, status: "in_review" })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return <div className="shrink-0">
    <button type="button" onClick={restore} disabled={pending} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:border-sky-300 hover:text-[#0066cc] disabled:opacity-60">
      {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Restore
    </button>
    {error ? <p role="alert" className="mt-1 max-w-40 text-[10px] font-semibold text-rose-700">{error}</p> : null}
  </div>
}
