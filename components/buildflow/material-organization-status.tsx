"use client"

import { Clock3, RefreshCw, Sparkles } from "lucide-react"
import { useRequestRefresh } from "@/lib/use-request-refresh"

const labels: Record<string, string> = {
  queued: "Waiting to split your list…",
  processing: "Splitting your list…",
  retrying: "Delayed · retrying automatically",
  failed: "List not split · try again",
  draft_changed: "AI copy needs refresh",
}

export function MaterialOrganizationStatus({ status }: { status: string }) {
  const retrying = status === "retrying"
  const active = ["queued", "processing", "retrying"].includes(status)

  useRequestRefresh(active ? (retrying ? 15_000 : 4_000) : null)

  const draftChanged = status === "draft_changed"
  const Icon = status === "queued" ? Clock3 : status === "retrying" ? RefreshCw : Sparkles
  return (
    <span role={active || draftChanged ? "status" : "alert"} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold ${active ? "bg-sky-50 text-sky-800" : draftChanged ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
      <Icon className={`h-4 w-4 ${status === "processing" ? "animate-pulse" : ""}`} />
      {labels[status] || "AI processing"}
    </span>
  )
}
