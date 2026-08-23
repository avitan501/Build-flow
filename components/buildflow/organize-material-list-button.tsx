"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { organizeClientMaterialRequestAction } from "@/app/owner/materials/requests/actions"

export function OrganizeMaterialListButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function organize() {
    setError("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", requestId)
      const result = await organizeClientMaterialRequestAction(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid justify-items-start gap-2">
      <button type="button" onClick={organize} disabled={isPending} className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
        {isPending ? "Organizing..." : "Organize with AI"}
      </button>
      {error ? <p role="alert" className="max-w-sm text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}
