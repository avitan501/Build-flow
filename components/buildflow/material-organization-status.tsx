"use client"

import { Clock3, RefreshCw, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const labels: Record<string, string> = {
  queued: "Waiting to split your list…",
  processing: "Splitting your list…",
  retrying: "Delayed · retrying automatically",
  failed: "List not split · try again",
  draft_changed: "AI copy needs refresh",
}

export function MaterialOrganizationStatus({ status }: { status: string }) {
  const router = useRouter()
  const retrying = status === "retrying"
  const active = ["queued", "processing", "retrying"].includes(status)

  useEffect(() => {
    if (!active) return
    // A refresh with unchanged status preserves this component. Keep polling
    // until the durable job changes, instead of stopping after one refresh.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, retrying ? 15_000 : 4_000)
    return () => window.clearInterval(timer)
  }, [active, retrying, router, status])

  const draftChanged = status === "draft_changed"
  const Icon = status === "queued" ? Clock3 : status === "retrying" ? RefreshCw : Sparkles
  return (
    <span role={active || draftChanged ? "status" : "alert"} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold ${active ? "bg-sky-50 text-sky-800" : draftChanged ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
      <Icon className={`h-4 w-4 ${status === "processing" ? "animate-pulse" : ""}`} />
      {labels[status] || "AI processing"}
    </span>
  )
}
