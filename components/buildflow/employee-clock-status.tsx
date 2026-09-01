"use client"

import { Clock3, Pause } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

function elapsedLabel(start: string, currentTime: number, end?: string | null, pausedMilliseconds = 0, pauseStartedAt?: string | null) {
  const started = new Date(start).getTime()
  const finished = end ? new Date(end).getTime() : currentTime
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return "Time unavailable"
  const currentPause = pauseStartedAt ? Math.max(0, finished - new Date(pauseStartedAt).getTime()) : 0
  const totalMinutes = Math.max(0, Math.floor((finished - started - pausedMilliseconds - currentPause) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

export function EmployeeClockStatus({ checkInAt, checkOutAt, pauseStartedAt = null, pausedMilliseconds = 0, compact = false }: { checkInAt: string | null; checkOutAt: string | null; pauseStartedAt?: string | null; pausedMilliseconds?: number; compact?: boolean }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const active = Boolean(checkInAt && !checkOutAt)

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [active])

  const label = useMemo(() => {
    if (!checkInAt) return "Carlos not clocked in"
    if (checkOutAt) return `Carlos clocked out · ${elapsedLabel(checkInAt, currentTime, checkOutAt, pausedMilliseconds)} worked`
    if (pauseStartedAt) return `Carlos paused · ${elapsedLabel(checkInAt, currentTime, null, pausedMilliseconds, pauseStartedAt)} worked`
    return `Carlos clocked in · ${elapsedLabel(checkInAt, currentTime, null, pausedMilliseconds)}`
  }, [checkInAt, checkOutAt, currentTime, pauseStartedAt, pausedMilliseconds])

  return <Link href="/admin/daily-summary" aria-label="Open Carlos time log and daily summary" title="Open time log" className={`inline-flex min-h-12 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition hover:border-[#0071e3] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 ${compact ? "w-full justify-center" : ""} ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>
    {pauseStartedAt ? <Pause className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
    <span className={`h-2 w-2 rounded-full ${pauseStartedAt ? "bg-violet-500" : active ? "bg-emerald-500" : "bg-slate-300"}`} />
    <span className={compact ? "truncate" : ""}>{label}</span>
  </Link>
}
