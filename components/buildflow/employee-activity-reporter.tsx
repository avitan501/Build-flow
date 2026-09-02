"use client"

import { Eye } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { recordEmployeeActivityAction } from "@/app/admin/activity-actions"
import { captureAvantiaEvent } from "@/lib/analytics/posthog-client"
import { analyticsArea, analyticsRouteContext } from "@/lib/analytics/route-context"
import { managerActivityPageLabel } from "@/lib/manager-staff-activity"

export function EmployeeActivityReporter({ owner, compact = false }: { owner: boolean; compact?: boolean }) {
  const pathname = usePathname()
  useEffect(() => {
    if (owner) return
    const report = () => {
      if (document.visibilityState !== "visible") return
      const context = analyticsRouteContext(pathname)
      captureAvantiaEvent("avantia_staff_active", {
        ...context,
        area: analyticsArea(context.route),
        actor_type: "staff",
      })
      void recordEmployeeActivityAction(pathname, managerActivityPageLabel(pathname))
    }
    report()
    const timer = window.setInterval(report, 60_000)
    document.addEventListener("visibilitychange", report)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", report) }
  }, [owner, pathname])
  if (owner) return null
  return <div className={`mt-2 flex items-center border-t border-slate-100 py-3 text-[11px] font-medium text-slate-500 ${compact ? "justify-center" : "gap-2 px-1"}`} title="The owner can see the current Avantia page and last active time. Screen contents are not recorded."><Eye className="h-3.5 w-3.5 shrink-0" /><span className={compact ? "sr-only" : undefined}>Activity status visible to owner</span></div>
}
