"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { organizeClientMaterialRequestAction } from "@/app/owner/materials/requests/actions"

export function OrganizeMaterialListButton({ requestId, refresh = false }: { requestId: string; refresh?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  function organize() {
    setError("")
    setNotice("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", requestId)
      if (refresh) formData.set("force", "true")
      const result = await organizeClientMaterialRequestAction(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (!result.itemCount) {
        setNotice(result.status === "plan" ? "This file needs a plan takeoff before materials can be listed." : "No material rows were found. Review the original request or attachment.")
      } else {
        const remaining = result.reviewCount
          ? `${result.reviewCount} still need details.`
          : "All items are ready for supplier pricing."
        setNotice(`${refresh ? "Rechecked" : "Organized"} ${result.itemCount} items. ${remaining}`)
      }
      router.refresh()
    })
  }

  return (
    <div className="grid justify-items-start gap-2">
      <button type="button" onClick={organize} disabled={isPending} className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
        {isPending ? "Organizing..." : refresh ? "Reorganize request" : "Organize request"}
      </button>
      {error ? <p role="alert" className="max-w-sm text-xs font-semibold text-rose-700">{error}</p> : null}
      {notice ? <p role="status" className="max-w-sm text-xs font-semibold text-emerald-700">{notice}</p> : null}
    </div>
  )
}
