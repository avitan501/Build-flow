"use client"

import { Clock3, RefreshCw, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const labels: Record<string, string> = {
  queued: "Queued for AI",
  processing: "AI is reading files…",
  retrying: "AI will retry automatically",
  failed: "AI could not finish",
}

export function MaterialOrganizationStatus({ status }: { status: string }) {
  const router = useRouter()
  const retrying = status === "retrying"
  const active = ["queued", "processing", "retrying"].includes(status)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => router.refresh(), retrying ? 15_000 : 4_000)
    return () => window.clearTimeout(timer)
  }, [active, retrying, router, status])

  const Icon = status === "queued" ? Clock3 : status === "retrying" ? RefreshCw : Sparkles
  return (
    <span role={active ? "status" : "alert"} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold ${active ? "bg-sky-50 text-sky-800" : "bg-rose-50 text-rose-800"}`}>
      <Icon className={`h-4 w-4 ${status === "processing" ? "animate-pulse" : ""}`} />
      {labels[status] || "AI processing"}
    </span>
  )
}
