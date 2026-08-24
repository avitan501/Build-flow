"use client"

import { Clock3 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

function elapsedLabel(start: string, currentTime: number, end?: string | null) {
  const started = new Date(start).getTime()
  const finished = end ? new Date(end).getTime() : currentTime
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return "Time unavailable"
  const totalMinutes = Math.floor((finished - started) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

export function EmployeeClockStatus({ checkInAt, checkOutAt, compact = false }: { checkInAt: string | null; checkOutAt: string | null; compact?: boolean }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const active = Boolean(checkInAt && !checkOutAt)

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [active])

  const label = useMemo(() => {
    if (!checkInAt) return "Carlos not clocked in"
    if (checkOutAt) return `Carlos clocked out · ${elapsedLabel(checkInAt, currentTime, checkOutAt)} worked`
    return `Carlos clocked in · ${elapsedLabel(checkInAt, currentTime)}`
  }, [checkInAt, checkOutAt, currentTime])

  return <span className={`inline-flex min-h-12 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${compact ? "w-full justify-center" : ""} ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>
    <Clock3 className="h-4 w-4" />
    <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
    <span className={compact ? "truncate" : ""}>{label}</span>
  </span>
}
