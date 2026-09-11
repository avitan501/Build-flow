"use client"

import { Clock3, Pause } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { calculateDailyWorkMinutes } from "@/lib/daily-work-summary"

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

export function EmployeeClockStatus({ checkInAt, checkOutAt, pauseStartedAt = null, pausedMilliseconds = 0, compact = false, activityHistory = false }: { checkInAt: string | null; checkOutAt: string | null; pauseStartedAt?: string | null; pausedMilliseconds?: number; compact?: boolean; activityHistory?: boolean }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const active = Boolean(checkInAt && !checkOutAt)

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [active])

  const label = useMemo(() => {
    if (!checkInAt) return "Carlos not clocked in"
    const totals = calculateDailyWorkMinutes(
      { checkInAt, checkOutAt, pauseStartedAt, pausedMilliseconds },
      new Date(currentTime).toISOString(),
    )
    if (totals.workedMinutes === null) return "Carlos time unavailable"
    const accounting = `Worked ${durationLabel(totals.workedMinutes)} · Paused ${durationLabel(totals.pausedMinutes)}`
    if (checkOutAt) return `Carlos clocked out · ${accounting}`
    if (pauseStartedAt) return `Carlos paused · ${accounting}`
    return `Carlos clocked in · ${accounting}`
  }, [checkInAt, checkOutAt, currentTime, pauseStartedAt, pausedMilliseconds])

  return <Link href={activityHistory ? "/admin/carlos-activity" : "/admin/daily-summary"} aria-label={activityHistory ? "Open Carlos activity history" : "Open Carlos time log and daily summary"} title={label} className={`inline-flex min-h-12 min-w-0 max-w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition hover:border-[#0071e3] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 ${compact ? "w-full" : ""} ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>
    {pauseStartedAt ? <Pause aria-hidden="true" className="h-4 w-4 shrink-0" /> : <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />}
    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${pauseStartedAt ? "bg-violet-500" : active ? "bg-emerald-500" : "bg-slate-300"}`} />
    <span className="min-w-0 whitespace-normal break-words leading-5">{label}</span>
  </Link>
}
